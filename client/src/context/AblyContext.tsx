import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Ably from 'ably';
import { useAuth } from './AuthContext';

interface AblyContextType {
    ably: Ably.Realtime | null;
    chatChannel: Ably.RealtimeChannel | null;
    presenceChannel: Ably.RealtimeChannel | null;
    userPresence: Map<string, boolean>;
    generalChatSpace: any | null; // Ably Space for General Chat
    generalChatMembers: Array<{ id: string; connectionId: string; profileData: any; }>;
    sendMessage: (content: string, recipient?: { id: string, username: string }) => Promise<void>;
}

const AblyContext = createContext<AblyContextType | undefined>(undefined);

export function AblyProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [ably, setAbly] = useState<Ably.Realtime | null>(null);
    const [chatChannel, setChatChannel] = useState<Ably.RealtimeChannel | null>(null);
    const [presenceChannel, setPresenceChannel] = useState<Ably.RealtimeChannel | null>(null);
    const [userPresence, setUserPresence] = useState<Map<string, boolean>>(new Map());
    const [generalChatSpace, setGeneralChatSpace] = useState<any | null>(null);
    const [generalChatMembers, setGeneralChatMembers] = useState<Array<{ id: string; connectionId: string; profileData: any; }>>([]);

    // Initialize Ably client when user is authenticated
    useEffect(() => {
        let client: Ably.Realtime | null = null;

        const initAbly = async () => {
            if (!user) {
                setAbly(null);
                setChatChannel(null);
                setPresenceChannel(null);
                setGeneralChatSpace(null);
                setGeneralChatMembers([]);
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

                // Initialize the General Chat space using Ably Spaces
                if (client.spaces) {
                    const space = client.spaces.get('general-chat');

                    // Set up member handlers for the space
                    space.members.subscribe('enter', (memberInfo) => {
                        console.log('Member entered:', memberInfo);
                        setGeneralChatMembers(prev => [...prev, memberInfo]);
                    });

                    space.members.subscribe('leave', (memberInfo) => {
                        console.log('Member left:', memberInfo);
                        setGeneralChatMembers(prev =>
                            prev.filter(member => member.connectionId !== memberInfo.connectionId)
                        );
                    });

                    space.members.subscribe('update', (memberInfo) => {
                        console.log('Member updated:', memberInfo);
                        setGeneralChatMembers(prev =>
                            prev.map(member =>
                                member.connectionId === memberInfo.connectionId ? memberInfo : member
                            )
                        );
                    });

                    // Enter the space with user profile data
                    await space.enter({
                        username: user.user_metadata.username || 'Anonymous',
                        id: user.id,
                        isOnline: true
                    });

                    // Get existing members
                    const members = await space.members.get();
                    setGeneralChatMembers(members);

                    setGeneralChatSpace(space);
                } else {
                    console.warn('Ably Spaces is not available in this SDK version');
                }
            } catch (error) {
                console.error('Error initializing Ably:', error);
            }
        };

        initAbly();

        // Cleanup
        return () => {
            if (client) {
                if (generalChatSpace) {
                    generalChatSpace.leave().catch(console.error);
                }
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
        generalChatSpace,
        generalChatMembers,
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