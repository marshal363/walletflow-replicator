import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const debug = {
  log: (message: string, data?: Record<string, unknown>) => {
    console.log("[CONVEX M(paymentRequests)] [LOG]", `'[Convex:PaymentRequests] ${message}'`, {
      ...data,
      timestamp: new Date().toISOString()
    });
  },
  error: (message: string, error?: unknown) => {
    console.error("[CONVEX M(paymentRequests)] [ERROR]", `'[Convex:PaymentRequests] ${message}'`, {
      error,
      timestamp: new Date().toISOString()
    });
  },
  startGroup: (name: string) => {
    console.log("[CONVEX M(paymentRequests)] [GROUP_START]", `'[Convex:PaymentRequests] ${name}'`, {
      timestamp: new Date().toISOString()
    });
  },
  endGroup: () => {
    console.log("[CONVEX M(paymentRequests)] [GROUP_END]", {
      timestamp: new Date().toISOString()
    });
  }
};

// Get payment requests for a user
export const getPaymentRequests = query({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("requester"), v.literal("recipient")),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("declined"),
        v.literal("cancelled"),
        v.literal("completed")
      )
    ),
  },
  handler: async (ctx, args) => {
    const field = args.role === "requester" ? "requesterId" : "recipientId";
    let query = ctx.db
      .query("paymentRequests")
      .withIndex(`by_${args.role}`, (q) => q.eq(field, args.userId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    return await query.order("desc").collect();
  },
});

// Create a new payment request
export const createPaymentRequest = mutation({
  args: {
    requesterId: v.id("users"),
    recipientId: v.id("users"),
    conversationId: v.id("conversations"),
    amount: v.number(),
    type: v.union(v.literal("lightning"), v.literal("onchain")),
    description: v.string(),
    expiresAt: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    // Create the message first
    const message = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.requesterId,
      content: args.description,
      timestamp: now,
      status: "sent",
      type: "payment_request",
      metadata: {
        amount: args.amount,
        recipientId: args.recipientId,
        senderId: args.requesterId,
        requestStatus: "pending",
        visibility: "both"
      },
    });

    // Create the payment request
    const request = await ctx.db.insert("paymentRequests", {
      requesterId: args.requesterId,
      recipientId: args.recipientId,
      messageId: message,
      amount: args.amount,
      currency: "BTC",
      type: args.type,
      status: "pending",
      metadata: {
        description: args.description,
        expiresAt: args.expiresAt,
        paymentRequest: "",
        customData: {
          category: "direct_request",
        }
      },
      createdAt: now,
      updatedAt: now
    });

    // Create a notification for the recipient
    await ctx.db.insert("notifications", {
      userId: args.recipientId,
      type: "payment_request",
      title: "New Payment Request",
      content: `You have a new payment request for ${args.amount} sats`,
      status: "unread",
      metadata: {
        relatedId: request.toString(),
        relatedType: "payment_request",
        priority: "high",
        actionUrl: `/requests/${request}`,
        paymentData: {
          amount: args.amount,
          currency: "BTC",
          type: args.type,
          status: "pending"
        }
      },
      createdAt: now,
    });

    return request;
  },
});

// Update payment request status
export const updatePaymentRequestStatus = mutation({
  args: {
    requestId: v.id("paymentRequests"),
    status: v.union(
      v.literal("approved"),
      v.literal("declined"),
      v.literal("cancelled"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Payment request not found");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(args.requestId, {
      status: args.status,
      updatedAt: now,
    });

    // Create a notification for the requester
    await ctx.db.insert("notifications", {
      userId: request.requesterId,
      type: "payment_request",
      title: "Payment Request Updated",
      content: `Your payment request has been ${args.status}`,
      status: "unread",
      metadata: {
        relatedId: args.requestId.toString(),
        relatedType: "payment_request",
        priority: "medium",
        actionUrl: `/requests/${args.requestId}`,
        paymentData: {
          amount: request.amount,
          currency: request.currency,
          type: request.type,
          status: "completed"
        }
      },
      createdAt: now,
    });

    return request;
  },
});

