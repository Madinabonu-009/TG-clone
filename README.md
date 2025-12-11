# Telegram Clone

A full-stack real-time messaging application built with React, Node.js, Socket.io, and MongoDB.

## Features

### Core Features
- 🔐 User authentication (Register/Login)
- 💬 Real-time messaging with Socket.io
- 👤 User profiles with photo upload
- 🔍 User search
- 👥 Group chats
- 📱 Responsive design (mobile-friendly)

### Messaging Features
- 📷 Image messages
- 🎬 Video messages
- 📎 File attachments
- 🎤 Voice messages
- 😀 Sticker packs
- ↩️ Reply to messages
- ↪️ Forward messages
- ✏️ Edit messages
- 🗑️ Delete messages (for me / for everyone)
- 🔍 Search messages in chat

### Additional Features
- 🟢 Online/Offline status
- ⌨️ Typing indicators
- ✅ Read receipts (double blue check)
- 📌 Pin chats
- 🔔 Unread message badges
- 🚫 Block users
- ⚙️ Settings page

## Tech Stack

### Backend
- Node.js + Express
- TypeScript
- Socket.io
- MongoDB + Mongoose
- JWT Authentication
- Multer (file uploads)

### Frontend
- React 18
- TypeScript
- Vite
- Socket.io-client
- React Router

## Installation

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/Madinabonu-009/TG-clone.git
cd TG-clone
```

2. Install dependencies:
```bash
npm install
cd client && npm install && cd ..
```

3. Create `.env` file in root directory:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

4. Run the application:
```bash
npm run dev
```

This will start both backend (port 3000) and frontend (port 5173).

## Project Structure

```
├── src/                    # Backend source
│   ├── config/            # Configuration
│   ├── db/                # Database connection
│   ├── middleware/        # Express middleware
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── socket/            # Socket.io handlers
│   └── server.ts          # Entry point
├── client/                 # Frontend source
│   ├── src/
│   │   ├── context/       # React contexts
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── styles/        # Global styles
│   └── index.html
├── uploads/               # Uploaded files
│   ├── images/
│   ├── videos/
│   ├── files/
│   └── voices/
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### Profile
- `GET /api/profile/me` - Get current user profile
- `PUT /api/profile/update` - Update profile
- `POST /api/profile/upload-photo` - Upload profile photo

### Users
- `GET /api/users/search` - Search users
- `POST /api/users/:id/block` - Block user
- `POST /api/users/:id/unblock` - Unblock user

### Chats
- `POST /api/chat/create` - Create private chat
- `GET /api/chat/my` - Get user's chats
- `POST /api/chat/group/create` - Create group chat
- `POST /api/chat/:id/pin` - Pin chat
- `POST /api/chat/:id/unpin` - Unpin chat

### Messages
- `GET /api/messages/:chatId` - Get messages
- `POST /api/messages/send` - Send text message
- `POST /api/messages/send-image` - Send image
- `POST /api/messages/send-video` - Send video
- `POST /api/messages/send-file` - Send file
- `POST /api/messages/send-voice` - Send voice message
- `POST /api/messages/reply` - Reply to message
- `POST /api/messages/forward` - Forward message
- `PUT /api/messages/edit/:id` - Edit message
- `DELETE /api/messages/delete/:id` - Delete message
- `GET /api/messages/search/:chatId` - Search messages

## Socket Events

### Client → Server
- `chat:join` - Join chat room
- `chat:leave` - Leave chat room
- `typing:start` - Start typing
- `typing:stop` - Stop typing

### Server → Client
- `message:new` - New message
- `message:edited` - Message edited
- `message:deleted` - Message deleted
- `messages:read` - Messages read
- `user:online` - User came online
- `user:offline` - User went offline
- `typing:update` - Typing status update

## License

MIT
