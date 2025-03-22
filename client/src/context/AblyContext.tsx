import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Ably from 'ably';
import { useAuth } from './AuthContext';

interface AblyContextType {
    ably: Ably.Realtime | null;
    chatChannel: Ably.RealtimeChannel | null;
    presenceChannel: Ably.RealtimeChannel | null;
    userPresence: Map<string, boolean>;
    sendMessage: (content: string, recipient?: { id: string, username: string }) => Promise<void>;
}

const AblyContext = createContext<AblyContextType | undefined>(undefined);

export function AblyProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [ably, setAbly] = useState<Ably.Realtime | null>(null);
    const [chatChannel, setChatChannel] = useState<Ably.RealtimeChannel | null>(null);
    const [presenceChannel, setPresenceChannel] = useState<Ably.RealtimeChannel | null>(null);
    const [userPresence, setUserPresence] = useState<Map<string, boolean>>(new Map());

    // Initialize Ably client when user is authenticated
    useEffect(() => {
        let client: Ably.Realtime | null = null;

        const initAbly = async () => {
            if (!user) {
                setAbly(null);
                setChatChannel(null);
                setPresenceChannel(null);
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

                // Setup presence monitoring
                presence.presence.subscribe('enter', (member) => {
                    const userData = member.data as { userId: string };
                    setUserPresence(prev => new Map(prev).set(userData.userId, true));
                });

                presence.presence.subscribe('leave', (member) => {
                    const userData = member.data as { userId: string };
                    setUserPresence(prev => new Map(prev).set(userData.userId, false));
                });

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