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

        // Initialize Supabase client
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
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
        this.app.get('/api/ably/token', ((req: Request, res: Response) => {
            try {
                const userId = req.query.userId as string;
                if (!userId) {
                    return res.status(400).json({ error: 'User ID is required' });
                }

                // Generate token for the client
                const tokenParams = { clientId: userId };

                // Using the Promise-based API instead of callback
                this.ablyClient.auth.createTokenRequest(tokenParams)
                    .then(tokenRequest => {
                        res.json(tokenRequest);
                    })
                    .catch(err => {
                        console.error('Error generating Ably token:', err);
                        res.status(500).json({ error: 'Error generating token' });
                    });
            } catch (error) {
                console.error('Error in token endpoint:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }) as RequestHandler);

        // Route to update user's online status
        this.app.post('/api/users/:userId/status', ((req: Request, res: Response) => {
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
            } catch (error) {
                console.error('Error processing message:', error);
            }
        });

        // Setup presence listeners for online status
        this.userManager.setupPresenceListeners((userId, isOnline) => {
            console.log(`User ${userId} is now ${isOnline ? 'online' : 'offline'}`);
            // You could perform additional actions here when users go online/offline
        });
    }

    public start(): void {
        this.app.listen(this.port, () => {
            console.log(`Server is running on port ${this.port}`);
        });
    }
} 