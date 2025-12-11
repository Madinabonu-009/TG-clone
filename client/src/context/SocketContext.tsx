import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

export interface MessageData {
  id: string;
  chatId: string;
  senderId: string;
  sender: {
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
  };
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  voiceUrl?: string;
  voiceDuration?: number;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  type: string;
  status: string;
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
    sender?: any;
  };
  forwardedFrom?: {
    chatId: string;
    messageId: string;
    senderName: string;
  };
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MessagesReadData {
  chatId: string;
  readBy: string;
}

interface MessageEditedData {
  messageId: string;
  chatId: string;
  text: string;
  isEdited: boolean;
  editedAt: string;
}

interface MessageDeletedData {
  messageId: string;
  chatId: string;
  forEveryone: boolean;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
  typingInChat: Map<string, string[]>;
  lastSeenMap: Map<string, string>;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  startTyping: (chatId: string) => void;
  stopTyping: (chatId: string) => void;
  isUserOnline: (userId: string) => boolean;
  isUserTypingInChat: (chatId: string, userId: string) => boolean;
  getUserLastSeen: (userId: string) => string | null;
  onNewMessage: (callback: (message: MessageData) => void) => () => void;
  onMessagesRead: (callback: (data: MessagesReadData) => void) => () => void;
  onMessageEdited: (callback: (data: MessageEditedData) => void) => () => void;
  onMessageDeleted: (callback: (data: MessageDeletedData) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingInChat, setTypingInChat] = useState<Map<string, string[]>>(new Map());
  const [lastSeenMap, setLastSeenMap] = useState<Map<string, string>>(new Map());
  const onlineUsersRef = useRef<Set<string>>(new Set());
  const typingUsersRef = useRef<Map<string, Set<string>>>(new Map());
  const lastSeenRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers([]);
        onlineUsersRef.current = new Set();
      }
      return;
    }

    // Use current origin for production, localhost for development
    const socketUrl = import.meta.env.PROD 
      ? window.location.origin 
      : 'http://localhost:3000';
    
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    // Initial online users list
    newSocket.on('users:online', (userIds: string[]) => {
      console.log('Received online users:', userIds);
      onlineUsersRef.current = new Set(userIds);
      setOnlineUsers([...userIds]);
    });

    // User came online
    newSocket.on('user:online', (data: { userId: string }) => {
      console.log('User came online:', data.userId);
      onlineUsersRef.current.add(data.userId);
      setOnlineUsers(Array.from(onlineUsersRef.current));
    });

    // User went offline
    newSocket.on('user:offline', (data: { userId: string; lastSeen?: string }) => {
      console.log('User went offline:', data.userId, 'lastSeen:', data.lastSeen);
      onlineUsersRef.current.delete(data.userId);
      setOnlineUsers(Array.from(onlineUsersRef.current));
      
      // Update lastSeen
      if (data.lastSeen) {
        lastSeenRef.current.set(data.userId, data.lastSeen);
        setLastSeenMap(new Map(lastSeenRef.current));
      }
    });

    // Typing status update
    newSocket.on('typing:update', (data: { chatId: string; userId: string; isTyping: boolean }) => {
      console.log('Typing update received:', data);
      
      if (!typingUsersRef.current.has(data.chatId)) {
        typingUsersRef.current.set(data.chatId, new Set());
      }
      
      const chatTypers = typingUsersRef.current.get(data.chatId)!;
      
      if (data.isTyping) {
        chatTypers.add(data.userId);
      } else {
        chatTypers.delete(data.userId);
      }
      
      // Update state to trigger re-render
      const newMap = new Map<string, string[]>();
      typingUsersRef.current.forEach((users, chatId) => {
        newMap.set(chatId, Array.from(users));
      });
      setTypingInChat(newMap);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const joinChat = useCallback((chatId: string) => {
    if (socket?.connected) {
      console.log('Joining chat room:', chatId);
      socket.emit('chat:join', chatId);
    }
  }, [socket]);

  const leaveChat = useCallback((chatId: string) => {
    if (socket?.connected) {
      console.log('Leaving chat room:', chatId);
      socket.emit('chat:leave', chatId);
    }
  }, [socket]);

  const startTyping = useCallback((chatId: string) => {
    if (socket?.connected) {
      console.log('Emitting typing:start for chat:', chatId);
      socket.emit('typing:start', chatId);
    }
  }, [socket]);

  const stopTyping = useCallback((chatId: string) => {
    if (socket?.connected) {
      console.log('Emitting typing:stop for chat:', chatId);
      socket.emit('typing:stop', chatId);
    }
  }, [socket]);

  const isUserOnline = useCallback((userId: string) => {
    const result = onlineUsers.includes(userId);
    console.log('Checking online status for:', userId, 'Online users:', onlineUsers, 'Result:', result);
    return result;
  }, [onlineUsers]);

  const isUserTypingInChat = useCallback((chatId: string, userId: string) => {
    const typers = typingInChat.get(chatId);
    const result = typers?.includes(userId) || false;
    console.log('Checking typing status for:', userId, 'in chat:', chatId, 'Typers:', typers, 'Result:', result);
    return result;
  }, [typingInChat]);

  const getUserLastSeen = useCallback((userId: string) => {
    return lastSeenMap.get(userId) || null;
  }, [lastSeenMap]);

  const onNewMessage = useCallback((callback: (message: MessageData) => void) => {
    if (!socket) return () => {};
    
    const handler = (message: MessageData) => {
      console.log('New message received:', message);
      callback(message);
    };
    
    socket.on('message:new', handler);
    
    return () => {
      socket.off('message:new', handler);
    };
  }, [socket]);

  const onMessagesRead = useCallback((callback: (data: MessagesReadData) => void) => {
    if (!socket) return () => {};
    
    const handler = (data: MessagesReadData) => {
      console.log('Messages read:', data);
      callback(data);
    };
    
    socket.on('messages:read', handler);
    
    return () => {
      socket.off('messages:read', handler);
    };
  }, [socket]);

  const onMessageEdited = useCallback((callback: (data: MessageEditedData) => void) => {
    if (!socket) return () => {};
    
    const handler = (data: MessageEditedData) => {
      console.log('Message edited:', data);
      callback(data);
    };
    
    socket.on('message:edited', handler);
    
    return () => {
      socket.off('message:edited', handler);
    };
  }, [socket]);

  const onMessageDeleted = useCallback((callback: (data: MessageDeletedData) => void) => {
    if (!socket) return () => {};
    
    const handler = (data: MessageDeletedData) => {
      console.log('Message deleted:', data);
      callback(data);
    };
    
    socket.on('message:deleted', handler);
    
    return () => {
      socket.off('message:deleted', handler);
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      onlineUsers,
      typingInChat,
      lastSeenMap,
      joinChat,
      leaveChat,
      startTyping,
      stopTyping,
      isUserOnline,
      isUserTypingInChat,
      getUserLastSeen,
      onNewMessage,
      onMessagesRead,
      onMessageEdited,
      onMessageDeleted
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