// Create a new payment request from chat
export const createChatPaymentRequest = mutation({
  args: {
    requesterId: v.id("users"),
    recipientId: v.id("users"),
    conversationId: v.id("conversations"),
    amount: v.number(),
    description: v.optional(v.string()),
    type: v.union(v.literal("lightning"), v.literal("onchain")),
    expiresAt: v.optional(v.string()),
    attachments: v.optional(v.array(v.string())),
    customData: v.optional(v.object({
      category: v.string(),
      notes: v.optional(v.string()),
      tags: v.optional(v.array(v.string()))
    }))
  },
  handler: async (ctx, args) => {
    debug.startGroup("Create Chat Payment Request");
    debug.log("Starting request creation", {
      requesterId: args.requesterId,
      recipientId: args.recipientId,
      amount: args.amount,
      type: args.type,
      conversationId: args.conversationId
    });

    try {
      const now = new Date().toISOString();
      const expiresAt = args.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      // Validate users exist
      const requester = await ctx.db.get(args.requesterId);
      const recipient = await ctx.db.get(args.recipientId);

      if (!requester || !recipient) {
        debug.error("User validation failed", {
          hasRequester: !!requester,
          hasRecipient: !!recipient,
          requesterId: args.requesterId,
          recipientId: args.recipientId
        });
        throw new Error("Invalid users for payment request");
      }

      debug.log("Users validated", {
        requester: {
          id: requester._id,
          fullName: requester.fullName
        },
        recipient: {
          id: recipient._id,
          fullName: recipient.fullName
        }
      });

      // Validate conversation exists and users are participants
      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation) {
        debug.error("Conversation not found", { conversationId: args.conversationId });
        throw new Error("Conversation not found");
      }

      if (!conversation.participants.includes(args.requesterId) || 
          !conversation.participants.includes(args.recipientId)) {
        debug.error("Invalid conversation participants", {
          conversationId: args.conversationId,
          participants: conversation.participants,
          requesterId: args.requesterId,
          recipientId: args.recipientId
        });
        throw new Error("Invalid conversation participants");
      }

      debug.log("Conversation validated", {
        conversationId: args.conversationId,
        participants: conversation.participants
      });
      
      // Create the message first
      debug.log("Creating payment request message");
      const message = await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        senderId: args.requesterId,
        content: args.description || `Requested ${args.amount} sats`,
        timestamp: now,
        status: "sent",
        type: "payment_request",
        metadata: {
          amount: args.amount,
          recipientId: args.recipientId,
          senderId: args.requesterId,
          visibility: "both",
          requestStatus: "pending",
          attachments: args.attachments
        },
      });

      debug.log("Message created", { messageId: message });

      // Create the payment request
      debug.log("Creating payment request record");
      const request = await ctx.db.insert("paymentRequests", {
        requesterId: args.requesterId,
        recipientId: args.recipientId,
        messageId: message,
        amount: args.amount,
        currency: "BTC",
        type: args.type,
        status: "pending",
        metadata: {
          description: args.description || `Payment request for ${args.amount} sats`,
          expiresAt,
          paymentRequest: "",
          customData: {
            category: args.customData?.category || "chat_request",
            notes: args.customData?.notes,
            tags: args.customData?.tags || []
          }
        },
        createdAt: now,
        updatedAt: now
      });

      debug.log("Payment request created", { requestId: request });

      // Create a notification for the recipient
      await ctx.db.insert("notifications", {
        userId: args.recipientId,
        type: "payment_request",
        title: "New Payment Request",
        content: `You have a new payment request for ${args.amount} sats`,
        status: "unread",
        metadata: {
          relatedId: request.toString(),
          relatedType: "payment_request",
          priority: "high",
          actionUrl: `/requests/${request}`,
          paymentData: {
            amount: args.amount,
            currency: "BTC",
            type: args.type,
            status: "pending"
          }
        },
        createdAt: now,
      });

      debug.log("Request creation completed", {
        requestId: request,
        messageId: message,
        expiresAt
      });

      debug.endGroup();
      return {
        requestId: request,
        messageId: message,
        expiresAt
      };
    } catch (error) {
      debug.error("Request creation failed", error);
      debug.endGroup();
      throw error;
    }
  }
});

