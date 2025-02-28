# Bi-directional Messaging System Technical Analysis

## Overview

This document provides a detailed technical analysis of the bi-directional messaging system in the WalletFlow application, focusing on message relationships, visibility control, and integration with payments and notifications.

## Current Architecture Analysis

### 1. Message Visibility Issues

#### Current Implementation Problems

1. No proper role-based visibility control
2. Missing message context awareness
3. Inconsistent message status tracking
4. Poor handling of payment-related messages
5. Missing relationship tracking

## Proposed Architecture

### 1. Enhanced Message Schema

```typescript
messages: defineTable({
  // Core Message Data
  conversationId: v.id("conversations"),

  // Sender Context
  senderId: v.id("users"),
  senderAccountId: v.id("accounts"),
  senderWalletId: v.optional(v.id("wallets")),

  // Recipient Context
  recipientId: v.id("users"),
  recipientAccountId: v.id("accounts"),
  recipientWalletId: v.optional(v.id("wallets")),

  // Message Type and Content
  type: v.union(
    v.literal("text"),
    v.literal("payment_request"),
    v.literal("payment_sent"),
    v.literal("payment_received"),
    v.literal("request_response")
  ),

  // Visibility Control
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
  relatedEntities: v.object({
    paymentRequestId: v.optional(v.id("paymentRequests")),
    paymentId: v.optional(v.id("payments")),
    notificationIds: v.array(v.id("notifications")),
  }),

  // Content based on type
  content: v.union(
    // Text message
    v.object({
      type: v.literal("text"),
      text: v.string(),
    }),

    // Payment request message
    v.object({
      type: v.literal("payment_request"),
      requestData: v.object({
        amount: v.number(),
        currency: v.string(),
        description: v.string(),
        expiresAt: v.string(),
      }),
    }),

    // Payment message
    v.object({
      type: v.literal("payment"),
      paymentData: v.object({
        amount: v.number(),
        currency: v.string(),
        status: v.string(),
        type: v.string(),
      }),
    })
  ),

  // Status tracking per participant
  participantStatus: v.object({
    [v.string()]: v.object({
      // userId as key
      readAt: v.optional(v.string()),
      deliveredAt: v.optional(v.string()),
      actionsAvailable: v.array(v.string()),
    }),
  }),

  // Metadata
  metadata: v.object({
    replyTo: v.optional(v.id("messages")),
    attachments: v.optional(v.array(v.string())),
    tags: v.array(v.string()),
    customData: v.optional(
      v.object({
        category: v.string(),
        importance: v.string(),
        externalReference: v.optional(v.string()),
      })
    ),
  }),
});
```

### 2. Message Context Management

```typescript
interface MessageContext {
  role: "sender" | "recipient";
  accountId: Id<"accounts">;
  walletId?: Id<"wallets">;
  permissions: string[];
  visibility: "visible" | "hidden" | "partial";
}

class MessageContextManager {
  determineContext(userId: string, message: Message): MessageContext {
    const isSender = message.senderId === userId;

    return {
      role: isSender ? "sender" : "recipient",
      accountId: isSender
        ? message.senderAccountId
        : message.recipientAccountId,
      walletId: isSender ? message.senderWalletId : message.recipientWalletId,
      permissions: this.calculatePermissions(isSender, message),
      visibility: this.determineVisibility(isSender, message),
    };
  }

  private calculatePermissions(isSender: boolean, message: Message): string[] {
    const basePermissions = ["view", "react"];

    if (isSender) {
      basePermissions.push("edit", "delete");
    }

    if (message.type === "payment_request" && !isSender) {
      basePermissions.push("approve", "decline");
    }

    return basePermissions;
  }

  private determineVisibility(
    isSender: boolean,
    message: Message
  ): "visible" | "hidden" | "partial" {
    const { mode } = message.visibility;

    if (mode === "both") return "visible";
    if (mode === "sender_only" && isSender) return "visible";
    if (mode === "recipient_only" && !isSender) return "visible";

    return "hidden";
  }
}
```

### 3. Message-Payment Integration

