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
    const now = new Date().toISOString();
    const defaultExpirationMs = 10 * 60 * 1000; // 10 minutes in milliseconds
    const expiresAt = args.expiresAt || new Date(Date.now() + defaultExpirationMs).toISOString();

    debug.log("Request initialization", {
      requesterId: args.requesterId,
      recipientId: args.recipientId,
      amount: args.amount,
      type: args.type,
      createdAt: now,
      expiresAt,
      timeUntilExpiration: `${defaultExpirationMs / 1000} seconds`
    });

    try {
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

      // Update the message with the request ID
      await ctx.db.patch(message, {
        metadata: {
          amount: args.amount,
          recipientId: args.recipientId,
          senderId: args.requesterId,
          visibility: "both",
          requestStatus: "pending",
          attachments: args.attachments,
          requestId: request
        }
      });

      debug.log("Payment request created", { 
        requestId: request,
        messageId: message,
        expiresAt,
        timeUntilExpiration: Math.floor((new Date(expiresAt).getTime() - new Date(now).getTime()) / 1000)
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
            status: "pending" as const
          }
        },
        createdAt: now,
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
      v.literal("approved"),
      v.literal("declined"),
      v.literal("cancelled"),
      v.literal("remind")
    ),
    note: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    debug.startGroup("Handle Request Action");
    
    try {
      debug.log("Action request received", {
        requestId: args.requestId,
        messageId: args.messageId,
        action: args.action,
        timestamp: new Date().toISOString()
      });

      const request = await ctx.db.get(args.requestId);
      if (!request) {
        debug.error("Request not found", { requestId: args.requestId });
        throw new Error("Payment request not found");
      }

      debug.log("Request details", {
        request: {
          id: request._id,
          status: request.status,
          requesterId: request.requesterId,
          recipientId: request.recipientId,
          amount: request.amount,
          type: request.type,
          expiresAt: request.metadata.expiresAt
        }
      });

      const message = await ctx.db.get(args.messageId);
      if (!message) {
        debug.error("Message not found", { messageId: args.messageId });
        throw new Error("Message not found");
      }

      const now = new Date().toISOString();
      
      // Validate action permissions
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        debug.error("Authentication failed", { identity });
        throw new Error("Not authenticated");
      }
      
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id")
        .filter((q) => q.eq(q.field("clerkId"), identity.subject))
        .unique();
      
      if (!user) {
        debug.error("User not found", { clerkId: identity.subject });
        throw new Error("User not found");
      }

      debug.log("Permission check", {
        userId: user._id,
        requesterId: request.requesterId,
        recipientId: request.recipientId,
        action: args.action,
        isRequester: request.requesterId === user._id,
        isRecipient: request.recipientId === user._id
      });

      // Check permissions
      if (args.action === "cancelled" && request.requesterId !== user._id) {
        debug.error("Permission denied - cancel", {
          userId: user._id,
          requesterId: request.requesterId
        });
        throw new Error("Only requester can cancel");
      }
      if ((args.action === "approved" || args.action === "declined") && 
          request.recipientId !== user._id) {
        debug.error("Permission denied - approve/decline", {
          userId: user._id,
          recipientId: request.recipientId,
          action: args.action
        });
        throw new Error("Only recipient can approve/decline");
      }

      // Check expiration
      const expirationDate = new Date(request.metadata.expiresAt);
      const isExpired = expirationDate < new Date();
      
      debug.log("Expiration check", {
        expiresAt: request.metadata.expiresAt,
        currentTime: now,
        isExpired,
        timeUntilExpiration: Math.floor((expirationDate.getTime() - new Date().getTime()) / 1000)
      });

      if (isExpired && args.action === "approved") {
        debug.error("Request expired", {
          expiresAt: request.metadata.expiresAt,
          currentTime: now
        });
        throw new Error("Cannot approve expired request");
      }

      // Handle action
      switch (args.action) {
        case "approved":
          await ctx.db.patch(args.requestId, {
            status: "approved",
            updatedAt: now
          });
          break;
        
        case "declined":
          await ctx.db.patch(args.requestId, {
            status: "declined",
            updatedAt: now,
            metadata: {
              ...request.metadata,
              declineReason: args.note
            }
          });
          break;
        
        case "cancelled":
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
                status: "pending" as const
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
        // Map payment request status to transaction status
        const getTransactionStatus = (action: typeof args.action) => {
          switch (action) {
            case "approved":
              return "completed" as const;
            case "declined":
            case "cancelled":
              return "failed" as const;
            default:
              return "pending" as const;
          }
        };

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
              status: getTransactionStatus(args.action)
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
    debug.startGroup("Get Request Details");
    debug.log("Query started", {
      requestId: args.requestId,
      timestamp: new Date().toISOString()
    });

    try {
      const request = await ctx.db.get(args.requestId);
      
      if (!request) {
        debug.error("Request not found", {
          requestId: args.requestId,
          timestamp: new Date().toISOString()
        });
        return { request: null, message: null, requester: null, recipient: null, isExpired: false };
      }

      debug.log("Request found", {
        requestId: args.requestId,
        request: {
          _id: request._id,
          status: request.status,
          amount: request.amount,
          type: request.type,
          expiresAt: request.metadata.expiresAt
        },
        timestamp: new Date().toISOString()
      });

      const message = await ctx.db.get(request.messageId);
      if (!message) {
        debug.error("Message not found", {
          requestId: args.requestId,
          messageId: request.messageId,
          timestamp: new Date().toISOString()
        });
        return { request, message: null, requester: null, recipient: null, isExpired: false };
      }

      const [requester, recipient] = await Promise.all([
        ctx.db.get(request.requesterId),
        ctx.db.get(request.recipientId)
      ]);

      const now = new Date();
      const expirationDate = new Date(request.metadata.expiresAt);
      const isExpired = expirationDate < now;
      const timeUntilExpiration = Math.floor((expirationDate.getTime() - now.getTime()) / 1000);

      debug.log("Request details complete", {
        requestId: args.requestId,
        messageId: request.messageId,
        expiresAt: request.metadata.expiresAt,
        currentTime: now.toISOString(),
        isExpired,
        timeUntilExpiration,
        hasRequester: !!requester,
        hasRecipient: !!recipient,
        timezoneOffset: now.getTimezoneOffset(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      debug.endGroup();
      return {
        request,
        message,
        requester,
        recipient,
        isExpired
      };
    } catch (error) {
      debug.error("Error fetching request details", {
        requestId: args.requestId,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
      debug.endGroup();
      throw error;
    }
  }
});

export const editPaymentRequest = mutation({
  args: {
    requestId: v.id("paymentRequests"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Payment request not found");
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes from now

    // Update the request
    await ctx.db.patch(args.requestId, {
      amount: args.amount,
      updatedAt: now,
      metadata: {
        ...request.metadata,
        expiresAt
      }
    });

    // Update the associated message
    const message = await ctx.db.get(request.messageId);
    if (message) {
      await ctx.db.patch(request.messageId, {
        metadata: {
          ...message.metadata,
          amount: args.amount
        }
      });
    }

    // Create notification for recipient
    await ctx.db.insert("notifications", {
      userId: request.recipientId,
      type: "payment_request",
      title: "Payment Request Updated",
      content: `The payment request amount has been updated to ${args.amount} sats`,
      status: "unread",
      metadata: {
        relatedId: args.requestId.toString(),
        relatedType: "payment_request",
        priority: "high",
        actionUrl: `/requests/${args.requestId}`,
        paymentData: {
          amount: args.amount,
          currency: request.currency,
          type: request.type,
          status: "pending" as const
        }
      },
      createdAt: now,
    });

    return {
      success: true,
      requestId: args.requestId,
      newAmount: args.amount,
      expiresAt
    };
  },
}); 