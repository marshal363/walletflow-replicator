import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { GenericQueryCtx, GenericMutationCtx } from "./_generated/server";

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

      // Query messages
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation")
        .filter((q) => q.eq(q.field("conversationId"), args.conversationId))
        .order("desc")
        .take(args.limit ?? 50);

      debug.log("Messages fetched", { 
        conversationId: args.conversationId,
        count: messages.length 
      });

      return {
        messages: messages.reverse(),
        nextCursor: messages.length === (args.limit ?? 50) 
          ? messages[messages.length - 1].timestamp 
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

      // Create message
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
        },
      });

      debug.log("Message created", { messageId: message });

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

// Mark messages as read
export const markMessagesAsRead = mutation({
  args: {
    messageIds: v.array(v.id("messages")),
  },
  handler: async (ctx, args) => {
    try {
      debug.log("Marking messages as read", { 
        messageIds: args.messageIds 
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

      // Update all messages
      const updates = await Promise.all(
        args.messageIds.map(async (messageId) => {
          const message = await ctx.db.get(messageId);
          if (!message) {
            debug.error("Message not found", { messageId });
            return null;
          }

          // Only mark as read if user is a participant
          const conversation = await ctx.db.get(message.conversationId);
          if (!conversation || !conversation.participants.includes(user._id)) {
            debug.error("User not in conversation", { 
              userId: user._id,
              conversationId: message.conversationId 
            });
            return null;
          }

          await ctx.db.patch(messageId, {
            status: "read",
          });

          return messageId;
        })
      );

      const successfulUpdates = updates.filter((id): id is Id<"messages"> => id !== null);
      debug.log("Messages marked as read", { 
        updated: successfulUpdates.length,
        total: args.messageIds.length 
      });

      return successfulUpdates;
    } catch (error) {
      debug.error("Error marking messages as read", error);
      throw error;
    }
  },
}); 