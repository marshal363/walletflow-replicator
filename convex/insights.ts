import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const getInsights = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("insights")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const generateSpendingInsights = mutation({
  args: {
    userId: v.id("users"),
    period: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all user's accounts
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();

    let totalSpent = 0;
    const categories: Record<string, number> = {};

    // For each account, get all wallets
    for (const account of accounts) {
      const wallets = await ctx.db
        .query("wallets")
        .withIndex("by_account_id", (q) => q.eq("accountId", account._id))
        .collect();

      // For each wallet, get transactions
      for (const wallet of wallets) {
        const transactions = await ctx.db
          .query("transactions")
          .withIndex("by_wallet_id", (q) => q.eq("walletId", wallet._id))
          .filter((q) => q.eq(q.field("type"), "payment"))
          .collect();

        // Calculate totals and categorize
        for (const tx of transactions) {
          totalSpent += tx.amount + tx.fee;
          for (const tag of tx.metadata.tags) {
            categories[tag] = (categories[tag] || 0) + tx.amount;
          }
        }
      }
    }

    // Get previous period's insight for comparison
    const previousInsight = await ctx.db
      .query("insights")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.eq(q.field("type"), "spending_pattern"),
          q.eq(q.field("period"), getPreviousPeriod(args.period))
        )
      )
      .first();

    const previousTotal = previousInsight?.data.totalSpent || totalSpent;
    const percentageChange = ((totalSpent - previousTotal) / previousTotal) * 100;

    // Create new insight
    return await ctx.db.insert("insights", {
      userId: args.userId,
      type: "spending_pattern",
      period: args.period,
      data: {
        totalSpent,
        categories,
        comparison: {
          previousPeriod: totalSpent - previousTotal,
          percentageChange,
        },
      },
    });
  },
});

// Helper function to get previous period
function getPreviousPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, "0")}`;
} 