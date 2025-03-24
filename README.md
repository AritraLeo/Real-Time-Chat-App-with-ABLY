# Real-Time Chat App with ABLY

A modern real-time chat application built with React, TypeScript, Ably for real-time messaging, and Supabase for user authentication and data storage.

## Features

- 🔐 User authentication with Supabase Auth
- 💬 Real-time messaging across multiple chat rooms
- 👥 User presence tracking (online/offline status)
- 📱 Responsive design for mobile and desktop
- 🔄 Message persistence with PostgreSQL
- 👤 User profiles and avatars
- 🏠 Multiple chat rooms support
- 📝 Direct messaging capabilities

## Technology Stack

### Frontend

- **React**: UI framework
- **TypeScript**: Type safety and better developer experience
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Vite**: Build tool and development server

### Backend

- **Node.js**: Runtime environment
- **Express**: Web framework
- **TypeScript**: Type safety
- **Supabase**: Database and authentication
- **Ably**: Real-time messaging infrastructure

## Architecture Overview

### Authentication (AuthContext)

- Uses Supabase Auth for user management
- Handles user registration, login, and session persistence
- Manages user metadata and profile information
- Provides authentication state throughout the application

### Real-time Messaging (AblyContext)

- Manages real-time communication using Ably
- Features:
  - Channel management for different chat rooms
  - Message publishing and subscription
  - User presence tracking
  - Message persistence
  - Optimistic UI updates

### Database Schema (Supabase)

#### Users Table

```sql
- id (uuid, primary key)
- username (text)
- email (text)
- isonline (boolean)
- lastseen (timestamp)
```

#### Messages Table

```sql
- id (uuid, primary key)
- content (text)
- sender_id (uuid, references users)
- recipient_id (uuid, references users, nullable)
- chat_id (text)
- created_at (timestamp)
- updated_at (timestamp)
```

## Core Components and Their Functions

### AblyContext

The central hub for real-time messaging functionality:

1. **Connection Management**

   ```typescript
   client = new Ably.Realtime({
     authCallback: (_, callback) => callback(null, tokenRequest),
   });
   ```

   - Handles Ably client initialization
   - Manages authentication token retrieval
   - Maintains connection state

2. **Channel Management**

   ```typescript
   const chatChannel = ably.channels.get(`chat:${chatId}`);
   ```

   - Creates and manages chat room channels
   - Handles message subscription and publishing
   - Manages channel lifecycle

3. **Message Handling**

   ```typescript
   chatChannel.subscribe("message", handleMessage);
   ```

   - Real-time message subscription
   - Message state management
   - Optimistic UI updates
   - Message persistence

4. **Presence System**
   ```typescript
   presence.presence.subscribe("enter", (member) => {
     // Handle user presence
   });
   ```
   - Tracks user online/offline status
   - Updates presence indicators
   - Manages user list updates

### Message Management

1. **Sending Messages**

   ```typescript
   const sendMessage = async (content: string, chatId: string, recipient?: { id: string, username: string })
   ```

   - Sends messages to the server
   - Updates local state optimistically
   - Handles error cases
   - Supports direct messaging

2. **Receiving Messages**

   ```typescript
   const handleMessage = (message: Ably.Message) => {
     // Process incoming message
   };
   ```

   - Processes incoming real-time messages
   - Updates message state
   - Handles different message types
   - Prevents duplicate messages

3. **Message History**
   ```typescript
   const loadMoreMessages = async (chatId: string)
   ```
   - Loads historical messages
   - Implements pagination
   - Maintains message order
   - Handles loading states

### User Presence System

1. **Presence Tracking**

   ```typescript
   presence.presence.subscribe("enter", handleUserEnter);
   presence.presence.subscribe("leave", handleUserLeave);
   ```

   - Real-time user status updates
   - Presence state management
   - User list synchronization

2. **User List Management**
   ```typescript
   usersChannel.subscribe("update", handleUserListUpdate);
   ```
   - Maintains current user list
   - Handles user status changes
   - Updates UI in real-time

## Environment Setup

### Client (.env)

```
VITE_API_URL=your_api_url
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Server (.env)

```
PORT=3000
ABLY_API_KEY=your_ably_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CORS_ORIGIN=http://localhost:5173
```

## Security Considerations

1. **Authentication**

   - JWT-based authentication with Supabase
   - Secure token management
   - Protected API endpoints

2. **Database Security**

   - Row Level Security (RLS) policies
   - Service role key for admin operations
   - Secure user data access

3. **Real-time Security**
   - Ably token authentication
   - Channel access control
   - Message validation

## Getting Started

1. Clone the repository
2. Install dependencies:

   ```bash
   # Install client dependencies
   cd client
   npm install

   # Install server dependencies
   cd ../server
   npm install
   ```

3. Set up environment variables:

   - Copy `.env.example` to `.env` in both client and server directories
   - Fill in your Supabase and Ably credentials

4. Start the development servers:

   ```bash
   # Start client
   cd client
   npm run dev

   # Start server
   cd ../server
   npm run dev
   ```

## API Endpoints

### Authentication

- `POST /api/users/register`: Register a new user
- `POST /api/users/:userId/status`: Update user status

### Messages

- `GET /api/chat-rooms/:chatId/messages`: Get messages for a chat room
- `POST /api/chat-rooms/:chatId/messages`: Send a message
- `GET /api/chat-rooms`: Get available chat rooms

### User Management

- `GET /api/users/:userId/status`: Check user online status
- `GET /api/ably/token`: Get Ably authentication token

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
