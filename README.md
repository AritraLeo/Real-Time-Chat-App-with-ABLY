# Real-Time Chat App with ABLY

A real-time chat application built with Node.js, TypeScript, Vite, Supabase, and Ably.

## Features

- User authentication with Supabase
- Real-time messaging with Ably
- Online/offline user status
- Direct messaging
- User presence
- Chat room selection

## Setup Instructions

### Prerequisites

- Node.js 16+
- npm or yarn
- Supabase account
- Ably account

### Environment Variables

1. Create a `.env` file in the `client` directory:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3000
```

2. Create a `.env` file in the `server` directory:

```
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ABLY_API_KEY=your_ably_api_key
CORS_ORIGIN=http://localhost:5173
```

> **IMPORTANT**: The `SUPABASE_SERVICE_ROLE_KEY` is required for the server to bypass Row-Level Security policies when creating users. You can find this key in your Supabase dashboard under Project Settings > API. Be careful not to expose this key in client-side code.

### Database Setup

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Create a new query and paste the contents of `server/src/db/schema.sql`
4. Run the query to create the necessary tables and policies

### Installation

1. Clone the repository
2. Install dependencies:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Running the Application

1. Start the server:

```bash
cd server
npm run build
npm start
```

2. Start the client:

```bash
cd client
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Troubleshooting

If you encounter issues with users not showing up:

1. Check that the `users` table exists in your Supabase database
2. Ensure all environment variables are set correctly
3. Restart both the server and client
4. Check the server logs for any errors

## License

MIT
