import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { debug as logger } from "./debug";

// Debug logger that accepts both query and mutation contexts
const debug = {
  log: (message: string, data?: Record<string, unknown>) => {
    console.log(`[Convex:Messages] ${message}`, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  },
  error: (message: string, error?: unknown) => {
    console.error(`[Convex:Messages:Error] ${message}`, {
      error,
      timestamp: new Date().toISOString(),
    });
  }
};

// Define message metadata types
interface MessageMetadata {
  amount?: number;
  senderId?: Id<"users">;
  recipientId?: Id<"users">;
  transferId?: Id<"transferTransactions">;
  requestId?: Id<"paymentRequests">;
  visibility?: "sender_only" | "recipient_only" | "both";
  requestStatus?: "pending" | "approved" | "declined" | "cancelled";
  replyTo?: Id<"messages">;
  attachments?: string[];
  reactions?: Array<{
    type: string;
    userId: Id<"users">;
  }>;
  expiresAt?: string;
}

// Get recent conversations for the current user
export const getRecentConversations = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;
    const limit = args.limit ?? 20;

    // Get user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id")
      .filter((q) => q.eq(q.field("clerkId"), userId))
      .unique();

    if (!user) throw new Error("User not found");

    // Get conversations where user is a participant
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_participants")
      .filter((q) => 
        q.and(
          q.eq(q.field("metadata.isGroup"), false),
          q.eq(q.field("status"), "active")
        )
      )
      .order("desc")
      .take(limit * 2);

    // Filter conversations where user is a participant
    const userConversations = conversations.filter(conversation => 
      conversation.participants.includes(user._id)
    );

    // Get conversation details
    const conversationDetails = await Promise.all(
      userConversations.slice(0, limit).map(async (conversation) => {
        // Get other participant
        const otherParticipantId = conversation.participants.find(
          (id) => id !== user._id
        );
        if (!otherParticipantId) return null;

        const otherUser = await ctx.db.get(otherParticipantId);
        if (!otherUser) return null;

        // Get last message
        const lastMessage = conversation.lastMessageId
          ? await ctx.db.get(conversation.lastMessageId)
          : null;

        // Get unread count
        const unreadCount = await ctx.db
          .query("messages")
          .withIndex("by_conversation")
          .filter((q) =>
            q.and(
              q.eq(q.field("conversationId"), conversation._id),
              q.eq(q.field("status"), "delivered"),
              q.eq(q.field("senderId"), otherParticipantId)
            )
          )
          .collect()
          .then((messages) => messages.length);

        return {
          _id: conversation._id,
          sender: {
            _id: otherUser._id,
            fullName: otherUser.fullName,
            username: otherUser.username ?? "",
            profileImageUrl: otherUser.profileImageUrl,
          },
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                timestamp: lastMessage.timestamp,
                status: lastMessage.status,
              }
            : null,
          unreadCount,
        };
      })
    );

    return conversationDetails.filter((c): c is NonNullable<typeof c> => c !== null);
  },
});

// Get messages for a conversation
export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      logger.log("Fetching messages", { 
        conversationId: args.conversationId,
        limit: args.limit,
        cursor: args.cursor 
      });

      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Not authenticated");

      // Get current user
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id")
        .filter((q) => q.eq(q.field("clerkId"), identity.subject))
        .unique();
      
      if (!user) throw new Error("User not found");

      logger.log("Current user found", { userId: user._id });

      // Verify user is part of conversation
      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation) {
        logger.error("Conversation not found", { conversationId: args.conversationId });
        throw new Error("Conversation not found");
      }

      if (!conversation.participants.includes(user._id)) {
        logger.error("User not in conversation", { 
          userId: user._id,
          conversationId: args.conversationId 
        });
        throw new Error("Not authorized to view this conversation");
      }

      // Query messages with visibility filtering
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation")
        .filter((q) => q.eq(q.field("conversationId"), args.conversationId))
        .collect();

      // Enhanced message filtering with payment request handling
      const filteredMessages = messages.filter(message => {
        logger.log("Filtering message visibility", {
          type: "MESSAGE_FILTER",
          messageId: message._id,
          messageType: message.type,
          visibility: message.metadata.visibility,
          userId: user._id,
          isSender: message.senderId === user._id,
          isRecipient: message.metadata.recipientId === user._id,
          timestamp: new Date().toISOString()
        });

        // Payment requests are always visible to both parties
        if (message.type === "payment_request") {
          return true;
        }

        // Handle visibility based on metadata
        if (!message.metadata.visibility || message.metadata.visibility === "both") {
          return true;
        }

        if (message.type === "payment_sent" && message.metadata.visibility === "sender_only") {
          return message.metadata.senderId === user._id;
        }

        if (message.type === "payment_received" && message.metadata.visibility === "recipient_only") {
          return message.metadata.recipientId === user._id;
        }

        return true;
      });

      // Sort messages by timestamp
      const sortedMessages = filteredMessages
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        .slice(-1 * (args.limit ?? 50));

      logger.log("Messages filtered and sorted", { 
        conversationId: args.conversationId,
        totalMessages: messages.length,
        filteredCount: filteredMessages.length,
        returnedCount: sortedMessages.length
      });

      return {
        messages: sortedMessages,
        nextCursor: sortedMessages.length === (args.limit ?? 50) 
          ? sortedMessages[sortedMessages.length - 1].timestamp 
          : null,
      };
    } catch (error) {
      logger.error("Error fetching messages", {
        type: "MESSAGE_FETCH_ERROR",
        error: error instanceof Error ? error.message : "Unknown error",
        conversationId: args.conversationId,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  },
});

