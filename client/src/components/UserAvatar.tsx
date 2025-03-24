import { useAbly } from '../context/AblyContext';

interface UserAvatarProps {
    userId?: string;
    username: string;
    size?: 'sm' | 'md' | 'lg';
}

export function UserAvatar({ userId, username, size = 'md' }: UserAvatarProps) {
    const { userPresence } = useAbly();
    const isOnline = userId ? (userPresence.get(userId) || false) : true; // Current user is always online

    // Size classes
    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-14 h-14 text-base'
    };

    // Indicator size classes
    const indicatorSizeClasses = {
        sm: 'w-2 h-2',
        md: 'w-3 h-3',
        lg: 'w-4 h-4'
    };

    // Get initials from username
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <div className="relative">
            {/* Avatar */}
            <div
                className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-blue-500 text-white font-medium`}
            >
                {getInitials(username)}
            </div>

            {/* Online status indicator */}
            <div
                className={`absolute -bottom-1 -right-1 ${indicatorSizeClasses[size]} online-indicator ${isOnline ? 'online' : 'offline'} ring-2 ring-white`}
                title={isOnline ? 'Online' : 'Offline'}
            />
        </div>
    );
} 