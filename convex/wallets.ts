import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const getWallets = query({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wallets")
      .withIndex("by_account_id", (q) => q.eq("accountId", args.accountId))
      .collect();
  },
});

export const createWallet = mutation({
  args: {
    accountId: v.id("accounts"),
    type: v.union(v.literal("spending"), v.literal("savings"), v.literal("business")),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("wallets", {
      accountId: args.accountId,
      type: args.type,
      name: args.name,
      balance: 0,
      currency: "sats",
      lastUpdated: new Date().toISOString(),
    });
  },
});

export const updateBalance = mutation({
  args: {
    walletId: v.id("wallets"),
    amount: v.number(),
    type: v.union(v.literal("credit"), v.literal("debit")),
  },
  handler: async (ctx, args) => {
    const wallet = await ctx.db.get(args.walletId);
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const newBalance = args.type === "credit" 
      ? wallet.balance + args.amount 
      : wallet.balance - args.amount;

    return await ctx.db.patch(args.walletId, {
      balance: newBalance,
      lastUpdated: new Date().toISOString(),
    });
  },
}); 
