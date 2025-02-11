# BitChat Messaging Feature Requirements

## 1. Overview

The messaging feature enables users to engage in real-time conversations with integrated Bitcoin payments through Nostr protocol, combining social messaging with seamless payment capabilities.

## 2. Core Functionality

### 2.1 Conversation Management

- [x] Create new conversations through user search
- [x] Support one-on-one conversations
- [ ] Group chat support
- [x] Display conversation history
- [x] Real-time message updates
- [x] Message status tracking (sent, delivered, read)
- [x] Proper participant data handling
- [ ] Split payment capabilities
- [ ] Payment coordination features

### 2.2 Message Types

- [x] Text messages
- [x] Payment requests
- [x] Payment confirmations
- [x] System messages
- [ ] Rich media support
- [ ] Message reactions
- [ ] Payment acknowledgments
- [ ] Payment templates
- [ ] Message scheduling

### 2.3 AI Integration

- [ ] Natural Language Processing
  - [ ] Automatic payment detection
  - [ ] Amount recognition
  - [ ] Intent identification (send/request)
  - [ ] Context understanding
- [ ] Smart Suggestions
  - [ ] Payment action prompts
  - [ ] Pre-filled payment forms
  - [ ] Contextual recommendations
  - [ ] Payment history integration

### 2.4 User Interface

- [x] Clean, modern dark theme design
- [x] Message bubbles with sender indication
- [x] Timestamp display
- [x] Loading states and animations
- [x] Responsive layout
- [x] Back navigation
- [x] Scroll to bottom functionality
- [x] Empty state handling
- [ ] Payment suggestion bubbles
- [ ] Quick action buttons
- [ ] Transaction receipts
- [ ] Interactive Bitcoin amounts

## 3. Technical Requirements

### 3.1 Data Models

```typescript
// Enhanced Conversation Model
interface Conversation {
  participants: Id<"users">[];
  lastMessageId?: Id<"messages">;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  status: "active" | "archived" | "blocked";
  metadata: {
    name?: string;
    isGroup: boolean;
    createdBy: Id<"users">;
    paymentHistory?: PaymentHistory;
    settings?: ChatSettings;
  };
}

// Enhanced Message Model
interface Message {
  id: string;
  type: "text" | "payment" | "request" | "system";
  conversationId: Id<"conversations">;
  senderId: Id<"users">;
  content: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
  paymentData?: {
    type: "send" | "request";
    amount: number;
    status: "pending" | "completed" | "failed";
    network: "lightning" | "onchain";
  };
  metadata: {
    replyTo?: Id<"messages">;
    attachments?: string[];
    reactions?: { userId: Id<"users">; type: string }[];
    aiDetection?: PaymentDetection;
  };
}

// New Payment Detection Model
interface PaymentDetection {
  confidence: number;
  type: "send" | "request";
  amount?: number;
  currency: "BTC" | "SATS";
  context: string;
  participants: string[];
}
```

### 3.2 API Endpoints

- [x] `getOrCreateConversation`: Create or retrieve existing conversation
- [x] `getMessages`: Fetch messages for a conversation
- [x] `sendMessage`: Send a new message
- [x] `markMessagesAsRead`: Update message read status
- [x] `getOtherParticipant`: Get conversation participant details
- [x] `searchUsers`: Search for users to start conversations
- [ ] `processPaymentIntent`: Handle AI-detected payment intents
- [ ] `generatePaymentSuggestion`: Create smart payment suggestions
- [ ] `getPaymentHistory`: Retrieve payment history for a conversation
- [ ] `createGroupChat`: Set up multi-participant conversations
- [ ] `manageGroupMembers`: Handle group participant management

### 3.3 Nostr Integration

- [ ] Message encryption/decryption
- [ ] Event relay management
- [ ] Contact discovery
- [ ] Key management
- [ ] Message signing
- [ ] Event verification
- [ ] Relay redundancy
- [ ] Privacy features

### 3.4 Payment Processing

- [ ] Lightning Network integration
- [ ] On-chain transaction support
- [ ] Fee calculation
- [ ] Route optimization
- [ ] Transaction signing
- [ ] Payment status tracking
- [ ] Receipt generation
- [ ] Error handling

## 4. Security & Privacy

### 4.1 Message Security

- [ ] End-to-end encryption
- [ ] Message signing
- [ ] Private chat support
- [ ] Secure group messages

### 4.2 Payment Security

- [ ] Amount validation
- [ ] Transaction confirmation
- [ ] Fraud prevention
- [ ] Error prevention
- [ ] Secure key management

## 5. Performance Requirements

- [x] Message pagination (50 messages per load)
- [x] Optimistic updates for sent messages
- [x] Efficient participant data loading
- [x] Real-time message delivery
- [x] Debounced search queries (300ms)
- [ ] Message archiving
- [ ] History compression
- [ ] Cache management
- [ ] Relay optimization

