import { useState, FormEvent, KeyboardEvent } from 'react';
import { useAbly } from '../context/AblyContext';

interface MessageInputProps {
    recipient?: {
        id: string;
        username: string;
    };
}

export function MessageInput({ recipient }: MessageInputProps) {
    const [message, setMessage] = useState('');
    const { sendMessage } = useAbly();
    const forumName = 'General Chat';

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!message.trim()) return;

        await sendMessage(message, recipient);
        setMessage('');
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
            <div className="flex items-end gap-2">
                <textarea
                    className="flex-1 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] max-h-[120px]"
                    placeholder={recipient ? `Message ${recipient.username}...` : `Send a message to ${forumName}...`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                />
                <button
                    type="submit"
                    disabled={!message.trim()}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                    Send
                </button>
            </div>
        </form>
    );
} 