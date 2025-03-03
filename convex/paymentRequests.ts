import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { GenericDatabaseWriter } from "convex/server";
import { DataModel } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import { cronJobs } from "convex/server";
//import { Crons } from "convex/server";
//import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { defineSchema, defineTable } from "convex/server";

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

// Add type definitions at the top of the file
type NotificationStatus = "active" | "dismissed" | "actioned" | "expired";
type PaymentStatus = "pending" | "completed" | "failed" | "expired";
type RequestStatus = "pending" | "approved" | "declined" | "cancelled" | "completed" | "expired";
type NotificationType = "system" | "payment_request" | "payment_sent" | "payment_received" | "security";
type DisplayLocation = "suggested_actions" | "toast" | "both";
type Role = "sender" | "recipient";
type Visibility = "sender_only" | "recipient_only" | "both";

type PaymentData = {
  amount: number;
  currency: string;
  type: "lightning" | "onchain";
  status: PaymentStatus;
};

type NotificationMetadata = {
  gradient: string;
  expiresAt?: string;
  actionRequired: boolean;
  dismissible: boolean;
  relatedEntityId?: string;
  relatedEntityType?: string;
  counterpartyId?: Id<"users">;
  visibility: Visibility;
  role: Role;
  paymentData?: PaymentData;
};

type NotificationPriority = {
  base: "high" | "medium" | "low";
  modifiers: {
    actionRequired: boolean;
    timeConstraint: boolean;
    amount: number;
    role: Role;
  };
  calculatedPriority: number;
};

type Notification = {
  _id: Id<"notifications">;
  userId: Id<"users">;
  type: NotificationType;
  title: string;
  description: string;
  status: NotificationStatus;
  priority: NotificationPriority;
  displayLocation: DisplayLocation;
  metadata: NotificationMetadata;
  createdAt: string;
  updatedAt: string;
};

// Update the base types to match our schema
type PaymentRequestStatus = "pending" | "approved" | "declined" | "cancelled" | "completed" | "expired";

// Update PaymentRequest type
export type PaymentRequest = {
  _id: Id<"paymentRequests">;
  requesterId: Id<"users">;
  recipientId: Id<"users">;
  messageId: Id<"messages">;
  amount: number;
  currency: string;
  type: "lightning" | "onchain";
  status: PaymentRequestStatus;
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
    expiredAt?: string;
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
    messageId: v.id("messages"),
    amount: v.number(),
    currency: v.string(),
    type: v.union(v.literal("lightning"), v.literal("onchain")),
    description: v.string(),
    expiresAt: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date();
    // Set expiration date to 24 hours from now
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    
    console.log("Creating payment request with expiration", {
      timestamp: now.toISOString(),
      expiresAt,
      type: args.type,
      amount: args.amount
    });

    const request = await ctx.db.insert("paymentRequests", {
      requesterId: args.requesterId,
      recipientId: args.recipientId,
      messageId: args.messageId,
      amount: args.amount,
      currency: args.currency,
      type: args.type,
      status: "pending",
      metadata: {
        description: args.description,
        expiresAt,
        paymentRequest: "",
        customData: {
          category: "direct_request",
          notes: "",
          tags: []
        }
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });

    // Create notification with expiration
    await ctx.db.insert("notifications", {
      userId: args.requesterId,
      type: "payment_request",
      title: "Payment Request Created",
      description: "Your payment request is pending",
      status: "active",
      priority: {
        base: "medium",
        modifiers: {
          actionRequired: true,
          timeConstraint: true,
          amount: args.amount,
          role: "sender"
        },
        calculatedPriority: 45
      },
      displayLocation: "suggested_actions",
      metadata: {
        gradient: "from-blue-500 via-purple-500 to-purple-600",
        expiresAt,
        actionRequired: true,
        dismissible: false,
        relatedEntityId: request.toString(),
        relatedEntityType: "payment_request",
        visibility: "sender_only",
        role: "sender",
        paymentData: {
          amount: args.amount,
          currency: args.currency,
          type: args.type,
          status: "pending"
        }
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });

    console.log("Created payment request and notification", {
      requestId: request,
      expiresAt,
      timestamp: now.toISOString()
    });

    return request;
  },
});