## 6. Error Handling

- [x] Network failure recovery
- [x] Invalid conversation handling
- [x] Message send failure handling
- [x] User not found scenarios
- [x] Authentication errors
- [x] Loading state management
- [ ] Payment failure recovery
- [ ] Relay connection issues
- [ ] Encryption failures
- [ ] Transaction errors

## 7. Testing Requirements

- [ ] Unit Tests
  - [ ] Message encryption/decryption
  - [ ] Payment detection accuracy
  - [ ] State management
  - [ ] Error handling
- [ ] Integration Tests
  - [ ] Nostr relay communication
  - [ ] Payment processing
  - [ ] AI detection system
  - [ ] User interactions
- [ ] E2E Tests
  - [ ] Complete conversation flows
  - [ ] Payment scenarios
  - [ ] Group chat functionality
  - [ ] Error recovery

## 8. Success Metrics

- [ ] Message delivery success rate
- [ ] Payment processing success rate
- [ ] AI suggestion accuracy
- [ ] User engagement metrics
- [ ] Performance metrics
- [ ] Error rate tracking
- [ ] User satisfaction metrics

## 9. Documentation Requirements

- [ ] API documentation
- [ ] Component documentation
- [ ] State management flows
- [ ] Error handling procedures
- [ ] Security practices
- [ ] User guides
- [ ] Integration guides
- [ ] Testing procedures

## 10. State Management

### 10.1 Server State (Convex)

- [x] Real-time conversation updates
  - Participants
  - Last message
  - Message status
  - Unread counts
- [x] Message synchronization
  - Message ordering
  - Delivery status
  - Read receipts
- [x] User presence and status
- [ ] Payment state tracking
  - Transaction status
  - Payment confirmations
  - Lightning invoice states
- [ ] Group chat state
  - Member list
  - Admin permissions
  - Chat settings

### 10.2 Client State (React)

- [x] UI State Management
  - Message input
  - Loading states
  - Error states
  - Search queries
  - Pagination cursors
- [x] Navigation State
  - Current conversation
  - Chat history
  - Return paths
- [x] Form States
  - Message composition
  - Search input
  - Payment forms
- [ ] Cache Management
  - Message history
  - User profiles
  - Payment history
  - Conversation list

### 10.3 Shared State

- [x] Authentication State
  - User session
  - Permissions
  - Role-based access
- [ ] Payment State
  - Wallet connection
  - Balance updates
  - Transaction history
- [ ] Notification State
  - Message alerts
  - Payment notifications
  - System messages
- [ ] Sync State
  - Offline support
  - Message queue
  - Retry mechanisms

### 10.4 State Update Patterns

- [x] Optimistic Updates
  - Message sending
  - Status changes
  - Read receipts
- [x] Real-time Subscriptions
  - New messages
  - Conversation updates
  - User status
- [ ] Background Updates
  - Payment processing
  - Message encryption
  - Cache invalidation
- [ ] Error Recovery
  - Network failures
  - Payment failures
  - State reconciliation

### 10.5 Performance Considerations

- [x] State Normalization
  - Conversation entities
  - Message entities
  - User entities
- [x] Update Batching
  - Message status
  - Read receipts
  - User presence
- [x] Memory Management
  - Message pagination
  - History cleanup
  - Cache eviction
- [ ] State Persistence
  - Offline data
  - User preferences
  - Session recovery

### 10.6 View State Management

#### Messages List View (`Messages.tsx`)

- [x] Conversation List State
  - Recent conversations query
  - Unread message counts
  - Last message preview
  - Participant information
- [x] Search State
  - User search results
  - Debounced queries (300ms)
  - Loading states
  - Empty states
- [x] Navigation State
  - New conversation creation
  - Existing conversation selection
  - Return path handling

#### Single Message View (`Message.tsx`)

- [x] Conversation State
  - Message history
  - Participant details
  - Real-time updates
  - Message status
- [x] Input State
  - Message composition
  - Send status
  - Loading states
  - Error handling
- [x] UI State
  - Scroll position
  - Read receipts
  - Loading indicators
  - Error messages

#### View Interactions

- [x] State Sharing
  - Conversation metadata
  - Participant information
  - Message counts
  - Read status
- [x] State Updates
  - Real-time message delivery
  - Status synchronization
  - Unread count updates
  - Participant status
- [x] Navigation Flow
  - URL parameters
  - History management
  - Deep linking
  - Back navigation
- [ ] Optimizations
  - State preservation
  - View recycling
  - Transition animations
  - Prefetching

## 11. Implementation Status

Current implementation focuses on core messaging functionality:

- Basic one-on-one conversations
- Text message support
- Message status tracking
- User search and conversation creation
- Basic UI components

Next phase will prioritize:

1. Payment integration features
2. AI-powered suggestions
3. Enhanced security measures
4. Group chat capabilities

## 12. Related Documentation

- See `messages-masterplan.md`
