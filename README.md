# Real-Time Chat App with Ably and Supabase

A real-time chat application using Node.js + TypeScript for the backend and React + Vite for the frontend. The application uses Ably for real-time messaging and Supabase for user management and data storage.

## Features

- User registration and authentication via Supabase
- Real-time messaging with Ably
- Online/offline status indicators
- Group and private messaging
- Responsive design for mobile and desktop

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Ably account and API key
- Supabase account and project

### Backend Setup

1. Navigate to the server directory:

   ```
   cd server
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Copy the environment file and add your credentials:

   ```
   cp .env.example .env
   ```

4. Edit the `.env` file with your Ably and Supabase credentials.

5. Build and run the server:

   ```
   npm run build
   npm start
   ```

   For development:

   ```
   npm run dev
   ```

### Frontend Setup

1. Navigate to the client directory:

   ```
   cd client
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Copy the environment file and add your credentials:

   ```
   cp .env.example .env
   ```

4. Edit the `.env` file with your Supabase credentials and API URL.

5. Run the development server:
   ```
   npm run dev
   ```

## Supabase Database Setup

### Tables Required

1. **users**:

   - id (uuid, primary key)
   - username (text, not null)
   - email (text, not null, unique)
   - isOnline (boolean, default: false)
   - lastSeen (timestamp)
   - created_at (timestamp)

2. **messages**:
   - id (uuid, primary key)
   - sender_id (uuid, references users.id)
   - recipient_id (uuid, references users.id, nullable)
   - content (text, not null)
   - timestamp (timestamp, not null)
   - is_read (boolean, default: false)

## Deployment

### Backend

The backend can be deployed to any Node.js hosting service such as:

- Heroku
- Vercel
- Digital Ocean
- AWS

### Frontend

The frontend can be deployed using:

- Vercel
- Netlify
- GitHub Pages
- Firebase Hosting

## License

This project is licensed under the MIT License - see the LICENSE file for details.
