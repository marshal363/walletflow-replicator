# Payment Requests and Notifications Technical Analysis

## Overview

This document provides a detailed technical analysis of the payment requests and notifications system in the WalletFlow application, focusing on status consistency, real-time updates, and bi-directional relationships between different entities.

## Current Architecture Analysis

### 1. Payment Request Status Management

#### Current Implementation Issues

1. Lack of atomic updates across related entities
2. Inconsistent status representation
3. Missing real-time updates
4. Poor error handling
5. Incomplete status tracking

#### Status Flow Problems

```typescript
// Current problematic implementation
const updateStatus = async (requestId, status) => {
  await db.paymentRequests.update(requestId, { status });
  // Missing: Updates to related entities
  // Missing: Notification creation
  // Missing: Message updates
};
```

### 2. Notification System Issues

#### Current Implementation Problems

1. No proper prioritization
2. Missing context awareness
3. Poor real-time delivery
4. Lack of user role consideration
5. Missing batch processing

## Proposed Architecture

### 1. Enhanced Database Schema

```typescript
// Payment Requests Schema
paymentRequests: defineTable({
  // Core Fields
  requestId: v.string(),
  sourceAccountId: v.id("accounts"),
  destinationAccountId: v.optional(v.id("accounts")),
  sourceWalletId: v.id("wallets"),
  destinationWalletId: v.optional(v.id("wallets")),

  // User Context
  requesterId: v.id("users"),
  recipientId: v.id("users"),

  // Message Context
  messageContext: v.object({
    originalMessageId: v.id("messages"),
    responseMessageIds: v.array(v.id("messages")),
    notificationIds: v.array(v.id("notifications")),
  }),

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

  // Participant Views
  participantViews: v.object({
    sender: v.object({
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

// Notifications Schema
notifications: defineTable({
  // Context
  accountId: v.id("accounts"),
  userId: v.id("users"),
  walletId: v.optional(v.id("wallets")),

  // Notification Type
  type: v.union(
    v.literal("system"),
    v.literal("payment_request"),
    v.literal("payment_sent"),
    v.literal("payment_received"),
    v.literal("security")
  ),

  // Context Awareness
  contextual: v.object({
    role: v.union(
      v.literal("sender"),
      v.literal("recipient"),
      v.literal("both")
    ),
    sourceEntity: v.object({
      type: v.string(),
      id: v.string(),
    }),
    displayRules: v.object({
      conditions: v.array(
        v.object({
          field: v.string(),
          operator: v.string(),
          value: v.any(),
        })
      ),
      visibilityDuration: v.optional(v.number()),
      dismissBehavior: v.string(),
    }),
  }),
});
```

### 2. Status Synchronization System

```typescript
class StatusSyncManager {
  private static instance: StatusSyncManager;
  private subscribers: Map<string, Set<(status: any) => void>>;

  subscribe(entityId: string, callback: (status: any) => void) {
    if (!this.subscribers.has(entityId)) {
      this.subscribers.set(entityId, new Set());
    }
    this.subscribers.get(entityId)!.add(callback);
  }

  notifyStatusChange(entityId: string, status: any) {
    this.subscribers.get(entityId)?.forEach((callback) => callback(status));
  }
}
```

### 3. Real-time Update System

```typescript
// Convex Mutation
export const updatePaymentRequestStatus = mutation({
  args: {
    requestId: v.id("paymentRequests"),
    newStatus: v.union(/* status literals */),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.transaction(async (tx) => {
      // 1. Update Payment Request
      const paymentRequest = await tx.get(args.requestId);

      // 2. Update Message Status
      const message = await tx.get(
        paymentRequest.messageContext.originalMessageId
      );

      // 3. Create/Update Notifications
      const notificationData = createNotificationForStatus(
        args.newStatus,
        paymentRequest
      );

      // 4. Update all entities atomically
      await Promise.all([
        tx.patch(args.requestId, {
          status: args.newStatus,
          updatedAt: new Date().toISOString(),
        }),
        tx.patch(message._id, {
          "content.paymentRequestStatus": args.newStatus,
        }),
        tx.insert("notifications", notificationData),
      ]);
    });
  },
});
```

