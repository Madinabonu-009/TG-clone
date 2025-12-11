// User interfaces
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
  lastSeen: Date;
}

export interface UserPublic {
  id: string;
  username: string;
  createdAt: Date;
  lastSeen: Date;
}

// Auth interfaces
export interface AuthToken {
  token: string;
  userId: string;
  expiresAt: Date;
}

export interface LoginResponse {
  user: UserPublic;
  token: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

// Message interfaces
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  delivered: boolean;
}

// Conversation interfaces
export interface Conversation {
  id: string;
  type: 'private' | 'group';
  name?: string;
  participantIds: string[];
  createdAt: Date;
  creatorId?: string;
}

// Search interfaces
export interface SearchFilters {
  conversationId?: string;
  startDate?: Date;
  endDate?: Date;
}

// Error interfaces
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: Date;
  requestId: string;
}

// Service interfaces
export interface IAuthService {
  register(username: string, password: string): Promise<UserPublic>;
  login(username: string, password: string): Promise<LoginResponse>;
  validateToken(tokenStr: string): Promise<UserPublic>;
  logout(userId: string, tokenStr: string): Promise<void>;
}
