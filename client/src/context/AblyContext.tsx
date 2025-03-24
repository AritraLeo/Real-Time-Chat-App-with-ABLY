import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Ably from 'ably';
import { useAuth } from './AuthContext';

// Define interfaces for type safety
interface UserPresenceInfo {
    id: string;
    username: string;
    isOnline?: boolean;
    isonline?: boolean;
    lastSeen?: string;
    lastseen?: string;
}

interface AblyContextType {
    ably: Ably.Realtime | null;
    chatChannel: Ably.RealtimeChannel | null;
    presenceChannel: Ably.RealtimeChannel | null;
    userPresence: Map<string, boolean>;
    users: UserPresenceInfo[];
    sendMessage: (content: string, recipient?: { id: string, username: string }) => Promise<void>;
}

const AblyContext = createContext<AblyContextType | undefined>(undefined);

export function AblyProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [ably, setAbly] = useState<Ably.Realtime | null>(null);
    const [chatChannel, setChatChannel] = useState<Ably.RealtimeChannel | null>(null);
    const [presenceChannel, setPresenceChannel] = useState<Ably.RealtimeChannel | null>(null);
    const [userPresence, setUserPresence] = useState<Map<string, boolean>>(new Map());
    const [users, setUsers] = useState<UserPresenceInfo[]>([]);

    // Initialize Ably client when user is authenticated
    useEffect(() => {
        let client: Ably.Realtime | null = null;

        const initAbly = async () => {
            if (!user) {
                setAbly(null);
                setChatChannel(null);
                setPresenceChannel(null);
                setUsers([]);
                return;
            }

            try {
                // Get Ably token from server
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ably/token?userId=${user.id}`);
                const tokenRequest = await response.json();

                // Initialize Ably with the token
                client = new Ably.Realtime({ authCallback: (_, callback) => callback(null, tokenRequest) });

                // Set the Ably client and channels
                setAbly(client);

                // Initialize the chat channel
                const chat = client.channels.get('chat');
                setChatChannel(chat);

                // Initialize the presence channel
                const presence = client.channels.get('presence');
                setPresenceChannel(presence);

                // Initialize the users channel for user list updates
                const usersChannel = client.channels.get('users');

                // Subscribe to user list updates
                usersChannel.subscribe('update', (message) => {
                    console.log('Received users update from Ably channel:', message.data);
                    if (message.data && message.data.users) {
                        console.log('User data received:', message.data.users);
                        const updatedUsers = message.data.users as UserPresenceInfo[];

                        // Normalize field names from database (lowercase) to component expected format (camelCase)
                        const normalizedUsers = updatedUsers.map(user => ({
                            ...user,
                            // Make sure we have properly named properties regardless of the source
                            isOnline: user.isOnline !== undefined ? user.isOnline : user.isonline,
                            lastSeen: user.lastSeen || user.lastseen
                        }));

                        setUsers(normalizedUsers);

                        // Update presence map based on users
                        const newPresenceMap = new Map<string, boolean>();
                        normalizedUsers.forEach(user => {
                            newPresenceMap.set(user.id, user.isOnline || false);
                        });
                        setUserPresence(newPresenceMap);
                    }
                });

                // Request initial user list immediately
                usersChannel.publish('request_users', { userId: user.id });
                console.log('Published request for user list with user ID:', user.id);

                // Setup presence monitoring
                presence.presence.subscribe('enter', (member) => {
                    console.log('Presence enter:', member);
                    const userData = member.data as { userId: string };
                    setUserPresence(prev => new Map(prev).set(userData.userId, true));
                });

                presence.presence.subscribe('leave', (member) => {
                    console.log('Presence leave:', member);
                    const userData = member.data as { userId: string };
                    setUserPresence(prev => new Map(prev).set(userData.userId, false));
                });

                // Get initial presence members
                try {
                    const members = await presence.presence.get();
                    console.log('Initial presence members:', members);

                    const newPresenceMap = new Map<string, boolean>();
                    members.forEach(member => {
                        const userData = member.data as { userId: string };
                        newPresenceMap.set(userData.userId, true);
                    });
                    setUserPresence(newPresenceMap);
                } catch (error) {
                    console.error('Error getting presence members:', error);
                }

                // Enter the presence channel
                await presence.presence.enter({ userId: user.id });

                // Subscribe to the general chat channel
                const generalChat = client.channels.get('general-chat');
                generalChat.subscribe('message', (message) => {
                    console.log('General chat message:', message.data);
                });
            } catch (error) {
                console.error('Error initializing Ably:', error);
            }
        };

        initAbly();

        // Cleanup
        return () => {
            if (client) {
                client.close();
            }
        };
    }, [user]);

    // Function to send a message
    const sendMessage = async (content: string, recipient?: { id: string, username: string }) => {
        if (!chatChannel || !user) return;

        try {
            const message = {
                content,
                sender: {
                    id: user.id,
                    username: user.user_metadata.username || 'Anonymous'
                },
                recipient,
                timestamp: new Date().toISOString()
            };

            await chatChannel.publish('message', message);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const value = {
        ably,
        chatChannel,
        presenceChannel,
        userPresence,
        users,
        sendMessage
    };

    return <AblyContext.Provider value={value}>{children}</AblyContext.Provider>;
}

export function useAbly() {
    const context = useContext(AblyContext);
    if (context === undefined) {
        throw new Error('useAbly must be used within an AblyProvider');
    }
    return context;
} 