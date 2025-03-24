import { useRef, useEffect } from 'react';
import { UserAvatar } from './UserAvatar';

export interface Message {
    id?: string;
    content: string;
    sender: {
        id: string;
        username: string;
    };
    recipient?: {
        id: string;
        username: string;
    };
    chat_id?: string;
    timestamp: string;
}

interface MessageListProps {
    messages: Message[];
    currentUserId: string;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Format timestamp
    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (messages.length === 0) {
        return (
            <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center text-gray-500">
                No messages yet. Start a conversation!
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {messages.map((message, index) => {
                const isOwnMessage = currentUserId === message.sender.id;

                return (
                    <div
                        key={message.id || `${message.timestamp}-${index}`}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[80%]`}>
                            {/* Avatar (only shown for other users) */}
                            {!isOwnMessage && (
                                <UserAvatar
                                    userId={message.sender.id}
                                    username={message.sender.username}
                                    size="sm"
                                />
                            )}

                            {/* Message bubble */}
                            <div
                                className={`${isOwnMessage
                                    ? 'bg-blue-500 text-white rounded-tl-lg rounded-tr-lg rounded-bl-lg'
                                    : 'bg-gray-200 text-gray-800 rounded-tl-lg rounded-tr-lg rounded-br-lg'
                                    } px-4 py-2 break-words`}
                            >
                                {/* Sender name in [username] format */}
                                <div className={`text-xs font-semibold mb-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-600'}`}>
                                    [{message.sender.username}]
                                </div>

                                {/* Message content */}
                                <div>{message.content}</div>

                                {/* Timestamp */}
                                <div className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                                    {formatTime(message.timestamp)}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>
    );
} 