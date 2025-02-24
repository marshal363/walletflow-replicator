import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { GenericDatabaseWriter } from "convex/server";
import { DataModel } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";

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

// Add PaymentRequest type at the top of the file
type PaymentRequest = {
  _id: Id<"paymentRequests">;
  requesterId: Id<"users">;
  recipientId: Id<"users">;
  messageId: Id<"messages">;
  amount: number;
  currency: string;
  type: "lightning" | "onchain";
  status: "pending" | "approved" | "declined" | "cancelled" | "completed";
  metadata: {
    description: string;
    expiresAt: string;
    paymentRequest: string;
    customData: {
      category: string;
      notes?: string;
      tags?: string[];
    };
    declineReason?: string;
    cancelReason?: string;
  };
  createdAt: string;
  updatedAt: string;
};

// Helper function to create notifications with proper typing
async function createPaymentRequestNotification(
  ctx: MutationCtx,
  {
    userId,
    title,
    description,
    request,
    role,
    action,
    note
  }: {
    userId: Id<"users">;
    title: string;
    description: string;
    request: PaymentRequest;
    role: "sender" | "recipient";
    action: string;
    note?: string;
  }
) {
  const now = new Date().toISOString();
  
  return await ctx.db.insert("notifications", {
    userId,
    type: "payment_request" as const,
    title,
    description,
    status: "active" as const,
    priority: {
      base: role === "sender" ? "medium" : "high",
      modifiers: {
        actionRequired: role === "recipient",
        timeConstraint: true,
        amount: request.amount,
        role
      },
      calculatedPriority: role === "sender" ? 45 : 85
    },
    displayLocation: "suggested_actions" as const,
    metadata: {
      gradient: action === "approved" 
        ? "from-green-500 to-green-600" 
        : action === "declined" 
        ? "from-red-500 to-red-600"
        : "from-blue-500 via-purple-500 to-purple-600",
      actionRequired: role === "recipient",
      dismissible: true,
      relatedEntityId: request._id.toString(),
      relatedEntityType: "payment_request",
      counterpartyId: role === "sender" ? request.recipientId : request.requesterId,
      visibility: `${role}_only` as const,
      role,
      paymentData: {
        amount: request.amount,
        currency: request.currency,
        type: request.type,
        status: action === "approved" ? "completed" : "failed"
      }
    },
    createdAt: now,
    updatedAt: now
  });
}

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

    // Create notification for recipient
    await ctx.db.insert("notifications", {
      userId: args.recipientId,
      type: "payment_request",
      title: "New Payment Request",
      description: `You have a new payment request for ${args.amount} sats`,
      status: "active",
      priority: {
        base: "high",
        modifiers: {
          actionRequired: true,
          timeConstraint: true,
          amount: args.amount,
          role: "recipient"
        },
        calculatedPriority: 85
      },
      displayLocation: "suggested_actions",
      metadata: {
        gradient: "from-blue-500 via-purple-500 to-purple-600",
        actionRequired: true,
        dismissible: true,
        relatedEntityId: request.toString(),
        relatedEntityType: "payment_request",
        counterpartyId: args.requesterId,
        visibility: "recipient_only",
        role: "recipient",
        paymentData: {
          amount: args.amount,
          currency: "BTC",
          type: args.type,
          status: "pending"
        }
      },
      createdAt: now,
      updatedAt: now
    });

    // Create notification for requester
    await ctx.db.insert("notifications", {
      userId: args.requesterId,
      type: "payment_request",
      title: "Payment Request Sent",
      description: `You sent a payment request for ${args.amount} sats`,
      status: "active",
      priority: {
        base: "medium",
        modifiers: {
          actionRequired: false,
          timeConstraint: true,
          amount: args.amount,
          role: "sender"
        },
        calculatedPriority: 45
      },
      displayLocation: "suggested_actions",
      metadata: {
        gradient: "from-blue-500 via-purple-500 to-purple-600",
        actionRequired: false,
        dismissible: true,
        relatedEntityId: request.toString(),
        relatedEntityType: "payment_request",
        counterpartyId: args.recipientId,
        visibility: "sender_only",
        role: "sender",
        paymentData: {
          amount: args.amount,
          currency: "BTC",
          type: args.type,
          status: "pending"
        }
      },
      createdAt: now,
      updatedAt: now
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
      description: `Your payment request has been ${args.status}`,
      status: "active",
      metadata: {
        gradient: "from-blue-500 via-purple-500 to-purple-600",
        actionRequired: true,
        dismissible: true,
        relatedEntityId: args.requestId.toString(),
        relatedEntityType: "payment_request",
        counterpartyId: args.userId,
        visibility: "recipient_only",
        role: "recipient",
        paymentData: {
          amount: request.amount,
          currency: "BTC",
          type: "lightning",
          status: "pending"
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
    const defaultExpirationMs = 60 * 1000; // 1 minute in milliseconds
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

      // Create notification for recipient
      await ctx.db.insert("notifications", {
        userId: args.recipientId,
        type: "payment_request",
        title: "New Payment Request",
        description: ` ${args.amount} sats from @${requester.username}`,
        status: "active",
        priority: {
          base: "high",
          modifiers: {
            actionRequired: true,
            timeConstraint: true,
            amount: args.amount,
            role: "recipient"
          },
          calculatedPriority: 85
        },
        displayLocation: "suggested_actions",
        metadata: {
          gradient: "from-blue-500 via-purple-500 to-purple-600",
          actionRequired: true,
          dismissible: true,
          relatedEntityId: request.toString(),
          relatedEntityType: "payment_request",
          counterpartyId: args.requesterId,
          visibility: "recipient_only",
          role: "recipient",
          paymentData: {
            amount: args.amount,
            currency: "BTC",
            type: args.type,
            status: "pending"
          }
        },
        createdAt: now,
        updatedAt: now
      });

      // Create notification for requester
      await ctx.db.insert("notifications", {
        userId: args.requesterId,
        type: "payment_request",
        title: "Payment Request Sent",
        description: `for ${args.amount} sats to @${recipient.username}`,
        status: "active",
        priority: {
          base: "medium",
          modifiers: {
            actionRequired: false,
            timeConstraint: true,
            amount: args.amount,
            role: "sender"
          },
          calculatedPriority: 45
        },
        displayLocation: "suggested_actions",
        metadata: {
          gradient: "from-blue-500 via-purple-500 to-purple-600",
          actionRequired: false,
          dismissible: true,
          relatedEntityId: request.toString(),
          relatedEntityType: "payment_request",
          counterpartyId: args.recipientId,
          visibility: "sender_only",
          role: "sender",
          paymentData: {
            amount: args.amount,
            currency: "BTC",
            type: args.type,
            status: "pending"
          }
        },
        createdAt: now,
        updatedAt: now
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
    messageId: v.optional(v.id("messages")),
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

      // Update request status first
      await ctx.db.patch(args.requestId, {
        status: args.action === "remind" ? "pending" : args.action,
        updatedAt: now,
        metadata: {
          ...request.metadata,
          ...(args.action === "declined" && args.note ? { declineReason: args.note } : {}),
          ...(args.action === "cancelled" && args.note ? { cancelReason: args.note } : {})
        }
      });

      debug.log("Request status updated", {
        requestId: args.requestId,
        oldStatus: request.status,
        newStatus: args.action === "remind" ? "pending" : args.action,
        timestamp: now
      });

      // Update message status if messageId is provided
      if (args.messageId) {
        const message = await ctx.db.get(args.messageId);
        if (message) {
          await ctx.db.patch(args.messageId, {
            metadata: {
              ...message.metadata,
              requestStatus: args.action === "remind" ? "pending" : args.action
            }
          });

          debug.log("Message status updated", {
            messageId: args.messageId,
            oldStatus: message.metadata.requestStatus,
            newStatus: args.action === "remind" ? "pending" : args.action,
            timestamp: now
          });
        }
      }

      // Create notifications for cancel action
      if (args.action === "cancelled") {
        // Notification for requester (who cancelled)
        await ctx.db.insert("notifications", {
          userId: request.requesterId,
          type: "payment_request" as const,
          title: "Payment Request Cancelled",
          description: "You cancelled the payment request",
          status: "active" as const,
          priority: {
            base: "medium" as const,
            modifiers: {
              actionRequired: false,
              timeConstraint: false,
              amount: request.amount,
              role: "sender" as const
            },
            calculatedPriority: 45
          },
          displayLocation: "suggested_actions" as const,
          metadata: {
            gradient: "from-gray-500 to-gray-600",
            actionRequired: false,
            dismissible: true,
            relatedEntityId: request._id.toString(),
            relatedEntityType: "payment_request",
            counterpartyId: request.recipientId,
            visibility: "sender_only" as const,
            role: "sender" as const,
            paymentData: {
              amount: request.amount,
              currency: request.currency,
              type: request.type,
              status: "failed"
            }
          },
          createdAt: now,
          updatedAt: now
        });

        // Notification for recipient
        await ctx.db.insert("notifications", {
          userId: request.recipientId,
          type: "payment_request" as const,
          title: "Payment Request Cancelled",
          description: `by the @${request.requesterId}`,
          status: "active" as const,
          priority: {
            base: "medium" as const,
            modifiers: {
              actionRequired: false,
              timeConstraint: false,
              amount: request.amount,
              role: "recipient" as const
            },
            calculatedPriority: 45
          },
          displayLocation: "suggested_actions" as const,
          metadata: {
            gradient: "from-gray-500 to-gray-600",
            actionRequired: false,
            dismissible: true,
            relatedEntityId: request._id.toString(),
            relatedEntityType: "payment_request",
            counterpartyId: request.requesterId,
            visibility: "recipient_only" as const,
            role: "recipient" as const,
            paymentData: {
              amount: request.amount,
              currency: request.currency,
              type: request.type,
              status: "failed"
            }
          },
          createdAt: now,
          updatedAt: now
        });
      }

      debug.log("Request action completed", {
        action: args.action,
        requestId: args.requestId,
        messageId: args.messageId,
        notifications: "created",
        timestamp: now
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
    } finally {
      debug.endGroup();
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
      .filter((q) => q.eq(q.field("metadata.relatedEntityId"), args.requestId.toString()))
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
    const expiresAt = new Date(Date.now() + 60 * 1000).toISOString(); // 1 minute from now

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
      status: "active",
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