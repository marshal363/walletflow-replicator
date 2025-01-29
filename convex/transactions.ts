import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const getTransactions = query({
  args: { walletId: v.id("wallets") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_wallet_id", (q) => q.eq("walletId", args.walletId))
      .order("desc")
      .collect();
  },
});

export const createTransaction = mutation({
  args: {
    walletId: v.id("wallets"),
    type: v.union(v.literal("payment"), v.literal("receive")),
    amount: v.number(),
    fee: v.number(),
    description: v.string(),
    recipient: v.optional(
      v.object({
        name: v.string(),
        address: v.string(),
      })
    ),
    sender: v.optional(
      v.object({
        name: v.string(),
        address: v.string(),
      })
    ),
    metadata: v.object({
      lightning: v.boolean(),
      memo: v.optional(v.string()),
      tags: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Create the transaction
    const transaction = await ctx.db.insert("transactions", {
      walletId: args.walletId,
      type: args.type,
      amount: args.amount,
      fee: args.fee,
      status: "completed",
      timestamp: new Date().toISOString(),
      description: args.description,
      recipient: args.recipient,
      sender: args.sender,
      metadata: args.metadata,
    });

    // Update wallet balance
    const wallet = await ctx.db.get(args.walletId);
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const totalAmount = args.amount + args.fee;
    const newBalance = args.type === "receive"
      ? wallet.balance + args.amount
      : wallet.balance - totalAmount;

    await ctx.db.patch(args.walletId, {
      balance: newBalance,
      lastUpdated: new Date().toISOString(),
    });

    return transaction;
  },
}); 