// Update payment request status
export const updatePaymentRequestStatus = mutation({
  args: {
    paymentRequestId: v.id("paymentRequests"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("cancelled"),
      v.literal("completed"),
      v.literal("expired")
    ),
    reason: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.paymentRequestId);
    if (!request) {
      throw new Error("Payment request not found");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(args.paymentRequestId, {
      status: args.status,
      updatedAt: now,
      metadata: {
        ...request.metadata,
        ...(args.status === "declined" && args.reason ? { declineReason: args.reason } : {}),
        ...(args.status === "cancelled" && args.reason ? { cancelReason: args.reason } : {}),
        ...(args.status === "expired" ? { expiredAt: now } : {})
      }
    });

    // Create notification for status update
    await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
      userId: request.recipientId,
      type: "payment_request",
      title: `Payment Request ${args.status}`,
      description: `Your payment request has been ${args.status}`,
      metadata: {
        gradient: "blue",
        actionRequired: false,
        dismissible: true,
        relatedEntityId: args.paymentRequestId.toString(),
        relatedEntityType: "payment_request",
        counterpartyId: request.recipientId,
        visibility: "both",
        role: "recipient",
        paymentData: {
          amount: request.amount,
          currency: request.currency,
          type: request.type,
          status: "pending"
        }
      }
    });

    return { success: true };
  }
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

      // Add detailed logging for user objects
      debug.log("User objects retrieved", {
        requester: JSON.stringify(requester),
        recipient: JSON.stringify(recipient),
        requesterUsername: requester?.username,
        recipientUsername: recipient?.username
      });

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
      debug.log("Creating recipient notification", {
        recipientId: args.recipientId,
        requesterUsername: requester.username,
        notificationDescription: ` ${args.amount} sats from @${requester.username}`
      });
      
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
      debug.log("Creating requester notification", {
        requesterId: args.requesterId,
        recipientUsername: recipient.username,
        notificationDescription: `for ${args.amount} sats to @${recipient.username}`
      });
      
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
      v.literal("remind"),
      v.literal("expired")
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

      const newStatus = args.action === "remind" ? "pending" : args.action;
      
      // Update request status first
      await ctx.db.patch(args.requestId, {
        status: newStatus,
        updatedAt: now,
        metadata: {
          ...request.metadata,
          ...(args.action === "declined" && args.note ? { declineReason: args.note } : {}),
          ...(args.action === "cancelled" && args.note ? { cancelReason: args.note } : {}),
          ...(args.action === "expired" ? { expiredAt: now } : {})
        }
      });

      debug.log("Request status updated", {
        requestId: args.requestId,
        oldStatus: request.status,
        newStatus,
        timestamp: now
      });

      // Update message status if messageId is provided
      if (args.messageId) {
        const message = await ctx.db.get(args.messageId);
        if (message) {
          await ctx.db.patch(args.messageId, {
            metadata: {
              ...message.metadata,
              requestStatus: newStatus
            }
          });

          debug.log("Message status updated", {
            messageId: args.messageId,
            oldStatus: message.metadata.requestStatus,
            newStatus,
            timestamp: now
          });
        }
      }

      // Find and update existing notifications for this request
      const existingNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_related")
        .filter((q) => q.eq(q.field("metadata.relatedEntityId"), args.requestId.toString()))
        .collect();

      debug.log("Existing notifications", {
        count: existingNotifications.length,
        notificationIds: existingNotifications.map(n => n._id)
      });

      // Map action to payment status
      const paymentStatus = 
        args.action === "approved" ? "completed" :
        args.action === "declined" || args.action === "cancelled" ? "failed" :
        args.action === "expired" ? "expired" :
        "pending";

      // Update existing notifications with new status
      for (const notification of existingNotifications) {
        await ctx.db.patch(notification._id, {
          updatedAt: now,
          metadata: {
            ...notification.metadata,
            paymentData: {
              ...notification.metadata.paymentData,
              status: paymentStatus
            }
          }
        });
        
        debug.log("Updated notification", {
          notificationId: notification._id,
          oldStatus: notification.metadata.paymentData?.status,
          newStatus: paymentStatus
        });
      }

      // Create notifications for expired action
      if (args.action === "expired") {
        // Look up requester user object to get username
        const requester = await ctx.db.get(request.requesterId);
        const requesterUsername = requester?.username || "Unknown user";
        
        debug.log("Creating expiration notifications", {
          requesterId: request.requesterId,
          requesterUsername,
          recipientId: request.recipientId
        });

        // Notification for requester
        await ctx.db.insert("notifications", {
          userId: request.requesterId,
          type: "payment_request",
          title: "Payment Request Expired",
          description: "Your payment request has expired",
          status: "active",
          priority: {
            base: "medium",
            modifiers: {
              actionRequired: false,
              timeConstraint: false,
              amount: request.amount,
              role: "sender"
            },
            calculatedPriority: 45
          },
          displayLocation: "suggested_actions",
          metadata: {
            gradient: "from-red-500 to-red-600",
            actionRequired: false,
            dismissible: true,
            relatedEntityId: request._id.toString(),
            relatedEntityType: "payment_request",
            counterpartyId: request.recipientId,
            visibility: "sender_only",
            role: "sender",
            paymentData: {
              amount: request.amount,
              currency: request.currency,
              type: request.type,
              status: "expired"
            }
          },
          createdAt: now,
          updatedAt: now
        });

        // Notification for recipient
        await ctx.db.insert("notifications", {
          userId: request.recipientId,
          type: "payment_request",
          title: "Payment Request Expired",
          description: `from @${requesterUsername}`,
          status: "active",
          priority: {
            base: "medium",
            modifiers: {
              actionRequired: false,
              timeConstraint: false,
              amount: request.amount,
              role: "recipient"
            },
            calculatedPriority: 45
          },
          displayLocation: "suggested_actions",
          metadata: {
            gradient: "from-red-500 to-red-600",
            actionRequired: false,
            dismissible: true,
            relatedEntityId: request._id.toString(),
            relatedEntityType: "payment_request",
            counterpartyId: request.requesterId,
            visibility: "recipient_only",
            role: "recipient",
            paymentData: {
              amount: request.amount,
              currency: request.currency,
              type: request.type,
              status: "expired"
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
        messageId: args.requestId,
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

// Add a scheduled function to check for expired requests
export const checkExpiredRequests = internalMutation({
  handler: async (ctx) => {
    debug.startGroup("Check Expired Requests");
    const now = new Date();
    
    debug.log("Starting scheduled expiration check", {
      timestamp: now.toISOString(),
      cronInterval: "*/5 * * * *",
      jobType: "scheduled"
    });
    
    try {
      // Find pending requests that have expired
      const pendingRequests = await ctx.db
        .query("paymentRequests")
        .filter((q) => q.eq(q.field("status"), "pending"))
        .collect();
      
      debug.log("Found pending requests", {
        count: pendingRequests.length,
        requestIds: pendingRequests.map(r => r._id),
        currentTime: now.toISOString()
      });
      
      if (pendingRequests.length === 0) {
        debug.log("No pending requests to check for expiration", {
          timestamp: now.toISOString()
        });
        debug.endGroup();
        return;
      }
      
      // Check each request for expiration
      const expiredRequests = pendingRequests.filter(request => {
        const expiresAt = new Date(request.metadata.expiresAt);
        const isExpired = expiresAt < now;
        const timeDifference = (now.getTime() - expiresAt.getTime()) / 1000;
        
        debug.log("Checking request expiration", {
          requestId: request._id,
          expiresAt: request.metadata.expiresAt,
          expiresAtTimestamp: expiresAt.getTime(),
          nowTimestamp: now.getTime(),
          isExpired,
          timeDifference,
          timeDifferenceMinutes: Math.floor(timeDifference / 60),
          status: request.status
        });
        
        return isExpired;
      });
      
      debug.log("Found expired requests", {
        count: expiredRequests.length,
        requestIds: expiredRequests.map(r => r._id),
        timestamp: now.toISOString()
      });
      
      if (expiredRequests.length === 0) {
        debug.log("No expired requests found", {
          timestamp: now.toISOString()
        });
        debug.endGroup();
        return;
      }
      
      // Process each expired request
      for (const request of expiredRequests) {
        debug.log("Processing expired request", {
          requestId: request._id,
          expiresAt: request.metadata.expiresAt,
          currentTime: now.toISOString(),
          status: request.status
        });
        
        // Update request status to expired
        await ctx.db.patch(request._id, {
          status: "expired",
          updatedAt: now.toISOString()
        });
        
        debug.log("Updated request status to expired", {
          requestId: request._id,
          oldStatus: request.status,
          newStatus: "expired",
          timestamp: now.toISOString()
        });
        
        // Update existing notifications
        const existingNotifications = await ctx.db
          .query("notifications")
          .withIndex("by_related")
          .filter((q) => q.eq(q.field("metadata.relatedEntityId"), request._id.toString()))
          .collect();
        
        for (const notification of existingNotifications) {
          await ctx.db.patch(notification._id, {
            updatedAt: now.toISOString(),
            metadata: {
              ...notification.metadata,
              paymentData: {
                ...notification.metadata.paymentData,
                status: "expired"
              }
            }
          });
          
          debug.log("Updated notification for expired request", {
            notificationId: notification._id,
            requestId: request._id,
            oldStatus: notification.metadata.paymentData?.status,
            newStatus: "expired"
          });
        }
        
        // Update message if it exists
        if (request.messageId) {
          const message = await ctx.db.get(request.messageId);
          if (message) {
            await ctx.db.patch(request.messageId, {
              metadata: {
                ...message.metadata,
                requestStatus: "expired"
              }
            });
            
            debug.log("Updated message status to expired", {
              messageId: request.messageId,
              requestId: request._id
            });
          }
        }
        
        // Create expiration notifications for both parties
        // For requester
        await ctx.db.insert("notifications", {
          userId: request.requesterId,
          type: "payment_request",
          title: "Payment Request Expired",
          description: "Your payment request has expired",
          status: "active",
          priority: {
            base: "medium",
            modifiers: {
              actionRequired: false,
              timeConstraint: false,
              amount: request.amount,
              role: "sender"
            },
            calculatedPriority: 45
          },
          displayLocation: "suggested_actions",
          metadata: {
            gradient: "from-red-500 to-red-600",
            actionRequired: false,
            dismissible: true,
            relatedEntityId: request._id.toString(),
            relatedEntityType: "payment_request",
            counterpartyId: request.recipientId,
            visibility: "sender_only",
            role: "sender",
            paymentData: {
              amount: request.amount,
              currency: request.currency,
              type: request.type,
              status: "expired"
            }
          },
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        });
        
        // For recipient
        await ctx.db.insert("notifications", {
          userId: request.recipientId,
          type: "payment_request",
          title: "Payment Request Expired",
          description: "A payment request has expired",
          status: "active",
          priority: {
            base: "medium",
            modifiers: {
              actionRequired: false,
              timeConstraint: false,
              amount: request.amount,
              role: "recipient"
            },
            calculatedPriority: 45
          },
          displayLocation: "suggested_actions",
          metadata: {
            gradient: "from-red-500 to-red-600",
            actionRequired: false,
            dismissible: true,
            relatedEntityId: request._id.toString(),
            relatedEntityType: "payment_request",
            counterpartyId: request.requesterId,
            visibility: "recipient_only",
            role: "recipient",
            paymentData: {
              amount: request.amount,
              currency: request.currency,
              type: request.type,
              status: "expired"
            }
          },
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        });
      }
      
      return {
        success: true,
        pendingCount: pendingRequests.length,
        expiredCount: expiredRequests.length
      };
    } catch (error) {
      debug.error("Error checking expired requests", error);
      throw error;
    } finally {
      debug.endGroup();
    }
  }
});

// Schedule the expiration check to run periodically
// export const crons = new Crons();
// crons.interval(
//   "check-expired-requests",
//   { minutes: 5 },
//   async (ctx) => {
//     console.log("Running scheduled checkExpiredRequests");
//     await checkExpiredRequests.handler(ctx);
//   }
// );

// Add a new mutation to manually check for expired requests
export const manualCheckExpiredRequests = mutation({
  handler: async (ctx) => {
    debug.startGroup("Manual Check Expired Requests");
    const now = new Date();
    
    try {
      // Find all pending requests
      const pendingRequests = await ctx.db
        .query("paymentRequests")
        .filter((q) => q.eq(q.field("status"), "pending"))
        .collect();
      
      debug.log("Found pending requests", {
        count: pendingRequests.length,
        requestIds: pendingRequests.map(r => r._id),
        currentTime: now.toISOString()
      });
      
      // Check each request for expiration
      const expiredRequests = pendingRequests.filter(request => {
        const expiresAt = new Date(request.metadata.expiresAt);
        const isExpired = expiresAt < now;
        
        debug.log("Checking request expiration", {
          requestId: request._id,
          expiresAt: request.metadata.expiresAt,
          expiresAtTimestamp: expiresAt.getTime(),
          nowTimestamp: now.getTime(),
          isExpired,
          timeDifference: (now.getTime() - expiresAt.getTime()) / 1000
        });
        
        return isExpired;
      });
      
      debug.log("Found expired requests", {
        count: expiredRequests.length,
        requestIds: expiredRequests.map(r => r._id)
      });
      
      // Process each expired request
      for (const request of expiredRequests) {
        debug.log("Processing expired request", {
          requestId: request._id,
          expiresAt: request.metadata.expiresAt,
          currentTime: now.toISOString()
        });
        
        // Update request status to expired
        await ctx.db.patch(request._id, {
          status: "expired",
          updatedAt: now.toISOString()
        });
        
        debug.log("Updated request status to expired", {
          requestId: request._id,
          oldStatus: request.status,
          newStatus: "expired"
        });
        
        // Update existing notifications
        const existingNotifications = await ctx.db
          .query("notifications")
          .withIndex("by_related")
          .filter((q) => q.eq(q.field("metadata.relatedEntityId"), request._id.toString()))
          .collect();
        
        for (const notification of existingNotifications) {
          await ctx.db.patch(notification._id, {
            updatedAt: now.toISOString(),
            metadata: {
              ...notification.metadata,
              paymentData: {
                ...notification.metadata.paymentData,
                status: "expired"
              }
            }
          });
          
          debug.log("Updated notification for expired request", {
            notificationId: notification._id,
            requestId: request._id,
            oldStatus: notification.metadata.paymentData?.status,
            newStatus: "expired"
          });
        }
        
        // Update message if it exists
        if (request.messageId) {
          const message = await ctx.db.get(request.messageId);
          if (message) {
            await ctx.db.patch(request.messageId, {
              metadata: {
                ...message.metadata,
                requestStatus: "expired"
              }
            });
            
            debug.log("Updated message status to expired", {
              messageId: request.messageId,
              requestId: request._id
            });
          }
        }
      }
      
      return {
        success: true,
        pendingCount: pendingRequests.length,
        expiredCount: expiredRequests.length,
        expiredRequestIds: expiredRequests.map(r => r._id)
      };
    } catch (error) {
      debug.error("Error in manual check for expired requests", error);
      throw error;
    } finally {
      debug.endGroup();
    }
  }
});

// Add a new mutation to manually expire a specific request
export const manualExpireRequest = mutation({
  args: {
    requestId: v.id("paymentRequests")
  },
  handler: async (ctx, args) => {
    debug.startGroup("Manual Expire Request");
    const now = new Date();
    
    try {
      const request = await ctx.db.get(args.requestId);
      if (!request) {
        debug.error("Request not found", {
          requestId: args.requestId
        });
        throw new Error("Payment request not found");
      }
      
      debug.log("Found request", {
        requestId: args.requestId,
        status: request.status,
        expiresAt: request.metadata.expiresAt
      });
      
      // Update request status to expired
      await ctx.db.patch(args.requestId, {
        status: "expired",
        updatedAt: now.toISOString()
      });
      
      debug.log("Updated request status to expired", {
        requestId: args.requestId,
        oldStatus: request.status,
        newStatus: "expired"
      });
      
      // Update existing notifications
      const existingNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_related")
        .filter((q) => q.eq(q.field("metadata.relatedEntityId"), args.requestId.toString()))
        .collect();
      
      debug.log("Found related notifications", {
        count: existingNotifications.length,
        notificationIds: existingNotifications.map(n => n._id)
      });
      
      for (const notification of existingNotifications) {
        await ctx.db.patch(notification._id, {
          updatedAt: now.toISOString(),
          metadata: {
            ...notification.metadata,
            paymentData: {
              ...notification.metadata.paymentData,
              status: "expired"
            }
          }
        });
        
        debug.log("Updated notification for expired request", {
          notificationId: notification._id,
          requestId: args.requestId,
          oldStatus: notification.metadata.paymentData?.status,
          newStatus: "expired"
        });
      }
      
      // Update message if it exists
      if (request.messageId) {
        const message = await ctx.db.get(request.messageId);
        if (message) {
          await ctx.db.patch(request.messageId, {
            metadata: {
              ...message.metadata,
              requestStatus: "expired"
            }
          });
          
          debug.log("Updated message status to expired", {
            messageId: request.messageId,
            requestId: args.requestId
          });
        }
      }
      
      return {
        success: true,
        requestId: args.requestId,
        oldStatus: request.status,
        newStatus: "expired"
      };
    } catch (error) {
      debug.error("Error manually expiring request", error);
      throw error;
    } finally {
      debug.endGroup();
    }
  }
});

// Add a new query to check the status of a specific request
export const checkRequestStatus = query({
  args: {
    requestId: v.id("paymentRequests")
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return {
        exists: false,
        requestId: args.requestId
      };
    }
    
    const now = new Date();
    const expiresAt = new Date(request.metadata.expiresAt);
    const isExpired = expiresAt < now;
    const timeDifference = (now.getTime() - expiresAt.getTime()) / 1000;
    
    return {
      exists: true,
      requestId: args.requestId,
      status: request.status,
      expiresAt: request.metadata.expiresAt,
      currentTime: now.toISOString(),
      isExpired,
      timeDifference,
      message: isExpired 
        ? `Request expired ${Math.abs(timeDifference)} seconds ago` 
        : `Request expires in ${Math.abs(timeDifference)} seconds`
    };
  }
});

// Update the notification creation
export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(v.literal("system"), v.literal("payment_request"), v.literal("payment_sent"), v.literal("payment_received"), v.literal("security")),
    title: v.string(),
    description: v.string(),
    metadata: v.object({
      gradient: v.string(),
      expiresAt: v.optional(v.string()),
      actionRequired: v.boolean(),
      dismissible: v.boolean(),
      relatedEntityId: v.optional(v.string()),
      relatedEntityType: v.optional(v.string()),
      counterpartyId: v.optional(v.id("users")),
      visibility: v.union(v.literal("sender_only"), v.literal("recipient_only"), v.literal("both")),
      role: v.union(v.literal("sender"), v.literal("recipient")),
      paymentData: v.optional(v.object({
        amount: v.number(),
        currency: v.string(),
        type: v.union(v.literal("lightning"), v.literal("onchain")),
        status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed"), v.literal("expired"))
      }))
    })
  },
  handler: async (ctx, args) => {
    // ... existing code ...
  }
});

// Fix cron job implementation
// export const checkExpiredPaymentRequests = cronJobs.interval({
//   name: "check-expired-payment-requests",
//   interval: "1h", // run every hour
//   handler: async (ctx) => {
//     const now = new Date();
//     const pendingRequests = await ctx.db
//       .query("paymentRequests")
//       .filter((q) => q.eq(q.field("status"), "pending"))
//       .collect();

//     let expiredCount = 0;
//     for (const request of pendingRequests) {
//       const expiresAt = new Date(request.metadata.expiresAt);
//       if (expiresAt < now) {
//         await ctx.runMutation(internal.paymentRequests.updatePaymentRequestStatus, {
//           paymentRequestId: request._id,
//           status: "expired"
//         });
//         expiredCount++;
//       }
//     }

//     return {
//       success: true,
//       pendingCount: pendingRequests.length,
//       expiredCount
//     };
//   }
// }); 