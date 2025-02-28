# WalletFlow Schema Improvements Technical Specification

## Overview

This document outlines comprehensive schema improvements for the WalletFlow application, focusing on efficient state management, real-time synchronization, and proper relationship tracking across all major entities.

## Core Tables

### 1. Accounts Table

```typescript
accounts: defineTable({
  // Core Account Data
  userId: v.id("users"),
  name: v.string(),
  type: v.union(
    v.literal("personal"),
    v.literal("business"),
    v.literal("institutional")
  ),

  // State Management
  status: v.union(
    v.literal("active"),
    v.literal("suspended"),
    v.literal("pending_verification"),
    v.literal("locked")
  ),

  // Relationships
  wallets: v.array(v.id("wallets")),
  defaultWalletId: v.optional(v.id("wallets")),

  // Preferences
  preferences: v.object({
    defaultCurrency: v.string(),
    notificationSettings: v.object({
      email: v.boolean(),
      push: v.boolean(),
      inApp: v.boolean(),
    }),
    displaySettings: v.object({
      timezone: v.string(),
      dateFormat: v.string(),
      numberFormat: v.string(),
    }),
  }),

  // Metadata
  metadata: v.object({
    lastActive: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
    verificationStatus: v.union(
      v.literal("unverified"),
      v.literal("pending"),
      v.literal("verified")
    ),
  }),
});
```

### 2. Messages Table

```typescript
messages: defineTable({
  // Core Message Data
  conversationId: v.id("conversations"),

  // Participant Context
  sender: v.object({
    userId: v.id("users"),
    accountId: v.id("accounts"),
    walletId: v.optional(v.id("wallets")),
  }),
  recipient: v.object({
    userId: v.id("users"),
    accountId: v.id("accounts"),
    walletId: v.optional(v.id("wallets")),
  }),

  // Message Classification
  type: v.union(
    v.literal("text"),
    v.literal("payment_request"),
    v.literal("payment_sent"),
    v.literal("payment_received"),
    v.literal("request_response"),
    v.literal("system")
  ),

  // Visibility and Access Control
  visibility: v.object({
    mode: v.union(
      v.literal("both"),
      v.literal("sender_only"),
      v.literal("recipient_only")
    ),
    expiresAt: v.optional(v.string()),
    conditions: v.optional(v.array(v.string())),
  }),

  // Related Entities
  relationships: v.object({
    paymentRequest: v.optional(
      v.object({
        id: v.id("paymentRequests"),
        status: v.string(),
      })
    ),
    payment: v.optional(
      v.object({
        id: v.id("payments"),
        status: v.string(),
      })
    ),
    notifications: v.array(v.id("notifications")),
  }),

  // Status Tracking
  participantStatus: v.object({
    [v.string()]: v.object({
      // userId as key
      readAt: v.optional(v.string()),
      deliveredAt: v.optional(v.string()),
      actionsAvailable: v.array(v.string()),
    }),
  }),

  // Content and Metadata
  content: v.union(
    v.object({
      type: v.literal("text"),
      text: v.string(),
    }),
    v.object({
      type: v.literal("payment_request"),
      data: v.object({
        amount: v.number(),
        currency: v.string(),
        description: v.string(),
        expiresAt: v.string(),
      }),
    }),
    v.object({
      type: v.literal("payment"),
      data: v.object({
        amount: v.number(),
        currency: v.string(),
        status: v.string(),
      }),
    })
  ),
});
```

### 3. Payment Requests Table

```typescript
paymentRequests: defineTable({
  // Request Context
  requesterId: v.id("users"),
  requesterAccountId: v.id("accounts"),
  requesterWalletId: v.id("wallets"),
  recipientId: v.id("users"),
  recipientAccountId: v.id("accounts"),
  recipientWalletId: v.optional(v.id("wallets")),

  // Payment Details
  amount: v.number(),
  currency: v.string(),
  description: v.string(),

  // Status Management
  status: v.union(
    v.literal("draft"),
    v.literal("pending"),
    v.literal("approved"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("declined"),
    v.literal("cancelled"),
    v.literal("expired"),
    v.literal("failed")
  ),

  // Lifecycle Tracking
  lifecycle: v.object({
    createdAt: v.string(),
    updatedAt: v.string(),
    expiresAt: v.string(),
    completedAt: v.optional(v.string()),
    statusHistory: v.array(
      v.object({
        status: v.string(),
        timestamp: v.string(),
        reason: v.optional(v.string()),
      })
    ),
  }),

  // Related Entities
  relationships: v.object({
    messageId: v.id("messages"),
    paymentId: v.optional(v.id("payments")),
    notificationIds: v.array(v.id("notifications")),
  }),

  // Participant Views
  participantViews: v.object({
    requester: v.object({
      displayStatus: v.string(),
      availableActions: v.array(v.string()),
      notificationPreferences: v.object({
        onStatusChange: v.boolean(),
        onExpiry: v.boolean(),
        onAction: v.boolean(),
      }),
    }),
    recipient: v.object({
      displayStatus: v.string(),
      availableActions: v.array(v.string()),
      notificationPreferences: v.object({
        onReceive: v.boolean(),
        onExpiry: v.boolean(),
        reminderFrequency: v.string(),
      }),
    }),
  }),
});
```

