import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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

// Create a notification
export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("payment_received"),
      v.literal("payment_sent"),
      v.literal("payment_request"),
      v.literal("message"),
      v.literal("security_alert"),
      v.literal("system")
    ),
    title: v.string(),
    content: v.string(),
    metadata: v.optional(
      v.object({
        actionUrl: v.optional(v.string()),
        relatedId: v.optional(v.string()),
        priority: v.optional(
          v.union(
            v.literal("low"),
            v.literal("medium"),
            v.literal("high")
          )
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      ...args,
      status: "unread",
      createdAt: new Date().toISOString(),
    });
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
          status: "read",
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
          status: "archived",
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