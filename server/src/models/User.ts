import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as Ably from 'ably';

// Define user interface
export interface UserData {
    id: string;
    username: string;
    email: string;
    isOnline: boolean;
    lastSeen?: Date;
}

export class User {
    private supabase: SupabaseClient;
    private ably: Ably.Realtime;
    private presenceChannel: Ably.RealtimeChannel;

    constructor(supabaseUrl: string, supabaseKey: string, ablyClient: Ably.Realtime) {
        // Initialize Supabase client with service role key for admin operations
        // This bypasses RLS policies for server-side operations
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        if (!serviceRoleKey) {
            console.warn('SUPABASE_SERVICE_ROLE_KEY not set - using anon key instead');
        }

        this.supabase = createClient(
            supabaseUrl,
            serviceRoleKey || supabaseKey // Use service role key if available, otherwise fall back to anon key
        );

        this.ably = ablyClient;
        this.presenceChannel = this.ably.channels.get('presence');
    }

    /**
     * Get user by ID
     */
    async getUserById(userId: string): Promise<UserData | null> {
        const { data, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching user:', error);
            return null;
        }

        return data as UserData;
    }

    /**
     * Update user's online status
     */
    async updateOnlineStatus(userId: string, isOnline: boolean): Promise<boolean> {
        const { error } = await this.supabase
            .from('users')
            .update({
                isonline: isOnline,
                lastseen: isOnline ? null : new Date()
            })
            .eq('id', userId);

        if (error) {
            console.error('Error updating online status:', error);
            return false;
        }

        // Publish the online status change to Ably
        await this.publishOnlineStatus(userId, isOnline);
        return true;
    }

    /**
     * Publish user online status to Ably
     */
    private async publishOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
        try {
            const user = await this.getUserById(userId);
            if (!user) return;

            if (isOnline) {
                // Enter presence set
                await this.presenceChannel.presence.enter({
                    userId: user.id,
                    username: user.username,
                    isonline: true
                });
            } else {
                // Leave presence set
                await this.presenceChannel.presence.leave();
            }
        } catch (error) {
            console.error('Error publishing online status:', error);
        }
    }

    /**
     * Check if a user is online
     */
    async isUserOnline(userId: string): Promise<boolean> {
        const user = await this.getUserById(userId);
        return user?.isOnline || false;
    }

    /**
     * Setup presence listeners for real-time online status updates
     */
    setupPresenceListeners(callback: (userId: string, isOnline: boolean) => void): void {
        this.presenceChannel.presence.subscribe('enter', (member) => {
            const userData = member.data as { userId: string };
            callback(userData.userId, true);
        });

        this.presenceChannel.presence.subscribe('leave', (member) => {
            const userData = member.data as { userId: string };
            callback(userData.userId, false);
        });
    }

    /**
     * Create a new user in the database
     */
    async createUser(userId: string, email: string, username: string): Promise<UserData | null> {
        try {
            console.log(`Creating user profile for ID: ${userId}, username: ${username}`);

            // Use service role key for admin operations to bypass RLS
            const { data, error } = await this.supabase
                .from('users')
                .insert({
                    id: userId,
                    email,
                    username,
                    isonline: true,
                    lastseen: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating user profile:', error);
                return null;
            }

            console.log('User profile created successfully:', data);
            return data as UserData;
        } catch (error) {
            console.error('Exception during user creation:', error);
            return null;
        }
    }
} 