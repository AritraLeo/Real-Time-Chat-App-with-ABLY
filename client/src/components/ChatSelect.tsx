import { useAuth } from '../context/AuthContext';

interface ChatSelectProps {
    onSelectChat: (chatId: string) => void;
}

export function ChatSelect({ onSelectChat }: ChatSelectProps) {
    const { user } = useAuth();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
                <h1 className="text-2xl font-bold text-center mb-6">Welcome, {user?.user_metadata.username || 'User'}</h1>
                <p className="text-gray-600 mb-6 text-center">Select a chat to begin messaging</p>

                <div
                    className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition mb-4"
                    onClick={() => onSelectChat('general')}
                >
                    <h2 className="font-bold text-lg">General Chat</h2>
                    <p className="text-gray-500 text-sm">Public chat room for all users</p>
                </div>

                <div className="mt-6 text-center text-gray-500 text-sm">
                    <p>More chat rooms coming soon!</p>
                </div>
            </div>
        </div>
    );
} 