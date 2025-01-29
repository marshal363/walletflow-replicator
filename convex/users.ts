import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const getUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const createUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    profileImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      profileImage: args.profileImage,
      preferences: {
        defaultCurrency: "USD",
        notifications: true,
        twoFactorEnabled: false,
      },
    });

    // Create a default personal account
    const account = await ctx.db.insert("accounts", {
      userId: user,
      type: "personal",
      name: "Personal Account",
      status: "active",
    });

    // Create default spending and savings wallets
    await ctx.db.insert("wallets", {
      accountId: account,
      type: "spending",
      name: "Daily Expenses",
      balance: 0,
      currency: "sats",
      lastUpdated: new Date().toISOString(),
    });

    await ctx.db.insert("wallets", {
      accountId: account,
      type: "savings",
      name: "Savings",
      balance: 0,
      currency: "sats",
      lastUpdated: new Date().toISOString(),
    });

    return user;
  },
}); 