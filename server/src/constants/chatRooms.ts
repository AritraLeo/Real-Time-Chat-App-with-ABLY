export interface ChatRoom {
    id: string;
    name: string;
    description: string;
}

export const CHAT_ROOMS: ChatRoom[] = [
    {
        id: 'general',
        name: 'General Chat',
        description: 'Public chat room for general discussions'
    },
    {
        id: 'tech',
        name: 'Tech Chat',
        description: 'Discuss programming, technology, and development'
    },
    {
        id: 'resources',
        name: 'Resources',
        description: 'Share useful links and learning resources'
    }
]; 