// Send a new message
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    type: v.union(
      v.literal("text"),
      v.literal("payment_request"),
      v.literal("payment_sent"),
      v.literal("payment_received")
    ),
    metadata: v.optional(v.object({
      amount: v.optional(v.number()),
      recipientId: v.optional(v.id("users")),
      senderId: v.optional(v.id("users")),
      transferId: v.optional(v.id("transferTransactions")),
      requestStatus: v.optional(v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("declined"),
        v.literal("cancelled")
      )),
      requestId: v.optional(v.id("paymentRequests")),
      visibility: v.optional(v.union(
        v.literal("sender_only"),
        v.literal("recipient_only"),
        v.literal("both")
      )),
      replyTo: v.optional(v.id("messages")),
      attachments: v.optional(v.array(v.string())),
      reactions: v.optional(v.object({
        count: v.number(),
        type: v.string(),
        users: v.array(v.id("users"))
      })),
      lastUpdated: v.optional(v.string()),
      statusUpdatedBy: v.optional(v.id("users")),
    })),
  },
  handler: async (ctx, args) => {
    try {
      logger.log("Message creation started", {
        type: "MESSAGE_CREATE_START",
        conversationId: args.conversationId,
        messageType: args.type,
        metadata: args.metadata,
        timestamp: new Date().toISOString()
      });

      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Not authenticated");

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id")
        .filter((q) => q.eq(q.field("clerkId"), identity.subject))
        .unique();
      
      if (!user) throw new Error("User not found");

      logger.log("Sender found", { userId: user._id });

      // Validate conversation exists and user is participant
      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation) {
        logger.error("Conversation not found", { conversationId: args.conversationId });
        throw new Error("Conversation not found");
      }

      if (!conversation.participants.includes(user._id)) {
        logger.error("User not in conversation", { 
          userId: user._id,
          conversationId: args.conversationId 
        });
        throw new Error("Not authorized to send messages in this conversation");
      }

      // Enhanced metadata for payment requests
      let messageMetadata: {
        replyTo?: Id<"messages">;
        attachments?: string[];
        reactions?: {
          count: number;
          type: string;
          users: Id<"users">[];
        };
        visibility: "sender_only" | "recipient_only" | "both";
        amount?: number;
        recipientId?: Id<"users">;
        senderId?: Id<"users">;
        transferId?: Id<"transferTransactions">;
        requestStatus?: "pending" | "approved" | "declined" | "cancelled";
        requestId?: Id<"paymentRequests">;
        requestTimestamp?: string;
        expiresAt?: string;
        requestType?: "lightning";
        requestContext?: {
          initiatedBy: Id<"users">;
          initiatorRole: string;
          recipientRole: string;
        };
        lastUpdated?: string;
        statusUpdatedBy?: Id<"users">;
      } = {
        replyTo: args.metadata?.replyTo,
        attachments: args.metadata?.attachments,
        reactions: args.metadata?.reactions,
        visibility: "both" as const,
        amount: args.metadata?.amount,
        recipientId: args.metadata?.recipientId,
        senderId: args.metadata?.senderId,
        transferId: args.metadata?.transferId,
      };

      // Add specific metadata for payment requests
      if (args.type === "payment_request") {
        messageMetadata = {
          ...messageMetadata,
          requestStatus: "pending" as const,
          requestId: args.metadata?.requestId,
          requestTimestamp: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          requestType: "lightning" as const,
          requestContext: {
            initiatedBy: user._id,
            initiatorRole: "sender",
            recipientRole: "receiver"
          }
        };

        logger.log("Creating payment request message", {
          type: "PAYMENT_REQUEST_CREATE",
          metadata: messageMetadata,
          userId: user._id,
          timestamp: new Date().toISOString()
        });
      }

      // Create message with enhanced metadata
      const message = await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        senderId: user._id,
        content: args.content,
        type: args.type,
        status: "sent",
        timestamp: new Date().toISOString(),
        metadata: messageMetadata,
      });

      logger.log("Message created successfully", {
        type: "MESSAGE_CREATE_SUCCESS",
        messageId: message,
        messageType: args.type,
        visibility: messageMetadata.visibility,
        metadata: messageMetadata,
        timestamp: new Date().toISOString()
      });

      // Update conversation with last message info
      await ctx.db.patch(args.conversationId, {
        lastMessageId: message,
        lastMessageAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      logger.log("Conversation updated", { 
        conversationId: args.conversationId,
        lastMessageId: message
      });

      return message;
    } catch (error) {
      logger.error("Message creation failed", {
        type: "MESSAGE_CREATE_ERROR",
        error: error instanceof Error ? error.message : "Unknown error",
        conversationId: args.conversationId,
        messageType: args.type,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  },
});

// Mark messages as delivered
export const markMessagesAsDelivered = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    try {
      logger.log("Starting to mark messages as delivered", { 
        conversationId: args.conversationId 
      });

      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Not authenticated");

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id")
        .filter((q) => q.eq(q.field("clerkId"), identity.subject))
        .unique();
      
      if (!user) throw new Error("User not found");

      logger.log("User found", { userId: user._id });

      // Verify user is part of conversation
      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation) {
        logger.error("Conversation not found", { conversationId: args.conversationId });
        throw new Error("Conversation not found");
      }

      if (!conversation.participants.includes(user._id)) {
        logger.error("User not in conversation", { 
          userId: user._id,
          conversationId: args.conversationId 
        });
        throw new Error("Not authorized to view this conversation");
      }

      // Get all sent messages from other participants
      const sentMessages = await ctx.db
        .query("messages")
        .withIndex("by_conversation")
        .filter((q) =>
          q.and(
            q.eq(q.field("conversationId"), args.conversationId),
            q.eq(q.field("status"), "sent"),
            q.neq(q.field("senderId"), user._id)
          )
        )
        .collect();

      logger.log("Found sent messages", { count: sentMessages.length });

      // Mark all messages as delivered
      const updates = await Promise.all(
        sentMessages.map(async (message) => {
          await ctx.db.patch(message._id, {
            status: "delivered"
          });
          return message._id;
        })
      );

      logger.log("Messages marked as delivered", { 
        count: updates.length,
        messageIds: updates 
      });

      return updates;
    } catch (error) {
      logger.error("Error marking messages as delivered", error);
      throw error;
    }
  },
});

