# Design Document: Telegram Clone

## Overview

The Telegram clone is a real-time messaging application built with a client-server architecture. The system uses WebSocket connections for real-time bidirectional communication, a REST API for standard operations, and a relational database for persistent storage. The architecture separates concerns into distinct layers: presentation (client), application logic (server), and data persistence (database).

The system prioritizes message delivery reliability, real-time performance, and data security. Key design decisions include using WebSocket for push notifications, JWT tokens for stateless authentication, and message queuing for offline delivery.

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│  Client Layer   │
│  (Web/Mobile)   │
└────────┬────────┘
         │
         │ WebSocket + REST API
         │
┌────────▼────────┐
│  Server Layer   │
│  - Auth Service │
│  - Message Svc  │
│  - Chat Service │
│  - WebSocket Mgr│
└────────┬────────┘
         │
         │ Database Queries
         │
┌────────▼────────┐
│  Data Layer     │
│  - PostgreSQL   │
│  - Message Queue│
└─────────────────┘
```

### Communication Patterns

1. **REST API**: Used for stateless operations (registration, login, chat creation, search)
2. **WebSocket**: Used for real-time message delivery and presence updates
3. **Message Queue**: Used for offline message storage and delivery retry

### Technology Stack

- **Backend**: Node.js with Express.js for REST API, Socket.io for WebSocket
- **Database**: PostgreSQL for relational data storage
- **Authentication**: JWT (JSON Web Tokens) for stateless authentication
- **Message Queue**: Redis for message queuing and caching
- **Client**: React for web interface (implementation flexible)

## Components and Interfaces

### 1. Authentication Service

**Responsibilities:**
- User registration with credential validation
- User login with password verification
- JWT token generation and validation
- Session management

**Interfaces:**

```typescript
interface AuthService {
  register(username: string, password: string): Promise<User>;
  login(username: string, password: string): Promise<AuthToken>;
  validateToken(token: string): Promise<User>;
  logout(userId: string): Promise<void>;
}

interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
  lastSeen: Date;
}

interface AuthToken {
  token: string;
  userId: string;
  expiresAt: Date;
}
```

### 2. Message Service

**Responsibilities:**
- Message creation and validation
- Message persistence
- Message retrieval and history
- Message search functionality

**Interfaces:**

```typescript
interface MessageService {
  sendMessage(senderId: string, conversationId: string, content: string): Promise<Message>;
  getMessageHistory(conversationId: string, limit?: number): Promise<Message[]>;
  searchMessages(userId: string, query: string, filters?: SearchFilters): Promise<Message[]>;
  deleteMessage(messageId: string, userId: string): Promise<void>;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  delivered: boolean;
}

interface SearchFilters {
  conversationId?: string;
  startDate?: Date;
  endDate?: Date;
}
```

### 3. Chat Service

**Responsibilities:**
- Private chat creation
- Group chat creation and management
- Participant management
- Conversation metadata

**Interfaces:**

```typescript
interface ChatService {
  createPrivateChat(user1Id: string, user2Id: string): Promise<Conversation>;
  createGroupChat(creatorId: string, participantIds: string[], name: string): Promise<Conversation>;
  addParticipant(conversationId: string, userId: string): Promise<void>;
  removeParticipant(conversationId: string, userId: string): Promise<void>;
  getConversation(conversationId: string): Promise<Conversation>;
  getUserConversations(userId: string): Promise<Conversation[]>;
}

