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

interface Message {
    id?: string;
    content: string;
    sender: {
        id: string;
        username: string;
    };
    recipient?: {
        id: string;
        username: string;
    };
    chat_id: string;
    timestamp?: string;
    created_at?: string;
}

interface AblyContextType {
    ably: Ably.Realtime | null;
    activeChatId: string | null;
    setActiveChatId: (chatId: string) => void;
    messages: Record<string, Message[]>;
    userPresence: Map<string, boolean>;
    users: UserPresenceInfo[];
    sendMessage: (content: string, chatId: string, recipient?: { id: string, username: string }) => Promise<void>;
    loadMoreMessages: (chatId: string) => Promise<void>;
}

const AblyContext = createContext<AblyContextType | undefined>(undefined);

export function AblyProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [ably, setAbly] = useState<Ably.Realtime | null>(null);
    const [userPresence, setUserPresence] = useState<Map<string, boolean>>(new Map());
    const [users, setUsers] = useState<UserPresenceInfo[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Record<string, Message[]>>({});

    // Initialize Ably client when user is authenticated
    useEffect(() => {
        let client: Ably.Realtime | null = null;

        const initAbly = async () => {
            if (!user) {
                setAbly(null);
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

                // Initialize the presence channel
                const presence = client.channels.get('presence');

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

    // Handle active chat change and fetch initial messages
    useEffect(() => {
        if (!ably || !activeChatId || !user) return;

        const fetchInitialMessages = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat-rooms/${activeChatId}/messages`);
                if (!response.ok) {
                    throw new Error('Failed to fetch messages');
                }

                const data = await response.json();
                setMessages(prev => ({
                    ...prev,
                    [activeChatId]: data.reverse() // Reverse to show newest at the bottom
                }));
            } catch (error) {
                console.error(`Error fetching messages for chat ${activeChatId}:`, error);
            }
        };

        // Set up chat channel for the active chat
        const channelName = `chat:${activeChatId}`;
        const chatChannel = ably.channels.get(channelName);

        // Subscribe to messages on this channel
        const handleMessage = (message: Ably.Message) => {
            console.log(`New message in ${activeChatId}:`, message.data);
            if (!message.data) return;

            const newMessage = message.data as Message;
            setMessages(prev => {
                const existingMessages = prev[activeChatId] || [];
                // Avoid duplicate messages
                if (!existingMessages.some(m => m.id === newMessage.id)) {
                    return {
                        ...prev,
                        [activeChatId]: [...existingMessages, newMessage]
                    };
                }
                return prev;
            });
        };

        chatChannel.subscribe('message', handleMessage);
        fetchInitialMessages();

        // Cleanup function to unsubscribe when component unmounts or chat changes
        return () => {
            chatChannel.unsubscribe('message', handleMessage);
        };
    }, [ably, activeChatId, user]);

    // Function to load more messages (pagination)
    const loadMoreMessages = async (chatId: string) => {
        if (!user || !chatId) return;

        try {
            const currentMessages = messages[chatId] || [];
            const oldestMessageDate = currentMessages.length > 0
                ? new Date(currentMessages[0].created_at || currentMessages[0].timestamp || '')
                : new Date();

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/chat-rooms/${chatId}/messages?before=${oldestMessageDate.toISOString()}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch more messages');
            }

            const olderMessages = await response.json();

            if (olderMessages.length > 0) {
                setMessages(prev => ({
                    ...prev,
                    [chatId]: [...olderMessages.reverse(), ...currentMessages]
                }));
            }
        } catch (error) {
            console.error(`Error loading more messages for chat ${chatId}:`, error);
        }
    };

    // Function to send a message
    const sendMessage = async (content: string, chatId: string, recipient?: { id: string, username: string }) => {
        if (!ably || !user) return;

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat-rooms/${chatId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content,
                    senderId: user.id,
                    recipientId: recipient?.id
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const messageData = await response.json();

            // Optimistically add the message to the UI
            setMessages(prev => {
                const existingMessages = prev[chatId] || [];
                return {
                    ...prev,
                    [chatId]: [...existingMessages, {
                        ...messageData,
                        sender: {
                            id: user.id,
                            username: user.user_metadata.username
                        }
                    }]
                };
            });
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const value = {
        ably,
        activeChatId,
        setActiveChatId,
        messages,
        userPresence,
        users,
        sendMessage,
        loadMoreMessages
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