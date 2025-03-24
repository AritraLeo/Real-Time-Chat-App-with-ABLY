import { useState, useEffect } from 'react';
import { UserAvatar } from './UserAvatar';
import { useAuth } from '../context/AuthContext';
import { useAbly } from '../context/AblyContext';

interface User {
    id: string;
    username: string;
    isOnline?: boolean;
    isonline?: boolean;
    lastSeen?: string;
    lastseen?: string;
}

interface UserListProps {
    onUserSelect: (user: User) => void;
    selectedUserId?: string;
}

export function UserList({ onUserSelect, selectedUserId }: UserListProps) {
    const { user: currentUser } = useAuth();
    const { userPresence, users: ablyUsers } = useAbly();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Merge users from Ably with local state and normalize field names
    useEffect(() => {
        console.log('UserList - ablyUsers received:', ablyUsers);
        console.log('UserList - currentUser:', currentUser);

        if (ablyUsers.length > 0) {
            console.log('Received users from AblyContext:', ablyUsers);

            // Normalize field names (handle both camelCase and lowercase)
            const normalizedUsers = ablyUsers.map(user => ({
                ...user,
                // Make sure we have isOnline property regardless of the source format
                isOnline: user.isOnline !== undefined ? user.isOnline : user.isonline,
                lastSeen: user.lastSeen || user.lastseen
            }));

            setUsers(normalizedUsers);
            setLoading(false);
        } else {
            console.log('No users received from AblyContext yet');
        }
    }, [ablyUsers]);

    // Update online status from Ably presence
    useEffect(() => {
        if (userPresence.size > 0 && users.length > 0) {
            setUsers(prevUsers =>
                prevUsers.map(user => {
                    const isOnline = userPresence.get(user.id) || false;
                    return { ...user, isOnline };
                })
            );
        }
    }, [userPresence, users.length]);

    // Sort users by online status
    const sortedUsers = [...users].sort((a, b) => {
        // Current user first if they're in the list
        if (a.id === currentUser?.id) return -1;
        if (b.id === currentUser?.id) return 1;

        // Then online users
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;

        // Then sort by username
        return a.username.localeCompare(b.username);
    });

    if (loading) {
        return (
            <div className="p-4 text-center text-gray-500">
                Loading users...
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div className="p-4 text-center text-gray-500">
                No users found.
            </div>
        );
    }

    return (
        <div className="overflow-y-auto p-2">
            <ul className="space-y-1">
                {sortedUsers.map(user => {
                    const isCurrentUser = user.id === currentUser?.id;
                    return (
                        <li
                            key={user.id}
                            className={`p-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors ${selectedUserId === user.id ? 'bg-blue-50 hover:bg-blue-100' : ''
                                } ${isCurrentUser ? 'bg-gray-50' : ''}`}
                            onClick={() => !isCurrentUser && onUserSelect(user)}
                        >
                            <div className="flex items-center gap-3">
                                <UserAvatar userId={user.id} username={user.username} size="sm" />
                                <div>
                                    <div className="font-medium">
                                        {user.username}
                                        {isCurrentUser && <span className="text-xs ml-2 text-gray-500">(You)</span>}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {user.isOnline
                                            ? 'Online now'
                                            : user.lastSeen
                                                ? `Last seen ${new Date(user.lastSeen).toLocaleString()}`
                                                : 'Offline'
                                        }
                                    </div>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
} 