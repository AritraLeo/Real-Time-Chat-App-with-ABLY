import { useState, useEffect } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { UserList } from './UserList';
import { UserAvatar } from './UserAvatar';
import { useAuth } from '../context/AuthContext';
import { useAbly } from '../context/AblyContext';

interface User {
    id: string;
    username: string;
    isOnline: boolean;
    lastSeen?: string;
}

interface ChatProps {
    chatId: string;
    onBackToSelection: () => void;
}

export function Chat({ chatId, onBackToSelection }: ChatProps) {
    const { user, signOut } = useAuth();
    const { users } = useAbly();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showUserList, setShowUserList] = useState(true);
    const [activeForum] = useState(chatId === 'general' ? 'General Chat' : chatId);

    // Log users for debugging
    useEffect(() => {
        console.log('Chat component - Current users:', users);
    }, [users]);

    const handleUserSelect = (user: User) => {
        setSelectedUser(user);
        // On mobile, hide the user list after selecting
        if (window.innerWidth < 768) {
            setShowUserList(false);
        }
    };

    const toggleUserList = () => {
        setShowUserList(prev => !prev);
    };

    if (!user) {
        return null;
    }

    // Count online users
    const onlineUsersCount = users.filter(u => u.isOnline).length;

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-white shadow-sm p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={onBackToSelection}
                        className="text-gray-600 hover:text-gray-800 focus:outline-none"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-semibold">{activeForum}</h1>
                </div>
                <div className="flex items-center">
                    {user && (
                        <div className="flex items-center mr-2">
                            <UserAvatar username={user.user_metadata.username} size="sm" />
                            <span className="ml-2 text-sm font-medium hidden md:inline">
                                {user.user_metadata.username}
                            </span>
                        </div>
                    )}
                    <button
                        onClick={signOut}
                        className="ml-2 px-2 py-1 text-sm text-red-600 hover:text-red-800 focus:outline-none"
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* User list (sidebar) */}
                <div
                    className={`
                        ${showUserList ? 'block' : 'hidden'} 
                        md:block w-full md:w-80 lg:w-96 border-r border-gray-200 bg-white overflow-y-auto
                    `}
                >
                    {/* User list section title */}
                    <div className="px-4 py-2 border-b border-gray-200">
                        <div className="font-medium text-gray-700">{activeForum}</div>
                        <div className="text-xs text-gray-500">
                            {onlineUsersCount} user(s) online
                        </div>
                    </div>

                    {/* User list */}
                    <UserList
                        onUserSelect={handleUserSelect}
                        selectedUserId={selectedUser?.id}
                    />
                </div>

                {/* Chat area */}
                <div className="flex-1 flex flex-col h-full bg-white">
                    {/* Chat header */}
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* Toggle user list on mobile */}
                            <button
                                className="md:hidden text-gray-500"
                                onClick={toggleUserList}
                            >
                                {showUserList ? '✕' : '☰'}
                            </button>

                            {selectedUser ? (
                                <>
                                    <UserAvatar
                                        userId={selectedUser.id}
                                        username={selectedUser.username}
                                    />
                                    <div>
                                        <div className="font-semibold">{selectedUser.username}</div>
                                        <div className="text-xs">
                                            {selectedUser.isOnline ? (
                                                <span className="text-green-500">Online</span>
                                            ) : (
                                                <span className="text-gray-500">Offline</span>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="font-semibold">{activeForum}</div>
                            )}
                        </div>
                    </div>

                    {/* Messages */}
                    <MessageList />

                    {/* Message input */}
                    <MessageInput
                        recipient={selectedUser ? {
                            id: selectedUser.id,
                            username: selectedUser.username
                        } : undefined}
                    />
                </div>
            </div>
        </div>
    );
} 