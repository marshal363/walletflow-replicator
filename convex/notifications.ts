import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { calculatePriority } from "./utils";
import { internal } from "./_generated/api";

// Get notifications for a user
export const getNotifications = query({
  args: {
    userId: v.id("users"),
    status: v.optional(
      v.union(
        v.literal("unread"),
        v.literal("read"),
        v.literal("archived")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    return await query
      .order("desc")
      .take(args.limit ?? 50);
  },
});

// Get unread notification count
export const getUnreadCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "unread"))
      .collect();

    return notifications.length;
  },
});

// Get suggested actions for a user
export const getSuggestedActions = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Debug: Log query start
    console.log('🔍 getSuggestedActions - Query Start:', {
      event: 'Query Start',
      userId: args.userId,
      timestamp: new Date().toISOString()
    });

    const results = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("displayLocation"), "suggested_actions"),
          q.eq(q.field("status"), "active")
        )
      )
      .order("desc")
      .take(7);

    // Debug: Log query results
    console.log('🔍 getSuggestedActions - Query Results:', {
      event: 'Query Results',
      userId: args.userId,
      count: results.length,
      notifications: results.map(n => ({
        id: n._id,
        type: n.type,
        status: n.status,
        displayLocation: n.displayLocation,
        timestamp: new Date().toISOString()
      }))
    });

    return results;
  },
});

// Create a notification with optional bi-directional support
export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("transaction"),
      v.literal("payment_request"),
      v.literal("security"),
      v.literal("system")
    ),
    title: v.string(),
    description: v.string(),
    priority: v.object({
      base: v.union(
        v.literal("high"),
        v.literal("medium"),
        v.literal("low")
      ),
      modifiers: v.object({
        actionRequired: v.boolean(),
        timeConstraint: v.boolean(),
        amount: v.number(),
        role: v.union(v.literal("sender"), v.literal("recipient")),
      }),
    }),
    displayLocation: v.union(
      v.literal("suggested_actions"),
      v.literal("toast"),
      v.literal("both")
    ),
    metadata: v.object({
      gradient: v.string(),
      expiresAt: v.optional(v.string()),
      actionRequired: v.boolean(),
      dismissible: v.boolean(),
      relatedEntityId: v.optional(v.string()),
      relatedEntityType: v.optional(v.string()),
      counterpartyId: v.optional(v.id("users")),
      visibility: v.union(
        v.literal("sender_only"),
        v.literal("recipient_only"),
        v.literal("both")
      ),
      role: v.optional(v.union(
        v.literal("sender"),
        v.literal("recipient")
      )),
      paymentData: v.optional(v.object({
        amount: v.number(),
        currency: v.string(),
        type: v.union(v.literal("lightning"), v.literal("onchain")),
        status: v.union(
          v.literal("pending"),
          v.literal("completed"),
          v.literal("failed")
        ),
      })),
    }),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    // Calculate priority
    const calculatedPriority = calculatePriority(
      args.priority.base,
      args.priority.modifiers
    );

    // Create the main notification
    const notificationId = await ctx.db.insert("notifications", {
      ...args,
      status: "active",
      priority: {
        ...args.priority,
        calculatedPriority,
      },
      createdAt: now,
      updatedAt: now,
    });

    // Create counterparty notification if needed
    if (
      args.metadata.counterpartyId &&
      args.metadata.visibility !== "sender_only"
    ) {
      const counterpartyRole = args.metadata.role === "sender" ? "recipient" : "sender";
      
      await ctx.db.insert("notifications", {
        ...args,
        userId: args.metadata.counterpartyId,
        status: "active",
        priority: {
          ...args.priority,
          modifiers: {
            ...args.priority.modifiers,
            role: counterpartyRole,
          },
          calculatedPriority: calculatePriority(args.priority.base, {
            ...args.priority.modifiers,
            role: counterpartyRole,
          }),
        },
        metadata: {
          ...args.metadata,
          role: counterpartyRole,
          parentNotificationId: notificationId,
        },
        createdAt: now,
        updatedAt: now,
      });
    }

    return notificationId;
  },
});

