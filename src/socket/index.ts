import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { config } from '../config';
import { User } from '../models/User';

// Store online users: userId -> Set of socketIds
const onlineUsers = new Map<string, Set<string>>();
// Store socketId -> userId mapping
const socketToUser = new Map<string, string>();
// Store typing status: chatId -> Set of userIds
const typingUsers = new Map<string, Set<string>>();

let io: Server;

export function initializeSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const payload = verifyToken(token);
    if (!payload) {
      return next(new Error('Invalid token'));
    }

    socket.data.userId = payload.userId;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;
    console.log('User connected:', userId, 'Socket:', socket.id);

    // Add user to online users
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);
    socketToUser.set(socket.id, userId);

    // Broadcast user online status to all other users
    socket.broadcast.emit('user:online', { userId });
    console.log('Broadcasted user:online for:', userId);

    // Send current online users to the connected user
    const onlineUserIds = Array.from(onlineUsers.keys());
    socket.emit('users:online', onlineUserIds);
    console.log('Sent online users list:', onlineUserIds);

    // Join user's personal room
    socket.join('user:' + userId);

    // Handle joining a chat room
    socket.on('chat:join', (chatId: string) => {
      socket.join('chat:' + chatId);
      console.log('User', userId, 'joined chat', chatId);
    });

    // Handle leaving a chat room
    socket.on('chat:leave', (chatId: string) => {
      socket.leave('chat:' + chatId);
      if (typingUsers.has(chatId)) {
        typingUsers.get(chatId)!.delete(userId);
      }
    });

    // Handle typing start
    socket.on('typing:start', (chatId: string) => {
      console.log('Typing start:', userId, 'in chat:', chatId);
      if (!typingUsers.has(chatId)) {
        typingUsers.set(chatId, new Set());
      }
      typingUsers.get(chatId)!.add(userId);
      socket.to('chat:' + chatId).emit('typing:update', {
        chatId,
        userId,
        isTyping: true
      });
    });

    // Handle typing stop
    socket.on('typing:stop', (chatId: string) => {
      console.log('Typing stop:', userId, 'in chat:', chatId);
      if (typingUsers.has(chatId)) {
        typingUsers.get(chatId)!.delete(userId);
      }
      socket.to('chat:' + chatId).emit('typing:update', {
        chatId,
        userId,
        isTyping: false
      });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log('User disconnected:', userId, 'Socket:', socket.id);
      
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          
          // Update lastSeen in database
          const lastSeen = new Date();
          try {
            await User.findByIdAndUpdate(userId, { lastSeen });
          } catch (err) {
            console.error('Failed to update lastSeen:', err);
          }
          
          // Broadcast to ALL connected sockets with lastSeen
          io.emit('user:offline', { userId, lastSeen: lastSeen.toISOString() });
          console.log('Broadcasted user:offline for:', userId);
        }
      }
      socketToUser.delete(socket.id);

      // Clear typing status
      for (const [chatId, users] of typingUsers) {
        if (users.has(userId)) {
          users.delete(userId);
          io.to('chat:' + chatId).emit('typing:update', {
            chatId,
            userId,
            isTyping: false
          });
        }
      }
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

export function getOnlineUsers(): string[] {
  return Array.from(onlineUsers.keys());
}
