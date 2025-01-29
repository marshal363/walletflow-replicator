import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get messages for a conversation between two users
export const getConversation = query({
  args: {
    userId1: v.id("users"),
    userId2: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("senderId", args.userId1).eq("receiverId", args.userId2)
      )
      .order("desc")
      .take(args.limit ?? 50);

    const otherMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("senderId", args.userId2).eq("receiverId", args.userId1)
      )
      .order("desc")
      .take(args.limit ?? 50);

    return [...messages, ...otherMessages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  },
});

// Get all conversations for a user
export const getConversationList = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const sentMessages = await ctx.db
      .query("messages")
      .withIndex("by_sender", (q) => q.eq("senderId", args.userId))
      .collect();

    const receivedMessages = await ctx.db
      .query("messages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", args.userId))
      .collect();

    const conversations = new Map();
    
    [...sentMessages, ...receivedMessages].forEach((msg) => {
      const otherId = msg.senderId === args.userId ? msg.receiverId : msg.senderId;
      if (!conversations.has(otherId) || 
          new Date(conversations.get(otherId).timestamp) < new Date(msg.timestamp)) {
        conversations.set(otherId, msg);
      }
    });

    return Array.from(conversations.values());
  },
});

// Send a new message
export const sendMessage = mutation({
  args: {
    senderId: v.id("users"),
    receiverId: v.id("users"),
    type: v.union(
      v.literal("text"),
      v.literal("payment_request"),
      v.literal("payment_sent"),
      v.literal("payment_received")
    ),
    content: v.string(),
    metadata: v.optional(
      v.object({
        paymentAmount: v.optional(v.number()),
        paymentCurrency: v.optional(v.string()),
        paymentStatus: v.optional(
          v.union(
            v.literal("pending"),
            v.literal("completed"),
            v.literal("expired"),
            v.literal("cancelled")
          )
        ),
        attachments: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.insert("messages", {
      senderId: args.senderId,
      receiverId: args.receiverId,
      type: args.type,
      content: args.content,
      status: "sent",
      metadata: args.metadata,
      timestamp: new Date().toISOString(),
    });

    // Create a notification for the receiver
    await ctx.db.insert("notifications", {
      userId: args.receiverId,
      type: "message",
      title: "New Message",
      content: `You have a new ${args.type} message`,
      status: "unread",
      metadata: {
        relatedId: message,
        priority: args.type === "payment_request" ? "high" : "medium",
      },
      createdAt: new Date().toISOString(),
    });

    return message;
  },
});

// Update message status
export const updateMessageStatus = mutation({
  args: {
    messageId: v.id("messages"),
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.messageId, {
      status: args.status,
    });
  },
}); 