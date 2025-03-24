import { useState, FormEvent, KeyboardEvent } from 'react';

export interface MessageInputProps {
    onSendMessage: (content: string) => Promise<void>;
    placeholder?: string;
    disabled?: boolean;
}

export function MessageInput({ onSendMessage, placeholder = 'Type a message...', disabled = false }: MessageInputProps) {
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!message.trim() || disabled) return;

        await onSendMessage(message);
        setMessage('');
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4">
            <div className="flex items-end gap-2">
                <textarea
                    className="flex-1 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] max-h-[120px]"
                    placeholder={placeholder}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={disabled}
                />
                <button
                    type="submit"
                    disabled={!message.trim() || disabled}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                    Send
                </button>
            </div>
        </form>
    );
} 