```typescript
class MessagePaymentIntegration {
  async createPaymentRequest(
    message: Message,
    paymentData: PaymentRequestData
  ): Promise<void> {
    return await db.transaction(async (tx) => {
      // 1. Create payment request
      const paymentRequest = await tx.insert("paymentRequests", {
        ...paymentData,
        messageContext: {
          originalMessageId: message._id,
          responseMessageIds: [],
          notificationIds: [],
        },
      });

      // 2. Update message with payment request reference
      await tx.patch(message._id, {
        "relatedEntities.paymentRequestId": paymentRequest._id,
        type: "payment_request",
      });

      // 3. Create notifications for both parties
      await Promise.all([
        createSenderNotification(tx, message, paymentRequest),
        createRecipientNotification(tx, message, paymentRequest),
      ]);
    });
  }

  async handlePaymentResponse(
    message: Message,
    response: "approve" | "decline",
    reason?: string
  ): Promise<void> {
    return await db.transaction(async (tx) => {
      const paymentRequest = await tx.get(
        message.relatedEntities.paymentRequestId
      );

      // 1. Update payment request status
      await tx.patch(paymentRequest._id, {
        status: response === "approve" ? "approved" : "declined",
        ...(reason && { "metadata.declineReason": reason }),
      });

      // 2. Create response message
      const responseMessage = await tx.insert("messages", {
        type: "request_response",
        content: {
          response,
          reason,
        },
        relatedEntities: {
          paymentRequestId: paymentRequest._id,
        },
      });

      // 3. Update original message
      await tx.patch(message._id, {
        "messageContext.responseMessageIds": [
          ...message.messageContext.responseMessageIds,
          responseMessage._id,
        ],
      });

      // 4. Create notifications
      await createResponseNotifications(tx, message, response);
    });
  }
}
```

### 4. Message Visibility Control

```typescript
class MessageVisibilityController {
  async updateVisibility(
    messageId: Id<"messages">,
    newVisibility: VisibilityMode,
    conditions?: VisibilityCondition[]
  ): Promise<void> {
    return await db.transaction(async (tx) => {
      const message = await tx.get(messageId);

      // 1. Validate visibility change
      this.validateVisibilityChange(message, newVisibility);

      // 2. Update message visibility
      await tx.patch(messageId, {
        visibility: {
          mode: newVisibility,
          conditions,
          updatedAt: new Date().toISOString(),
        },
      });

      // 3. Update related entities visibility
      if (message.relatedEntities.paymentRequestId) {
        await this.updatePaymentRequestVisibility(
          tx,
          message.relatedEntities.paymentRequestId,
          newVisibility
        );
      }

      // 4. Create visibility change notification
      await createVisibilityNotification(tx, message, newVisibility);
    });
  }

  private validateVisibilityChange(
    message: Message,
    newVisibility: VisibilityMode
  ): void {
    // Implement visibility change validation rules
    if (message.type === "payment_request" && newVisibility === "sender_only") {
      throw new Error("Cannot hide payment request from recipient");
    }
  }
}
```

## Implementation Guidelines

### 1. Message Creation Flow

```typescript
async function createMessage(
  data: MessageCreationData,
  context: MessageContext
): Promise<void> {
  return await db.transaction(async (tx) => {
    // 1. Create base message
    const message = await tx.insert("messages", {
      ...data,
      visibility: determineInitialVisibility(data.type),
      participantStatus: createInitialStatus(data.senderId, data.recipientId),
    });

    // 2. Handle special message types
    if (data.type === "payment_request") {
      await handlePaymentRequestMessage(tx, message, data);
    }

    // 3. Create initial notifications
    await createMessageNotifications(tx, message, context);

    // 4. Update conversation
    await updateConversation(tx, message);
  });
}
```

### 2. Message Retrieval with Context

```typescript
function useMessageWithContext(messageId: Id<"messages">) {
  const { user } = useAuth();
  const message = useQuery(api.messages.get, { id: messageId });

  const messageContext = useMemo(() => {
    if (!message || !user) return null;

    const contextManager = new MessageContextManager();
    return contextManager.determineContext(user.id, message);
  }, [message, user]);

  const visibleContent = useMemo(() => {
    if (!messageContext) return null;

    return messageContext.visibility === "visible"
      ? message.content
      : messageContext.visibility === "partial"
        ? filterMessageContent(message.content, messageContext)
        : null;
  }, [message, messageContext]);

  return {
    message,
    context: messageContext,
    visibleContent,
    isLoading: !message || !messageContext,
  };
}
```

## Best Practices

### 1. Message Handling

- Validate message type transitions
- Maintain message history
- Handle visibility changes atomically
- Track message status properly
- Implement proper cleanup

### 2. Payment Integration

- Validate payment state transitions
- Maintain payment context
- Handle payment failures gracefully
- Track payment status
- Implement proper rollback

### 3. Visibility Control

- Validate visibility changes
- Maintain visibility history
- Handle visibility conditions
- Track visibility changes
- Implement proper access control

## Migration Strategy

### Phase 1: Schema Migration

1. Update message schema
2. Migrate existing messages
3. Add visibility controls
4. Update indexes

### Phase 2: Feature Implementation

1. Implement message context
2. Add payment integration
3. Update UI components
4. Add visibility controls

### Phase 3: Testing & Validation

1. Test message flows
2. Validate visibility rules
3. Test payment integration
4. Performance testing

## Conclusion

This technical analysis provides a comprehensive overview of the bi-directional messaging system improvements needed in the WalletFlow application. The proposed solutions address current issues while providing a scalable and maintainable foundation for future development.