interface Conversation {
  id: string;
  type: 'private' | 'group';
  name?: string;
  participantIds: string[];
  createdAt: Date;
  creatorId?: string;
}
```

### 4. WebSocket Manager

**Responsibilities:**
- WebSocket connection management
- Real-time message delivery
- Presence tracking
- Connection state management

**Interfaces:**

```typescript
interface WebSocketManager {
  handleConnection(userId: string, socket: WebSocket): void;
  handleDisconnection(userId: string): void;
  sendMessage(userId: string, message: Message): Promise<boolean>;
  broadcastToConversation(conversationId: string, message: Message): Promise<void>;
  updatePresence(userId: string, status: 'online' | 'offline'): void;
  getOnlineUsers(conversationId: string): Promise<string[]>;
}
```

### 5. Delivery Queue Service

**Responsibilities:**
- Queue messages for offline users
- Retry failed deliveries
- Deliver queued messages on reconnection

**Interfaces:**

```typescript
interface DeliveryQueueService {
  queueMessage(userId: string, message: Message): Promise<void>;
  getQueuedMessages(userId: string): Promise<Message[]>;
  clearQueue(userId: string): Promise<void>;
  retryFailedDeliveries(): Promise<void>;
}
```

## Data Models

### Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('private', 'group')),
  name VARCHAR(255),
  creator_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation participants table
CREATE TABLE conversation_participants (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (conversation_id, user_id)
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered BOOLEAN DEFAULT FALSE
);

-- Message queue table (for offline delivery)
CREATE TABLE message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  retry_count INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX idx_messages_conversation ON messages(conversation_id, timestamp);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_message_queue_user ON message_queue(user_id);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Authentication Properties

**Property 1: Registration creates valid user accounts**
*For any* unique username and valid password, registering should create a user account where the password is encrypted (not stored in plaintext).
**Validates: Requirements 1.1**

**Property 2: Registration and login round-trip**
*For any* unique username and valid password, registering a user and then logging in with those credentials should successfully establish a session.
**Validates: Requirements 1.2**

**Property 3: Invalid credentials are rejected**
*For any* invalid credentials (wrong username or wrong password), login attempts should be rejected with an error.
**Validates: Requirements 1.3**

**Property 4: Duplicate usernames are rejected**
*For any* existing username, attempting to register a new account with that username should be rejected with an error.
**Validates: Requirements 1.4**

**Property 5: Sessions have valid tokens**
*For any* established session, the system should generate an authentication token with a future expiration time.
**Validates: Requirements 1.5**

### Messaging Properties

**Property 6: Message persistence round-trip**
*For any* message sent by a user, the message should be immediately retrievable from storage with correct content, sender ID, timestamp, and conversation ID.
**Validates: Requirements 2.2, 4.1, 4.3**

**Property 7: Message history chronological ordering**
*For any* conversation with multiple messages, retrieving the message history should return all messages in chronological order (sorted by timestamp).
**Validates: Requirements 2.3, 4.2**

**Property 8: Empty messages are rejected**
*For any* string composed entirely of whitespace or empty content, attempting to send it as a message should be rejected and the conversation state should remain unchanged.
**Validates: Requirements 2.4**

**Property 9: Message delivery to online users**
*For any* user with an active session, when a message is sent to them, the system should deliver the message through their active connection.
**Validates: Requirements 2.1, 2.5, 5.2**

### Group Chat Properties

**Property 10: Group creation includes all participants**
*For any* list of user IDs, creating a group chat should result in a conversation where the participant list exactly matches the provided user IDs.
**Validates: Requirements 3.1**

**Property 11: Group messages delivered to all participants**
*For any* group chat and any message sent in that chat, the message should be delivered to all current participants.
**Validates: Requirements 3.2**

**Property 12: New participants access history from join time**
*For any* group chat, when a new user is added, that user should have access to messages from their join time forward, but not messages sent before they joined.
**Validates: Requirements 3.3**

**Property 13: Added participants receive future messages**
*For any* group chat, after adding a new participant, all subsequent messages should be delivered to that participant.
**Validates: Requirements 3.4**

**Property 14: Removed participants stop receiving messages**
*For any* group chat, after removing a participant, that user should not receive any subsequent messages from that conversation.
**Validates: Requirements 3.5**

### Persistence Properties

**Property 15: Reconnection preserves message access**
*For any* user, after disconnecting and reconnecting, all previously sent and received messages should remain accessible.
**Validates: Requirements 4.4**

### Real-time Delivery Properties

**Property 16: Active sessions maintain connections**
*For any* user with an active session, the system should maintain a persistent WebSocket connection for that user.
**Validates: Requirements 5.1**

**Property 17: Offline message queuing**
*For any* user without an active session, messages sent to them should be queued and delivered in chronological order when they reconnect.
**Validates: Requirements 5.3, 5.4**

### Presence Properties

**Property 18: Session establishment sets online status**
*For any* user, establishing a session should set their status to "online".
**Validates: Requirements 6.1**

**Property 19: Session termination sets offline status**
*For any* user, ending their session should set their status to "offline" and update their last seen timestamp.
**Validates: Requirements 6.2**

**Property 20: Conversation participants have retrievable status**
*For any* conversation, retrieving participant information should include the current online/offline status of each participant.
**Validates: Requirements 6.3**

**Property 21: Status changes trigger notifications**
*For any* user whose status changes, all other users in shared conversations should receive a status update notification.
**Validates: Requirements 6.4**

### Search Properties

**Property 22: Search results contain query text**
*For any* search query, all returned messages should contain the query text in their content.
**Validates: Requirements 7.1**

**Property 23: Search results include complete metadata**
*For any* search result, the returned message should include content, sender information, timestamp, and conversation context.
**Validates: Requirements 7.2**

**Property 24: Conversation filter returns only matching messages**
*For any* conversation ID filter, all returned messages should belong to that specific conversation.
**Validates: Requirements 7.3**

**Property 25: Date range filter returns only messages in range**
*For any* date range filter, all returned messages should have timestamps within the specified start and end dates.
**Validates: Requirements 7.4**

### Security Properties

**Property 26: Passwords are hashed**
*For any* user password, the stored value in the database should be a hash that differs from the plaintext password.
**Validates: Requirements 8.1**

**Property 27: Unauthenticated requests are rejected**
*For any* data access request without a valid authentication token, the system should reject the request.
**Validates: Requirements 8.3**

**Property 28: Expired tokens are rejected**
*For any* authentication token past its expiration time, access requests using that token should be rejected.
**Validates: Requirements 8.4**

**Property 29: Session termination invalidates tokens**
*For any* user session, after termination, all authentication tokens associated with that session should become invalid and reject subsequent requests.
**Validates: Requirements 8.5**

## Error Handling

### Error Categories

1. **Authentication Errors**
   - Invalid credentials (401 Unauthorized)
   - Expired tokens (401 Unauthorized)
   - Duplicate username (409 Conflict)
   - Missing authentication (401 Unauthorized)

2. **Validation Errors**
   - Empty message content (400 Bad Request)
   - Invalid user IDs (404 Not Found)
   - Invalid conversation IDs (404 Not Found)
   - Malformed requests (400 Bad Request)

3. **Authorization Errors**
   - User not in conversation (403 Forbidden)
   - Insufficient permissions (403 Forbidden)

4. **System Errors**
   - Database connection failures (503 Service Unavailable)
   - Message delivery failures (500 Internal Server Error)
   - WebSocket connection errors (500 Internal Server Error)

### Error Handling Strategies

1. **Graceful Degradation**: When real-time delivery fails, fall back to message queuing
2. **Retry Logic**: Implement exponential backoff for failed database operations (max 3 retries)
3. **User Feedback**: Return clear, actionable error messages to clients
4. **Logging**: Log all errors with context (user ID, operation, timestamp) for debugging
5. **Circuit Breaker**: Temporarily disable failing services to prevent cascade failures

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
  requestId: string;
}
```

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases for individual components:

