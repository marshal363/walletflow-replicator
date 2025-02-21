import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
      debug.log("Fetching messages", { 
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

      debug.log("Current user found", { userId: user._id });

      // Verify user is part of conversation
      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation) {
        debug.error("Conversation not found", { conversationId: args.conversationId });
        throw new Error("Conversation not found");
      }

      if (!conversation.participants.includes(user._id)) {
        debug.error("User not in conversation", { 
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

      // Filter messages based on visibility and user role
      const filteredMessages = messages.filter(message => {
        // If message has no visibility setting or is set to "both", show it
        if (!message.metadata.visibility || message.metadata.visibility === "both") {
          return true;
        }

        // For payment messages, check visibility based on user role
        if (message.type === "payment_sent" || message.type === "payment_received") {
          if (message.metadata.visibility === "sender_only") {
            return message.metadata.senderId === user._id;
          }
          if (message.metadata.visibility === "recipient_only") {
            return message.metadata.recipientId === user._id;
          }
        }

        return true;
      });

      // Sort messages by timestamp
      const sortedMessages = filteredMessages
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        .slice(-1 * (args.limit ?? 50));

      debug.log("Messages filtered and sorted", { 
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
      debug.error("Error fetching messages", error);
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
      v.literal("payment_received"),
      v.literal("system")
    ),
    metadata: v.optional(v.object({
      amount: v.optional(v.number()),
      recipientId: v.optional(v.id("users")),
      senderId: v.optional(v.id("users")),
      transferId: v.optional(v.id("transferTransactions")),
    })),
  },
  handler: async (ctx, args) => {
    try {
      debug.log("Sending message", { 
        conversationId: args.conversationId,
        type: args.type,
        contentLength: args.content.length 
      });

      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Not authenticated");

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id")
        .filter((q) => q.eq(q.field("clerkId"), identity.subject))
        .unique();
      
      if (!user) throw new Error("User not found");

      debug.log("Sender found", { userId: user._id });

      // Validate conversation exists and user is participant
      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation) {
        debug.error("Conversation not found", { conversationId: args.conversationId });
        throw new Error("Conversation not found");
      }

      if (!conversation.participants.includes(user._id)) {
        debug.error("User not in conversation", { 
          userId: user._id,
          conversationId: args.conversationId 
        });
        throw new Error("Not authorized to send messages in this conversation");
      }

      // Create message with proper metadata based on type
      const message = await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        senderId: user._id,
        content: args.content,
        type: args.type,
        status: "sent",
        timestamp: new Date().toISOString(),
        metadata: {
          replyTo: undefined,
          attachments: undefined,
          reactions: undefined,
          // Include payment metadata if it's a payment-related message
          ...(args.type === "payment_sent" || args.type === "payment_received" || args.type === "payment_request" 
            ? {
                amount: args.metadata?.amount,
                recipientId: args.metadata?.recipientId,
                senderId: args.metadata?.senderId,
                transferId: args.metadata?.transferId,
              }
            : {}),
        },
      });

      debug.log("Message created", { 
        messageId: message,
        type: args.type,
        metadata: args.metadata 
      });

      // Update conversation with last message info
      await ctx.db.patch(args.conversationId, {
        lastMessageId: message,
        lastMessageAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      debug.log("Conversation updated", { 
        conversationId: args.conversationId,
        lastMessageId: message
      });

      return message;
    } catch (error) {
      debug.error("Error sending message", error);
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
      debug.log("Starting to mark messages as delivered", { 
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

      debug.log("User found", { userId: user._id });

      // Verify user is part of conversation
      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation) {
        debug.error("Conversation not found", { conversationId: args.conversationId });
        throw new Error("Conversation not found");
      }

      if (!conversation.participants.includes(user._id)) {
        debug.error("User not in conversation", { 
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

      debug.log("Found sent messages", { count: sentMessages.length });

      // Mark all messages as delivered
      const updates = await Promise.all(
        sentMessages.map(async (message) => {
          await ctx.db.patch(message._id, {
            status: "delivered"
          });
          return message._id;
        })
      );

      debug.log("Messages marked as delivered", { 
        count: updates.length,
        messageIds: updates 
      });

      return updates;
    } catch (error) {
      debug.error("Error marking messages as delivered", error);
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
      debug.log("Starting to mark messages as read", { 
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

      debug.log("User found", { userId: user._id });

      // Verify user is part of conversation
      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation) {
        debug.error("Conversation not found", { conversationId: args.conversationId });
        throw new Error("Conversation not found");
      }

      if (!conversation.participants.includes(user._id)) {
        debug.error("User not in conversation", { 
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

      debug.log("Found unread messages", { count: unreadMessages.length });

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

      debug.log("Messages marked as read", { 
        updated: updates.length,
        conversationId: args.conversationId 
      });

      return updates;
    } catch (error) {
      debug.error("Error marking messages as read", error);
      throw error;
    }
  },
}); 