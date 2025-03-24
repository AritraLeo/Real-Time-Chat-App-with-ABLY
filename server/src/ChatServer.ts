import express, { Application, Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import * as Ably from 'ably';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User } from './models/User';

// Load environment variables
dotenv.config();

export class ChatServer {
    private app: Application;
    private port: number;
    private ablyClient: Ably.Realtime;
    private supabase: SupabaseClient;
    private userManager: User;

    constructor() {
        this.app = express();
        this.port = parseInt(process.env.PORT || '3000');

        // Initialize Ably client
        const ablyApiKey = process.env.ABLY_API_KEY || '';
        this.ablyClient = new Ably.Realtime({ key: ablyApiKey });

        // Initialize Supabase client with service role key for admin operations
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        if (!supabaseKey) {
            console.warn('SUPABASE_SERVICE_ROLE_KEY not set - server may not be able to bypass RLS policies');
        }
        this.supabase = createClient(supabaseUrl, supabaseKey);

        // Initialize User manager
        this.userManager = new User(supabaseUrl, supabaseKey, this.ablyClient);

        this.setupMiddleware();
        this.setupRoutes();
        this.setupAblyListeners();
    }

    private setupMiddleware(): void {
        this.app.use(cors());
        this.app.use(express.json());
    }

    private setupRoutes(): void {
        // Health check route
        this.app.get('/', ((_req: Request, res: Response) => {
            res.send('Chat Server is running');
        }) as RequestHandler);

        // Route to get Ably token for client authentication
        this.app.get('/api/ably/token', (async (req: Request, res: Response) => {
            try {
                const userId = req.query.userId as string;
                if (!userId) {
                    return res.status(400).json({ error: 'User ID is required' });
                }

                // Generate token for the client
                const tokenParams = { clientId: userId };

                // Using the Promise-based API
                const tokenRequest = await this.ablyClient.auth.createTokenRequest(tokenParams);
                res.json(tokenRequest);
            } catch (error) {
                console.error('Error generating Ably token:', error);
                res.status(500).json({ error: 'Error generating token' });
            }
        }) as RequestHandler);

        // Route to register a new user
        this.app.post('/api/users/register', (async (req: Request, res: Response) => {
            try {
                const { userId, email, username } = req.body;

                if (!userId || !email || !username) {
                    return res.status(400).json({
                        error: 'User ID, email, and username are required'
                    });
                }

                const user = await this.userManager.createUser(userId, email, username);

                if (!user) {
                    return res.status(500).json({ error: 'Failed to create user' });
                }

                // Publish the updated user list to all clients
                await this.publishUserList();

                res.status(201).json(user);
            } catch (error) {
                console.error('Error registering user:', error);
                res.status(500).json({ error: 'Failed to register user' });
            }
        }) as RequestHandler);

        // Route to update user's online status
        this.app.post('/api/users/:userId/status', (async (req: Request, res: Response) => {
            try {
                const userId = req.params.userId;
                const { isOnline } = req.body;

                this.userManager.updateOnlineStatus(userId, isOnline)
                    .then(success => {
                        if (success) {
                            res.json({ success: true });
                        } else {
                            res.status(500).json({ error: 'Failed to update status' });
                        }
                    })
                    .catch(error => {
                        console.error('Error updating user status:', error);
                        res.status(500).json({ error: 'Internal server error' });
                    });
            } catch (error) {
                console.error('Error updating user status:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }) as RequestHandler);

        // Route to check if a user is online
        this.app.get('/api/users/:userId/status', ((req: Request, res: Response) => {
            try {
                const userId = req.params.userId;

                this.userManager.isUserOnline(userId)
                    .then(isOnline => {
                        res.json({ isOnline });
                    })
                    .catch(error => {
                        console.error('Error checking user status:', error);
                        res.status(500).json({ error: 'Internal server error' });
                    });
            } catch (error) {
                console.error('Error checking user status:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }) as RequestHandler);
    }

    private setupAblyListeners(): void {
        // Setup channel for handling messages
        const chatChannel = this.ablyClient.channels.get('chat');

        // Handle requests for user list
        const usersChannel = this.ablyClient.channels.get('users');
        usersChannel.subscribe('request_users', async (message) => {
            console.log('Received request for user list from:', message.data?.userId);
            await this.publishUserList();
        });

        // Listen for new messages
        chatChannel.subscribe('message', async (message) => {
            try {
                const { sender, recipient, content, timestamp } = message.data;

                // Save the message to Supabase
                const { error } = await this.supabase
                    .from('messages')
                    .insert({
                        sender_id: sender.id,
                        recipient_id: recipient?.id || null, // For direct messages
                        content,
                        timestamp: timestamp || new Date().toISOString(),
                        is_read: false
                    });

                if (error) {
                    console.error('Error saving message to database:', error);
                }

                // If this is a direct message, publish to recipient's channel
                if (recipient && recipient.id) {
                    const directChannel = this.ablyClient.channels.get(`direct:${recipient.id}`);
                    directChannel.publish('message', message.data);
                }

                // Broadcast to general chat that a new message was sent
                const generalChannel = this.ablyClient.channels.get('general-chat');
                generalChannel.publish('message', message.data);
            } catch (error) {
                console.error('Error processing message:', error);
            }
        });

        // Setup presence listeners for online status
        const presenceChannel = this.ablyClient.channels.get('presence');

        // Subscribe to presence enter events
        presenceChannel.presence.subscribe('enter', async (memberInfo) => {
            const userData = memberInfo.data as { userId: string };
            console.log(`User ${userData.userId} is now online`);

            // Update the user's online status in the database
            await this.userManager.updateOnlineStatus(userData.userId, true);

            // Publish the updated user list to all clients
            await this.publishUserList();
        });

        // Subscribe to presence leave events
        presenceChannel.presence.subscribe('leave', async (memberInfo) => {
            const userData = memberInfo.data as { userId: string };
            console.log(`User ${userData.userId} is now offline`);

            // Update the user's online status in the database
            await this.userManager.updateOnlineStatus(userData.userId, false);

            // Publish the updated user list to all clients
            await this.publishUserList();
        });
    }

    // Add a method to publish the user list to all clients
    private async publishUserList(): Promise<void> {
        try {
            console.log('Publishing user list to all clients');

            // Get the current user list from the database - using lowercase column names
            const { data, error } = await this.supabase
                .from('users')
                .select('id, username, isonline, lastseen'); // Changed isOnline to isonline and lastSeen to lastseen

            if (error) {
                console.error('Error fetching users for publishing:', error);
                return;
            }

            console.log('Retrieved users from database:', data);

            if (!data || data.length === 0) {
                console.warn('No users found in the database to publish');
                return;
            }

            // Publish the user list to the users channel
            const usersChannel = this.ablyClient.channels.get('users');
            await usersChannel.publish('update', { users: data });
            console.log('User list published successfully, count:', data.length);
        } catch (error) {
            console.error('Error publishing user list:', error);
        }
    }

    public start(): void {
        this.app.listen(this.port, () => {
            console.log(`Server is running on port ${this.port}`);
        });
    }
} 