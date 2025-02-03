import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const importAccount = mutation({
  args: {
    userId: v.string(),
    type: v.union(v.literal("business"), v.literal("personal")),
    name: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    businessDetails: v.optional(v.object({
      companyName: v.string(),
      registrationNumber: v.string(),
      type: v.string()
    }))
  },
  handler: async (ctx, args) => {
    // Verify the user exists in Clerk
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Create the account
    return await ctx.db.insert("accounts", {
      userId: args.userId,
      type: args.type,
      name: args.name,
      status: args.status,
      businessDetails: args.businessDetails
    });
  },
});

export const getAccountsByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    return await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
}); 