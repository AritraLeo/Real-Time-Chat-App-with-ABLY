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

// Define fallback styles to ensure layout works
const styles = {
    container: {
        display: 'flex',
        height: '100vh',
        backgroundColor: '#FFFFFF'
    },
    sidebarVisible: {
        display: 'block',
        width: '30%',
        borderRight: '1px solid #E5E7EB'
    },
    sidebarHidden: {
        display: 'none'
    },
    sidebarMd: {
        width: '20rem'
    },
    sidebarLg: {
        width: '24rem'
    },
    headerContainer: {
        padding: '1rem',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    userInfoContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
    },
    username: {
        fontWeight: '600'
    },
    onlineStatus: {
        fontSize: '0.75rem',
        color: '#10B981'
    },
    offlineStatus: {
        fontSize: '0.75rem',
        color: '#6B7280'
    },
    signOutButton: {
        color: '#6B7280',
        cursor: 'pointer'
    },
    toggleButton: {
        display: 'block',
        color: '#6B7280',
        cursor: 'pointer'
    },
    hiddenMd: {
        display: 'none'
    },
    chatContainer: {
        display: 'flex',
        flexDirection: 'column' as const,
        flex: '1',
        height: '100%'
    }
};

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

    // Apply the inline styles based on state
    const sidebarStyle = {
        ...showUserList ? styles.sidebarVisible : styles.sidebarHidden,
        '@media (min-width: 768px)': styles.sidebarMd,
        '@media (min-width: 1024px)': styles.sidebarLg
    };

    return (
        <div style={styles.container} className="flex h-screen bg-white">
            {/* User list (sidebar) */}
            <div
                style={sidebarStyle}
                className={`
          ${showUserList ? 'block' : 'hidden'} 
          md:block w-full md:w-80 lg:w-96 border-r border-gray-200
        `}
            >
                {/* Current user info */}
                <div style={styles.headerContainer} className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div style={styles.userInfoContainer} className="flex items-center gap-3">
                        <UserAvatar
                            userId={user.id}
                            username={user.user_metadata.username || 'Anonymous'}
                        />
                        <div>
                            <div style={styles.username} className="font-semibold">
                                {user.user_metadata.username || 'Anonymous'}
                            </div>
                            <div style={styles.onlineStatus} className="text-xs text-green-500">Online</div>
                        </div>
                    </div>

                    {/* Sign out button */}
                    <button
                        onClick={signOut}
                        style={styles.signOutButton}
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
            <div style={styles.chatContainer} className="flex-1 flex flex-col h-full">
                {/* Chat header */}
                <div style={styles.headerContainer} className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div style={styles.userInfoContainer} className="flex items-center gap-3">
                        {/* Toggle user list on mobile */}
                        <button
                            style={styles.toggleButton}
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
                                    <div style={styles.username} className="font-semibold">{selectedUser.username}</div>
                                    <div className="text-xs">
                                        {selectedUser.isOnline ? (
                                            <span style={styles.onlineStatus} className="text-green-500">Online</span>
                                        ) : (
                                            <span style={styles.offlineStatus} className="text-gray-500">Offline</span>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div style={styles.username} className="font-semibold">Group Chat</div>
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