### 4. Notifications Table

```typescript
notifications: defineTable({
  // Recipient Context
  userId: v.id("users"),
  accountId: v.id("accounts"),
  walletId: v.optional(v.id("wallets")),

  // Notification Type and Priority
  type: v.union(
    v.literal("system"),
    v.literal("payment_request"),
    v.literal("payment"),
    v.literal("security"),
    v.literal("message")
  ),
  priority: v.object({
    level: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    score: v.number(),
    factors: v.array(v.string()),
  }),

  // Content
  content: v.object({
    title: v.string(),
    body: v.string(),
    action: v.optional(
      v.object({
        type: v.string(),
        data: v.any(),
      })
    ),
  }),

  // Delivery Status
  delivery: v.object({
    channels: v.array(v.string()),
    status: v.object({
      inApp: v.union(
        v.literal("pending"),
        v.literal("delivered"),
        v.literal("read"),
        v.literal("failed")
      ),
      push: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
    attempts: v.array(
      v.object({
        channel: v.string(),
        timestamp: v.string(),
        status: v.string(),
        error: v.optional(v.string()),
      })
    ),
  }),

  // Related Entities
  source: v.object({
    type: v.string(),
    id: v.string(),
    context: v.any(),
  }),

  // Lifecycle
  lifecycle: v.object({
    createdAt: v.string(),
    expiresAt: v.optional(v.string()),
    readAt: v.optional(v.string()),
    dismissedAt: v.optional(v.string()),
  }),
});
```

## Schema Relationships

### 1. Direct References

- Messages → PaymentRequests (1:1)
- PaymentRequests → Messages (1:1)
- Messages → Notifications (1:N)
- PaymentRequests → Notifications (1:N)

### 2. Contextual References

- All entities → Accounts (N:1)
- All entities → Users (N:1)
- All entities → Wallets (N:1)

## Indexing Strategy

### 1. Primary Indexes

```typescript
// Messages
indexes: {
  byConversation: index("conversationId"),
  byParticipants: index(["sender.userId", "recipient.userId"]),
  byStatus: index(["type", "status"]),
},

// Payment Requests
indexes: {
  byRequester: index(["requesterId", "status"]),
  byRecipient: index(["recipientId", "status"]),
  byExpiry: index("lifecycle.expiresAt"),
},

// Notifications
indexes: {
  byUser: index(["userId", "type"]),
  byPriority: index(["userId", "priority.level"]),
  byDelivery: index(["userId", "delivery.status.inApp"]),
},
```

## State Management Optimizations

### 1. Atomic Updates

- Use transactions for related entity updates
- Maintain status consistency across entities
- Update indexes efficiently

### 2. Real-time Sync

- Implement proper subscription patterns
- Use optimistic updates where appropriate
- Handle conflict resolution

### 3. Cache Management

- Implement proper cache invalidation
- Use selective updates
- Maintain cache consistency

## Migration Strategy

### Phase 1: Schema Updates

1. Create new table structures
2. Add new fields and relationships
3. Create new indexes
4. Validate schema integrity

### Phase 2: Data Migration

1. Migrate existing data
2. Update relationships
3. Validate data consistency
4. Update indexes

### Phase 3: Implementation

1. Update queries and mutations
2. Implement new features
3. Add monitoring
4. Performance testing

## Best Practices

### 1. Data Integrity

- Use proper validation
- Maintain referential integrity
- Implement proper cleanup
- Handle edge cases

### 2. Performance

- Use proper indexing
- Implement efficient queries
- Optimize data access patterns
- Monitor performance

### 3. Security

- Implement proper access control
- Validate data access
- Handle sensitive data
- Audit access patterns

## Conclusion

These schema improvements provide a robust foundation for efficient state management in the WalletFlow application. The enhanced schemas support real-time updates, proper relationship tracking, and efficient data access patterns while maintaining data integrity and security.