- **Authentication Service**: Test registration with various username/password combinations, login success/failure cases, token generation
- **Message Service**: Test message creation, empty message rejection, message retrieval
- **Chat Service**: Test private chat creation, group chat creation, participant management
- **Search**: Test query parsing, filter application, empty result handling

Unit tests will use Jest as the testing framework with the following structure:
- Test files co-located with source files using `.test.ts` suffix
- Mock database connections using in-memory implementations
- Mock WebSocket connections for testing real-time features

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using **fast-check** library for JavaScript/TypeScript:

- Each property-based test will run a minimum of **100 iterations** with randomly generated inputs
- Each test will be tagged with a comment referencing the specific correctness property from this design document
- Tag format: `// Feature: telegram-clone, Property {number}: {property_text}`
- Each correctness property will be implemented by a SINGLE property-based test

**Property Test Coverage:**

- **Authentication**: Properties 1-5 (registration, login, token validation)
- **Messaging**: Properties 6-9 (persistence, ordering, validation, delivery)
- **Group Chats**: Properties 10-14 (creation, delivery, participant management)
- **Persistence**: Property 15 (reconnection)
- **Real-time**: Properties 16-17 (connections, queuing)
- **Presence**: Properties 18-21 (status management)
- **Search**: Properties 22-25 (query matching, filtering)
- **Security**: Properties 26-29 (hashing, authentication, authorization)