// Handle request actions (approve, decline, cancel, remind)
export const handleRequestAction = mutation({
  args: {
    requestId: v.id("paymentRequests"),
    messageId: v.id("messages"),
    action: v.union(
      v.literal("approve"),
      v.literal("decline"),
      v.literal("cancel"),
      v.literal("remind")
    ),
    note: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    debug.startGroup("Handle Request Action");
    
    try {
      const request = await ctx.db.get(args.requestId);
      if (!request) throw new Error("Payment request not found");

      const message = await ctx.db.get(args.messageId);
      if (!message) throw new Error("Message not found");

      const now = new Date().toISOString();
      
      // Validate action permissions
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Not authenticated");
      
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id")
        .filter((q) => q.eq(q.field("clerkId"), identity.subject))
        .unique();
      
      if (!user) throw new Error("User not found");

      // Check permissions
      if (args.action === "cancel" && request.requesterId !== user._id) {
        throw new Error("Only requester can cancel");
      }
      if ((args.action === "approve" || args.action === "decline") && 
          request.recipientId !== user._id) {
        throw new Error("Only recipient can approve/decline");
      }

      // Handle action
      switch (args.action) {
        case "approve":
          await ctx.db.patch(args.requestId, {
            status: "approved",
            updatedAt: now
          });
          break;
        
        case "decline":
          await ctx.db.patch(args.requestId, {
            status: "declined",
            updatedAt: now,
            metadata: {
              ...request.metadata,
              declineReason: args.note
            }
          });
          break;
        
        case "cancel":
          await ctx.db.patch(args.requestId, {
            status: "cancelled",
            updatedAt: now,
            metadata: {
              ...request.metadata,
              cancelReason: args.note
            }
          });
          break;
        
        case "remind":
          // Create reminder notification
          await ctx.db.insert("notifications", {
            userId: request.recipientId,
            type: "payment_request",
            title: "Payment Request Reminder",
            content: `Reminder: You have a pending payment request for ${request.amount} sats`,
            status: "unread",
            metadata: {
              relatedId: request._id.toString(),
              relatedType: "payment_request",
              priority: "medium",
              actionUrl: `/requests/${request._id}`,
              paymentData: {
                amount: request.amount,
                currency: request.currency,
                type: request.type,
                status: request.status
              }
            },
            createdAt: now
          });
          break;
      }

      // Update message metadata
      await ctx.db.patch(args.messageId, {
        metadata: {
          ...message.metadata,
          requestStatus: args.action === "remind" ? message.metadata.requestStatus : args.action
        }
      });

      // Create notification for requester (except for remind action)
      if (args.action !== "remind") {
        await ctx.db.insert("notifications", {
          userId: request.requesterId,
          type: "payment_request",
          title: "Payment Request Updated",
          content: `Your payment request has been ${args.action}${args.note ? `: ${args.note}` : ""}`,
          status: "unread",
          metadata: {
            relatedId: args.requestId.toString(),
            relatedType: "payment_request",
            priority: "medium",
            actionUrl: `/requests/${args.requestId}`,
            paymentData: {
              amount: request.amount,
              currency: request.currency,
              type: request.type,
              status: args.action
            }
          },
          createdAt: now
        });
      }

      debug.log("Request action completed", {
        action: args.action,
        requestId: args.requestId,
        messageId: args.messageId
      });

      return {
        success: true,
        action: args.action,
        requestId: args.requestId,
        messageId: args.messageId
      };
    } catch (error) {
      debug.error("Request action failed", error);
      throw error;
    }
  }
});

// Get request history
export const getRequestHistory = query({
  args: {
    requestId: v.id("paymentRequests")
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Payment request not found");

    // Get all related notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_related")
      .filter((q) => q.eq(q.field("metadata.relatedId"), args.requestId.toString()))
      .collect();

    // Get message
    const message = await ctx.db.get(request.messageId);

    return {
      request,
      message,
      history: notifications.map(notification => ({
        timestamp: notification.createdAt,
        type: notification.type,
        action: notification.metadata.paymentData.status,
        content: notification.content
      }))
    };
  }
});

// Get request details
export const getRequestDetails = query({
  args: {
    requestId: v.id("paymentRequests")
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Payment request not found");

    const message = await ctx.db.get(request.messageId);
    if (!message) throw new Error("Message not found");

    const requester = await ctx.db.get(request.requesterId);
    const recipient = await ctx.db.get(request.recipientId);

    return {
      request,
      message,
      requester,
      recipient,
      isExpired: new Date(request.metadata.expiresAt) < new Date()
    };
  }
}); 