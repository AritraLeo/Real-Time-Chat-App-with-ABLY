import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as Ably from 'ably';

// Define message interface
export interface MessageData {
    id: string;
    content: string;
    sender_id: string;
    recipient_id?: string;
    chat_id: string;
    created_at: string;
    updated_at: string;
    sender?: {
        id: string;
        username: string;
    };
}

export class Message {
    private supabase: SupabaseClient;
    private ably: Ably.Realtime;

    constructor(supabaseUrl: string, supabaseKey: string, ablyClient: Ably.Realtime) {
        // Initialize Supabase client with service role key for admin operations
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        if (!serviceRoleKey) {
            console.warn('SUPABASE_SERVICE_ROLE_KEY not set - using anon key instead');
        }

        this.supabase = createClient(
            supabaseUrl,
            serviceRoleKey || supabaseKey
        );

        this.ably = ablyClient;
    }

    /**
     * Get messages for a specific chat room
     */
    async getMessagesForChat(chatId: string, limit: number = 50): Promise<MessageData[]> {
        try {
            // First, get the messages
            const { data: messages, error: messagesError } = await this.supabase
                .from('messages')
                .select('*')
                .eq('chat_id', chatId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (messagesError) {
                console.error('Error fetching messages:', messagesError);
                return [];
            }

            if (!messages || messages.length === 0) {
                return [];
            }

            // Get unique sender IDs from messages
            const senderIds = [...new Set(messages.map(m => m.sender_id))];

            // Fetch user data for all senders
            const { data: users, error: usersError } = await this.supabase
                .from('users')
                .select('id, username')
                .in('id', senderIds);

            if (usersError) {
                console.error('Error fetching users:', usersError);
                return messages;
            }

            // Create a map of user data for quick lookup
            const userMap = new Map(users?.map(user => [user.id, user]) || []);

            // Combine message data with sender information
            const messagesWithSenders = messages.map(message => ({
                ...message,
                sender: userMap.get(message.sender_id)
                    ? {
                        id: message.sender_id,
                        username: userMap.get(message.sender_id)?.username || 'Unknown User'
                    }
                    : undefined
            }));

            return messagesWithSenders;
        } catch (error) {
            console.error('Exception fetching messages:', error);
            return [];
        }
    }

    /**
     * Save a new message to the database
     */
    async saveMessage(
        senderId: string,
        content: string,
        chatId: string,
        recipientId?: string
    ): Promise<MessageData | null> {
        try {
            const { data, error } = await this.supabase
                .from('messages')
                .insert({
                    sender_id: senderId,
                    content,
                    chat_id: chatId,
                    recipient_id: recipientId || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                console.error('Error saving message:', error);
                return null;
            }

            return data as MessageData;
        } catch (error) {
            console.error('Exception saving message:', error);
            return null;
        }
    }

    /**
     * Publish a message to the appropriate Ably channel
     */
    async publishMessage(message: MessageData, senderUsername: string): Promise<void> {
        try {
            // Create the message payload with sender info
            const messagePayload = {
                ...message,
                sender: {
                    id: message.sender_id,
                    username: senderUsername
                }
            };

            // Publish to chat room channel
            const chatChannel = this.ably.channels.get(`chat:${message.chat_id}`);
            await chatChannel.publish('message', messagePayload);

            // If this is a direct message, also publish to recipient's channel
            if (message.recipient_id) {
                const directChannel = this.ably.channels.get(`direct:${message.recipient_id}`);
                await directChannel.publish('message', messagePayload);
            }
        } catch (error) {
            console.error('Error publishing message:', error);
        }
    }
} 