### Integration Testing

Integration tests will verify component interactions:

- End-to-end message flow (send → store → deliver)
- Authentication flow (register → login → access protected resources)
- Real-time delivery with actual WebSocket connections
- Database operations with test database instance

### Test Data Generation

For property-based tests, we will generate:
- Random usernames (alphanumeric, 3-20 characters)
- Random passwords (various lengths and character sets)
- Random message content (including edge cases: empty, very long, special characters)
- Random user ID sets for group creation
- Random timestamps for date range testing
- Random search queries

### Testing Tools

- **Jest**: Unit and integration testing framework
- **fast-check**: Property-based testing library
- **Supertest**: HTTP API testing
- **Socket.io-client**: WebSocket testing
- **pg-mem**: In-memory PostgreSQL for testing

## Performance Considerations

### Scalability

1. **Horizontal Scaling**: Stateless server design allows multiple server instances behind load balancer
2. **Database Indexing**: Indexes on frequently queried fields (conversation_id, user_id, timestamp)
3. **Connection Pooling**: Reuse database connections to reduce overhead
4. **Message Pagination**: Limit message history queries to prevent large result sets

### Caching Strategy

1. **User Sessions**: Cache active sessions in Redis for fast authentication
2. **Online Status**: Cache user presence in Redis to avoid database queries
3. **Recent Messages**: Cache recent conversation messages for quick retrieval

### Real-time Performance

1. **WebSocket Optimization**: Use binary protocols for message serialization
2. **Message Batching**: Batch multiple messages to same user when possible
3. **Selective Broadcasting**: Only send messages to active connections

### Monitoring

1. **Metrics**: Track message delivery latency, connection count, database query time
2. **Alerts**: Alert on delivery failures, high error rates, database connection issues
3. **Logging**: Structured logging with correlation IDs for request tracing

## Security Considerations

### Authentication Security

1. **Password Hashing**: Use bcrypt with salt rounds of 10
2. **Token Security**: JWT tokens with 24-hour expiration
3. **Token Refresh**: Implement refresh token mechanism for extended sessions

### Data Security

1. **SQL Injection Prevention**: Use parameterized queries exclusively
2. **XSS Prevention**: Sanitize message content before storage and display
3. **Rate Limiting**: Limit API requests per user (100 requests/minute)

### Transport Security

1. **HTTPS**: All REST API calls over HTTPS
2. **WSS**: WebSocket connections over secure WebSocket (WSS)
3. **CORS**: Configure CORS to allow only trusted origins

## Deployment Architecture

### Development Environment

- Local PostgreSQL instance
- Local Redis instance
- Node.js development server with hot reload

### Production Environment

- **Application Servers**: Multiple Node.js instances behind load balancer
- **Database**: PostgreSQL with replication (primary + read replicas)
- **Cache**: Redis cluster for session and presence data
- **Load Balancer**: Nginx for HTTP/WebSocket load balancing
- **Monitoring**: Prometheus + Grafana for metrics and dashboards

### Environment Configuration

Configuration managed through environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret key for JWT signing
- `PORT`: Server port
- `NODE_ENV`: Environment (development/production)
