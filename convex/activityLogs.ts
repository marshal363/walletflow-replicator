import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get activity logs for a user
export const getActivityLogs = query({
  args: {
    userId: v.id("users"),
    type: v.optional(
      v.union(
        v.literal("login"),
        v.literal("logout"),
        v.literal("payment"),
        v.literal("wallet_action"),
        v.literal("security_change"),
        v.literal("settings_change")
      )
    ),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("activityLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));

    if (args.type) {
      query = query.filter((q) => q.eq(q.field("type"), args.type));
    }

    if (args.startDate) {
      query = query.filter((q) => q.gte(q.field("timestamp"), args.startDate));
    }

    if (args.endDate) {
      query = query.filter((q) => q.lte(q.field("timestamp"), args.endDate));
    }

    return await query
      .order("desc")
      .take(args.limit ?? 100);
  },
});

// Log an activity
export const logActivity = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("login"),
      v.literal("logout"),
      v.literal("payment"),
      v.literal("wallet_action"),
      v.literal("security_change"),
      v.literal("settings_change")
    ),
    action: v.string(),
    status: v.union(
      v.literal("success"),
      v.literal("failure"),
      v.literal("pending")
    ),
    metadata: v.object({
      ipAddress: v.optional(v.string()),
      deviceInfo: v.optional(v.string()),
      location: v.optional(v.string()),
      details: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activityLogs", {
      ...args,
      timestamp: new Date().toISOString(),
    });
  },
});

// Get security-related activities
export const getSecurityLogs = query({
  args: {
    userId: v.id("users"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAgo = args.days ?? 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    return await ctx.db
      .query("activityLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "security_change"),
          q.gte(q.field("timestamp"), startDate.toISOString())
        )
      )
      .order("desc")
      .collect();
  },
});

// Get payment-related activities
export const getPaymentLogs = query({
  args: {
    userId: v.id("users"),
    status: v.optional(
      v.union(
        v.literal("success"),
        v.literal("failure"),
        v.literal("pending")
      )
    ),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAgo = args.days ?? 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    let query = ctx.db
      .query("activityLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "payment"),
          q.gte(q.field("timestamp"), startDate.toISOString())
        )
      );

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    return await query.order("desc").collect();
  },
});

// Get activity summary
export const getActivitySummary = query({
  args: {
    userId: v.id("users"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAgo = args.days ?? 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const logs = await ctx.db
      .query("activityLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("timestamp"), startDate.toISOString()))
      .collect();

    const summary = {
      total: logs.length,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      successRate: 0,
      mostCommonAction: { action: "", count: 0 },
    };

    const actionCounts = {} as Record<string, number>;

    logs.forEach((log) => {
      // Count by type
      summary.byType[log.type] = (summary.byType[log.type] || 0) + 1;

      // Count by status
      summary.byStatus[log.status] = (summary.byStatus[log.status] || 0) + 1;

      // Count actions
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });

    // Calculate success rate
    const successCount = summary.byStatus.success || 0;
    summary.successRate = logs.length > 0 ? (successCount / logs.length) * 100 : 0;

    // Find most common action
    Object.entries(actionCounts).forEach(([action, count]) => {
      if (count > summary.mostCommonAction.count) {
        summary.mostCommonAction = { action, count };
      }
    });

    return summary;
  },
}); 