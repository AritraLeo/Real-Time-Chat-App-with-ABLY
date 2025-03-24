import express, { Application, Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import * as Ably from 'ably';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User } from './models/User';
import { Message } from './models/Message';
import { CHAT_ROOMS, ChatRoom } from './constants/chatRooms';

// Load environment variables
dotenv.config();

export class ChatServer {
    private app: Application;
    private port: number;
    private ablyClient: Ably.Realtime;
    private supabase: SupabaseClient;
    private userManager: User;
    private messageManager: Message;

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

        // Initialize Message manager
        this.messageManager = new Message(supabaseUrl, supabaseKey, this.ablyClient);

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

        // Route to get all available chat rooms
        this.app.get('/api/chat-rooms', ((_req: Request, res: Response) => {
            res.json(CHAT_ROOMS);
        }) as RequestHandler);

        // Route to get messages for a specific chat room
        this.app.get('/api/chat-rooms/:chatId/messages', (async (req: Request, res: Response) => {
            try {
                const chatId = req.params.chatId;
                const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

                const messages = await this.messageManager.getMessagesForChat(chatId, limit);
                res.json(messages);
            } catch (error) {
                console.error('Error fetching messages:', error);
                res.status(500).json({ error: 'Failed to fetch messages' });
            }
        }) as RequestHandler);

        // Route to send a message to a chat room
        this.app.post('/api/chat-rooms/:chatId/messages', (async (req: Request, res: Response) => {
            try {
                const chatId = req.params.chatId;
                const { content, senderId, recipientId } = req.body;

                if (!content || !senderId) {
                    return res.status(400).json({
                        error: 'Message content and sender ID are required'
                    });
                }

                // Get the sender's username
                const sender = await this.userManager.getUserById(senderId);
                if (!sender) {
                    return res.status(404).json({ error: 'Sender not found' });
                }

                // Save the message to the database
                const message = await this.messageManager.saveMessage(
                    senderId,
                    content,
                    chatId,
                    recipientId
                );

                if (!message) {
                    return res.status(500).json({ error: 'Failed to save message' });
                }

                // Publish the message to Ably
                await this.messageManager.publishMessage(message, sender.username);

                res.status(201).json(message);
            } catch (error) {
                console.error('Error sending message:', error);
                res.status(500).json({ error: 'Failed to send message' });
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

                const success = await this.userManager.updateOnlineStatus(userId, isOnline);

                if (success) {
                    res.json({ success: true });
                } else {
                    res.status(500).json({ error: 'Failed to update status' });
                }
            } catch (error) {
                console.error('Error updating user status:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }) as RequestHandler);

        // Route to check if a user is online
        this.app.get('/api/users/:userId/status', (async (req: Request, res: Response) => {
            try {
                const userId = req.params.userId;
                const isOnline = await this.userManager.isUserOnline(userId);
                res.json({ isOnline });
            } catch (error) {
                console.error('Error checking user status:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }) as RequestHandler);
    }

    private setupAblyListeners(): void {
        // Set up channel for each chat room
        CHAT_ROOMS.forEach(room => {
            const channelName = `chat:${room.id}`;
            console.log(`Setting up Ably channel: ${channelName}`);
            const roomChannel = this.ablyClient.channels.get(channelName);

            // Listen for messages in this chat room
            roomChannel.subscribe('message', async (message) => {
                console.log(`Received message in ${room.name}:`, message.data);
            });
        });

        // Handle requests for user list
        const usersChannel = this.ablyClient.channels.get('users');
        usersChannel.subscribe('request_users', async (message) => {
            console.log('Received request for user list from:', message.data?.userId);
            await this.publishUserList();
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