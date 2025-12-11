// In-memory store for development when MongoDB is not available
import { v4 as uuidv4 } from 'uuid';

interface MemoryUser {
  _id: string;
  username: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  bio: string;
  photoUrl: string | null;
  createdAt: Date;
  lastSeen: Date;
}

interface MemoryToken {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
}

interface MemoryChat {
  _id: string;
  type: 'private' | 'group';
  participants: string[];
  admins?: string[];
  name?: string;
  description?: string;
  photoUrl?: string;
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: Date;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

class MemoryStore {
  private users: Map<string, MemoryUser> = new Map();
  private tokens: Map<string, MemoryToken> = new Map();
  private chats: Map<string, MemoryChat> = new Map();

  // User operations
  async createUser(data: Omit<MemoryUser, '_id' | 'createdAt' | 'lastSeen'>): Promise<MemoryUser> {
    const user: MemoryUser = {
      _id: uuidv4(),
      ...data,
      createdAt: new Date(),
      lastSeen: new Date()
    };
    this.users.set(user._id, user);
    return user;
  }

  async findUserById(id: string): Promise<MemoryUser | null> {
    return this.users.get(id) || null;
  }

  async findUserByUsername(username: string): Promise<MemoryUser | null> {
    for (const user of this.users.values()) {
      if (user.username.toLowerCase() === username.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  async updateUser(id: string, data: Partial<MemoryUser>): Promise<MemoryUser | null> {
    const user = this.users.get(id);
    if (!user) return null;
    Object.assign(user, data);
    return user;
  }

  async searchUsers(query: string, excludeId?: string): Promise<MemoryUser[]> {
    const results: MemoryUser[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const user of this.users.values()) {
      if (excludeId && user._id === excludeId) continue;
      if (
        user.username.toLowerCase().includes(lowerQuery) ||
        user.firstName.toLowerCase().includes(lowerQuery) ||
        user.lastName.toLowerCase().includes(lowerQuery)
      ) {
        results.push(user);
      }
    }
    return results.slice(0, 20);
  }

  async getAllUsers(excludeId?: string): Promise<MemoryUser[]> {
    const results: MemoryUser[] = [];
    for (const user of this.users.values()) {
      if (excludeId && user._id === excludeId) continue;
      results.push(user);
    }
    return results.slice(0, 50);
  }

  // Token operations
  async addTokenToBlacklist(tokenHash: string, userId: string, expiresAt: Date): Promise<void> {
    this.tokens.set(tokenHash, { tokenHash, userId, expiresAt });
  }

  async isTokenBlacklisted(tokenHash: string): Promise<boolean> {
    return this.tokens.has(tokenHash);
  }

  // Chat operations
  async createChat(data: Omit<MemoryChat, '_id' | 'createdAt' | 'updatedAt'>): Promise<MemoryChat> {
    const chat: MemoryChat = {
      _id: uuidv4(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.chats.set(chat._id, chat);
    return chat;
  }

  async findChatById(id: string): Promise<MemoryChat | null> {
    return this.chats.get(id) || null;
  }

  async findPrivateChat(userId1: string, userId2: string): Promise<MemoryChat | null> {
    for (const chat of this.chats.values()) {
      if (chat.type === 'private' &&
          chat.participants.includes(userId1) &&
          chat.participants.includes(userId2)) {
        return chat;
      }
    }
    return null;
  }

  async getUserChats(userId: string): Promise<MemoryChat[]> {
    const results: MemoryChat[] = [];
    for (const chat of this.chats.values()) {
      if (chat.participants.includes(userId)) {
        results.push(chat);
      }
    }
    return results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateChat(id: string, data: Partial<MemoryChat>): Promise<MemoryChat | null> {
    const chat = this.chats.get(id);
    if (!chat) return null;
    Object.assign(chat, data, { updatedAt: new Date() });
    return chat;
  }
}

export const memoryStore = new MemoryStore();
