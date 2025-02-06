import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const listAccounts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("accounts").collect();
  },
});

export const getAccountsByUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    // First get the user by clerkId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }

    // Then get accounts using the Convex user ID
    return await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const importAccount = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(v.literal("business"), v.literal("personal")),
    name: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    identitySettings: v.object({
      username: v.string(),
      domain: v.string(),
      prefix: v.optional(v.string()),
      suffix: v.optional(v.string()),
    }),
    businessDetails: v.optional(v.object({
      companyName: v.string(),
      registrationNumber: v.string(),
      type: v.string()
    }))
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("accounts", args);
  },
});

export const getUserIdMapping = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map(user => ({
      clerkId: user.clerkId,
      convexId: user._id
    }));
  },
});

export const getAccountMappings = query({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("accounts").collect();
    return accounts.map(account => ({
      convexId: account._id,
      userId: account.userId,
      type: account.type
    }));
  },
}); 