### 4. Notification Priority System

```typescript
interface NotificationPriority {
  base: "critical" | "high" | "medium" | "low";
  modifiers: {
    actionRequired: boolean;
    timeConstraint: boolean;
    amount: number;
    role: "sender" | "recipient";
  };
  calculatedPriority: number;
}

const calculatePriority = (notification: Notification): number => {
  const baseScore = {
    critical: 1000,
    high: 750,
    medium: 500,
    low: 250,
  }[notification.priority.base];

  const modifiers = notification.priority.modifiers;
  let score = baseScore;

  if (modifiers.actionRequired) score += 200;
  if (modifiers.timeConstraint) score += 150;
  if (modifiers.amount > 1000) score += 100;

  return score;
};
```

## Implementation Guidelines

### 1. Status Update Flow

```typescript
async function handleStatusUpdate(
  requestId: string,
  newStatus: PaymentRequestStatus,
  context: UpdateContext
) {
  // 1. Start transaction
  const transaction = await db.transaction();

  try {
    // 2. Update payment request
    await updatePaymentRequest(transaction, requestId, newStatus);

    // 3. Update related message
    await updateRelatedMessage(transaction, requestId, newStatus);

    // 4. Create notifications
    await createStatusNotifications(transaction, requestId, newStatus, context);

    // 5. Commit transaction
    await transaction.commit();

    // 6. Trigger real-time updates
    await notifyStatusChange(requestId, newStatus);
  } catch (error) {
    // Rollback on error
    await transaction.rollback();
    throw error;
  }
}
```

### 2. Notification Delivery System

```typescript
class NotificationDeliverySystem {
  async deliver(notification: Notification) {
    // 1. Calculate priority
    const priority = calculatePriority(notification);

    // 2. Determine delivery channels
    const channels = await this.determineChannels(notification);

    // 3. Prepare notification for each channel
    const deliveryPromises = channels.map((channel) =>
      this.deliverToChannel(channel, notification)
    );

    // 4. Deliver in parallel
    await Promise.all(deliveryPromises);

    // 5. Track delivery status
    await this.trackDelivery(notification);
  }
}
```

### 3. Real-time UI Updates

```typescript
function PaymentRequestCard({ requestId }: { requestId: string }) {
  const { status, isLoading } = usePaymentRequestSync(requestId);
  const request = usePaymentRequestStore(state => state.requests.get(requestId));

  useEffect(() => {
    const statusSync = StatusSyncManager.getInstance();
    statusSync.subscribe(requestId, handleStatusUpdate);

    return () => statusSync.unsubscribe(requestId, handleStatusUpdate);
  }, [requestId]);

  return (
    <Card>
      <StatusIndicator
        status={status}
        type="payment_request"
        animate={true}
      />
      {/* Card content */}
    </Card>
  );
}
```

## Best Practices

### 1. Status Management

- Use atomic transactions
- Maintain status history
- Implement proper rollback
- Track status changes
- Validate status transitions

### 2. Notification Handling

- Prioritize notifications properly
- Consider user context
- Implement batch processing
- Handle delivery failures
- Track user interaction

### 3. Real-time Updates

- Use proper subscription patterns
- Implement retry mechanisms
- Handle connection failures
- Maintain update order
- Monitor performance

## Migration Strategy

### Phase 1: Schema Updates

1. Update database schemas
2. Migrate existing data
3. Validate data integrity
4. Update indexes

### Phase 2: System Implementation

1. Implement status sync system
2. Add notification delivery
3. Update UI components
4. Add monitoring

### Phase 3: Testing & Validation

1. Test status transitions
2. Validate notification delivery
3. Verify real-time updates
4. Performance testing

## Conclusion

This technical analysis provides a comprehensive overview of the improvements needed in the payment requests and notifications system. The proposed solutions address current issues while providing a scalable and maintainable foundation for future development.