// Check for expired notifications every 30 seconds
export const checkExpiredNotifications = internal.cron({
  name: "check-expired-notifications",
  interval: "30s", // Run every 30 seconds
  handler: async (ctx) => {
    const now = new Date();
    
    // Find all active payment request notifications that might be expired
    const expiredNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .filter((q) => 
        q.and(
          q.eq(q.field("type"), "payment_request"),
          q.neq(q.field("metadata.expiresAt"), undefined)
        )
      )
      .collect();

    // Process each notification
    for (const notification of expiredNotifications) {
      const expiresAt = notification.metadata.expiresAt;
      if (!expiresAt) continue;

      const expirationDate = new Date(expiresAt);
      if (expirationDate < now) {
        // Log the expiration
        console.log("Expiring notification", {
          id: notification._id,
          expiresAt,
          now: now.toISOString(),
          timeDifference: (now.getTime() - expirationDate.getTime()) / 1000
        });

        // Update the notification status
        await ctx.db.patch(notification._id, {
          status: "expired",
          "metadata.paymentData.status": "expired",
          updatedAt: now.toISOString()
        });

        // Update related notifications
        if (notification.metadata.parentNotificationId) {
          await ctx.db.patch(notification.metadata.parentNotificationId, {
            status: "expired",
            "metadata.paymentData.status": "expired",
            updatedAt: now.toISOString()
          });
        }

        // Find and update child notifications
        const childNotifications = await ctx.db
          .query("notifications")
          .withIndex("by_related")
          .filter((q) =>
            q.eq(q.field("metadata.parentNotificationId"), notification._id)
          )
          .collect();

        for (const child of childNotifications) {
          await ctx.db.patch(child._id, {
            status: "expired",
            "metadata.paymentData.status": "expired",
            updatedAt: now.toISOString()
          });
        }

        // Update the payment request if relatedEntityId exists and type is payment_request
        if (
          notification.metadata.relatedEntityId &&
          notification.metadata.relatedEntityType === "payment_request"
        ) {
          try {
            // Get the payment request
            const requestId = notification.metadata.relatedEntityId;
            const request = await ctx.db
              .query("paymentRequests")
              .filter((q) => q.eq(q.field("_id"), requestId))
              .unique();

            if (request && request.status === "pending") {
              // Update the payment request status
              await ctx.db.patch(request._id, {
                status: "expired",
                updatedAt: now.toISOString(),
                metadata: {
                  ...request.metadata,
                  expiredAt: now.toISOString()
                }
              });

              // Update associated message if it exists
              if (request.messageId) {
                const message = await ctx.db.get(request.messageId);
                if (message) {
                  await ctx.db.patch(message._id, {
                    metadata: {
                      ...message.metadata,
                      requestStatus: "expired"
                    }
                  });
                }
              }

              console.log("Payment request marked as expired", {
                notificationId: notification._id,
                requestId: request._id,
                messageId: request.messageId,
                timestamp: now.toISOString()
              });
            }
          } catch (error) {
            console.error("Failed to update payment request status", {
              error,
              notificationId: notification._id,
              relatedEntityId: notification.metadata.relatedEntityId
            });
          }
        }
      }
    }
  }
});

// Update notification status with improved handling
export const updateNotificationStatus = mutation({
  args: {
    notificationId: v.id("notifications"),
    status: v.union(
      v.literal("active"),
      v.literal("dismissed"),
      v.literal("actioned"),
      v.literal("expired")
    ),
    paymentStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("expired")
      )
    )
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new Error("Notification not found");

    const now = new Date().toISOString();
    const updates: Partial<Doc<"notifications">> = {
      status: args.status,
      updatedAt: now
    };

    // Update payment status if provided
    if (args.paymentStatus && notification.metadata.paymentData) {
      updates["metadata.paymentData.status"] = args.paymentStatus;
    }

    // Update the notification
    await ctx.db.patch(args.notificationId, updates);

    // Update related notification if exists
    if (notification.metadata.parentNotificationId) {
      await ctx.db.patch(notification.metadata.parentNotificationId, updates);
    }

    // Find and update child notifications
    const childNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_related")
      .filter((q) =>
        q.eq(q.field("metadata.parentNotificationId"), args.notificationId)
      )
      .collect();

    for (const child of childNotifications) {
      await ctx.db.patch(child._id, updates);
    }

    return true;
  },
});

// Clean up expired notifications
export const cleanupExpiredNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();
    
    const expiredNotifications = await ctx.db
      .query("notifications")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.lt(q.field("metadata.expiresAt"), now)
        )
      )
      .collect();

    for (const notification of expiredNotifications) {
      await ctx.db.patch(notification._id, {
        status: "expired",
        updatedAt: now,
      });
    }

    return expiredNotifications.length;
  },
});

// Mark notifications as read
export const markAsRead = mutation({
  args: {
    notificationIds: v.array(v.id("notifications")),
  },
  handler: async (ctx, args) => {
    const updates = await Promise.all(
      args.notificationIds.map((id) =>
        ctx.db.patch(id, {
          status: "dismissed",
          updatedAt: new Date().toISOString(),
        })
      )
    );

    return updates;
  },
});

// Archive notifications
export const archiveNotifications = mutation({
  args: {
    notificationIds: v.array(v.id("notifications")),
  },
  handler: async (ctx, args) => {
    const updates = await Promise.all(
      args.notificationIds.map((id) =>
        ctx.db.patch(id, {
          status: "dismissed",
          updatedAt: new Date().toISOString(),
        })
      )
    );

    return updates;
  },
});

// Delete old notifications
export const cleanupOldNotifications = mutation({
  args: {
    userId: v.id("users"),
    olderThan: v.string(), // ISO date string
  },
  handler: async (ctx, args) => {
    const oldNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "archived"),
          q.lt(q.field("createdAt"), args.olderThan)
        )
      )
      .collect();

    // Delete notifications in batches
    const batchSize = 50;
    for (let i = 0; i < oldNotifications.length; i += batchSize) {
      const batch = oldNotifications.slice(i, i + batchSize);
      await Promise.all(batch.map((notification) => ctx.db.delete(notification._id)));
    }

    return oldNotifications.length;
  },
}); 