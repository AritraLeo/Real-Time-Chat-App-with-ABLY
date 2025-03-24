import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface ChatRoom {
    id: string;
    name: string;
    description: string;
}

interface ChatSelectProps {
    onSelectChat: (chatId: string) => void;
}

export function ChatSelect({ onSelectChat }: ChatSelectProps) {
    const { user } = useAuth();
    const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch available chat rooms when component mounts
    useEffect(() => {
        async function fetchChatRooms() {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat-rooms`);
                if (!response.ok) {
                    throw new Error('Failed to fetch chat rooms');
                }

                const data = await response.json();
                setChatRooms(data);
            } catch (error) {
                console.error('Error fetching chat rooms:', error);
                // Add fallback rooms in case the server is unreachable
                setChatRooms([
                    {
                        id: 'general',
                        name: 'General Chat',
                        description: 'Public chat room for all users'
                    }
                ]);
            } finally {
                setLoading(false);
            }
        }

        fetchChatRooms();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
                <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
                    <p className="text-gray-600">Loading chat rooms...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
                <h1 className="text-2xl font-bold text-center mb-6">Welcome, {user?.user_metadata.username || 'User'}</h1>
                <p className="text-gray-600 mb-6 text-center">Select a chat to begin messaging</p>

                {chatRooms.map(room => (
                    <div
                        key={room.id}
                        className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition mb-4"
                        onClick={() => onSelectChat(room.id)}
                    >
                        <h2 className="font-bold text-lg">{room.name}</h2>
                        <p className="text-gray-500 text-sm">{room.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
} 