// Mark messages as read
export const markMessagesAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    try {
      logger.log("Starting to mark messages as read", { 
        conversationId: args.conversationId 
      });

      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Not authenticated");

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id")
        .filter((q) => q.eq(q.field("clerkId"), identity.subject))
        .unique();
      
      if (!user) throw new Error("User not found");

      logger.log("User found", { userId: user._id });

      // Verify user is part of conversation
      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation) {
        logger.error("Conversation not found", { conversationId: args.conversationId });
        throw new Error("Conversation not found");
      }

      if (!conversation.participants.includes(user._id)) {
        logger.error("User not in conversation", { 
          userId: user._id,
          conversationId: args.conversationId 
        });
        throw new Error("Not authorized to view this conversation");
      }

      // Get all unread messages from other participants
      const unreadMessages = await ctx.db
        .query("messages")
        .withIndex("by_conversation")
        .filter((q) =>
          q.and(
            q.eq(q.field("conversationId"), args.conversationId),
            q.eq(q.field("status"), "delivered"),
            q.neq(q.field("senderId"), user._id)
          )
        )
        .collect();

      logger.log("Found unread messages", { count: unreadMessages.length });

      // Mark all messages as read
      const updates = await Promise.all(
        unreadMessages.map(async (message) => {
          await ctx.db.patch(message._id, {
            status: "read"
          });
          return message._id;
        })
      );

      // Update conversation participant's last read info
      const now = new Date().toISOString();
      await ctx.db
        .query("conversationParticipants")
        .withIndex("by_conversation_user")
        .filter((q) =>
          q.and(
            q.eq(q.field("conversationId"), args.conversationId),
            q.eq(q.field("userId"), user._id)
          )
        )
        .first()
        .then(async (participant) => {
          if (participant) {
            await ctx.db.patch(participant._id, {
              lastReadAt: now,
              lastReadMessageId: conversation.lastMessageId
            });
          }
        });

      logger.log("Messages marked as read", { 
        updated: updates.length,
        conversationId: args.conversationId 
      });

      return updates;
    } catch (error) {
      logger.error("Error marking messages as read", error);
      throw error;
    }
  },
});

// Get message details
export const getMessage = query({
  args: {
    messageId: v.id("messages")
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    return message;
  }
});

// Update payment request status
export const updatePaymentRequestStatus = mutation({
  args: {
    messageId: v.id("messages"),
    newStatus: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("cancelled")
    )
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.type !== "payment_request") throw new Error("Not a payment request message");

    logger.log("Updating payment request status", {
      messageId: args.messageId,
      oldStatus: message.metadata?.requestStatus,
      newStatus: args.newStatus
    });

    const { reactions, ...existingMetadata } = message.metadata || {};
    const updatedMetadata: MessageMetadata = {
      ...existingMetadata,
      requestStatus: args.newStatus
    };

    await ctx.db.patch(args.messageId, {
      metadata: updatedMetadata
    });

    logger.log("Payment request status updated", {
      messageId: args.messageId,
      newStatus: args.newStatus
    });

    return message;
  }
}); 