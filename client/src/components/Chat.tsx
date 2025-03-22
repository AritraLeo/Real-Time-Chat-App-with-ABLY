import { useState } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { UserList } from './UserList';
import { UserAvatar } from './UserAvatar';
import { useAuth } from '../context/AuthContext';

interface User {
    id: string;
    username: string;
    isOnline: boolean;
    lastSeen?: string;
}

export function Chat() {
    const { user, signOut } = useAuth();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showUserList, setShowUserList] = useState(true);

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

    return (
        <div className="flex h-screen bg-white">
            {/* User list (sidebar) */}
            <div
                className={`
          ${showUserList ? 'block' : 'hidden'} 
          md:block w-full md:w-80 lg:w-96 border-r border-gray-200
        `}
            >
                {/* Current user info */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <UserAvatar
                            userId={user.id}
                            username={user.user_metadata.username || 'Anonymous'}
                        />
                        <div>
                            <div className="font-semibold">
                                {user.user_metadata.username || 'Anonymous'}
                            </div>
                            <div className="text-xs text-green-500">Online</div>
                        </div>
                    </div>

                    {/* Sign out button */}
                    <button
                        onClick={signOut}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        Sign Out
                    </button>
                </div>

                {/* User list */}
                <UserList
                    onUserSelect={handleUserSelect}
                    selectedUserId={selectedUser?.id}
                />
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col h-full">
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
                            <div className="font-semibold">Group Chat</div>
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
    );
} 