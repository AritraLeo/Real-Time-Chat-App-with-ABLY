import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { UserAvatar } from './UserAvatar';
import { useAuth } from '../context/AuthContext';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface User {
    id: string;
    username: string;
    isOnline: boolean;
    lastSeen?: string;
}

interface UserListProps {
    onUserSelect: (user: User) => void;
    selectedUserId?: string;
}

export function UserList({ onUserSelect, selectedUserId }: UserListProps) {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch all users
    useEffect(() => {
        const fetchUsers = async () => {
            if (!currentUser) return;

            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('id, username, isOnline, lastSeen')
                    .neq('id', currentUser.id); // Exclude current user

                if (error) {
                    console.error('Error fetching users:', error);
                    return;
                }

                setUsers(data || []);
            } catch (error) {
                console.error('Error fetching users:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();

        // Subscribe to user changes
        const channel = supabase
            .channel('users_channel')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'users' },
                (payload) => {
                    // Update users list when a user is updated
                    if (payload.eventType === 'UPDATE') {
                        const updatedUser = payload.new as User;
                        setUsers(prevUsers =>
                            prevUsers.map(user =>
                                user.id === updatedUser.id ? updatedUser : user
                            )
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser]);

    // Sort users by online status
    const sortedUsers = [...users].sort((a, b) => {
        // Online users first
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
            <h2 className="font-semibold text-gray-700 mb-2 px-2">Users</h2>
            <ul className="space-y-1">
                {sortedUsers.map(user => (
                    <li
                        key={user.id}
                        className={`p-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors ${selectedUserId === user.id ? 'bg-blue-50 hover:bg-blue-100' : ''
                            }`}
                        onClick={() => onUserSelect(user)}
                    >
                        <div className="flex items-center gap-3">
                            <UserAvatar userId={user.id} username={user.username} size="sm" />
                            <div>
                                <div className="font-medium">{user.username}</div>
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
                ))}
            </ul>
        </div>
    );
} 