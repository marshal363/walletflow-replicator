import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getOrCreateSpendingWallet, validateTransferEligibility, createTransactionPair } from "./utils/walletHelpers";

// Query to get transfer history for a wallet
export const getTransferHistory = query({
  args: {
    walletId: v.id("wallets"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const transfers = await ctx.db
      .query("transferTransactions")
      .withIndex("by_source_wallet", (q) => q.eq("sourceWalletId", args.walletId))
      .order("desc")
      .take(args.limit ?? 50);

    const receivedTransfers = await ctx.db
      .query("transferTransactions")
      .withIndex("by_destination_wallet", (q) => q.eq("destinationWalletId", args.walletId))
      .order("desc")
      .take(args.limit ?? 50);

    return {
      sent: transfers,
      received: receivedTransfers,
    };
  },
});

// Query to get transfer status
export const getTransferStatus = query({
  args: {
    transferId: v.id("transferTransactions"),
  },
  handler: async (ctx, args) => {
    const transfer = await ctx.db.get(args.transferId);
    if (!transfer) {
      throw new Error("Transfer not found");
    }
    return transfer;
  },
});

export const transferSats = mutation({
  args: {
    sourceWalletId: v.id("wallets"),
    destinationUserId: v.id("users"),
    amount: v.number(),
    description: v.string(),
    messageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    // 1. Validate source wallet and amount
    const sourceWallet = await validateTransferEligibility(ctx, args.sourceWalletId, args.amount);

    // 2. Get or create destination wallet
    const destinationWallet = await getOrCreateSpendingWallet(ctx, args.destinationUserId);

    // 3. Create transfer record
    const transfer = await ctx.db.insert("transferTransactions", {
      sourceWalletId: args.sourceWalletId,
      destinationWalletId: destinationWallet._id,
      amount: args.amount,
      fee: 0, // Internal transfers have no fee
      status: "pending",
      timestamp: new Date().toISOString(),
      description: args.description,
      type: "internal_transfer",
      metadata: {
        messageId: args.messageId,
        memo: args.description,
        tags: ["internal_transfer"],
        processingAttempts: 1,
        lastAttempt: new Date().toISOString(),
      },
    });

    try {
      // 4. Update balances
      await ctx.db.patch(args.sourceWalletId, {
        balance: sourceWallet.balance - args.amount,
        lastUpdated: new Date().toISOString(),
      });

      await ctx.db.patch(destinationWallet._id, {
        balance: destinationWallet.balance + args.amount,
        lastUpdated: new Date().toISOString(),
      });

      // 5. Create transaction records
      await createTransactionPair(ctx, {
        sourceWallet,
        destinationWallet,
        amount: args.amount,
        description: args.description,
        transferId: transfer,
      });

      // 6. Update transfer status to completed
      await ctx.db.patch(transfer, {
        status: "completed",
      });

      // 7. Update message if provided
      if (args.messageId) {
        await ctx.db.patch(args.messageId, {
          type: "payment_sent",
          status: "delivered",
        });
      }

      return {
        success: true,
        transferId: transfer,
      };
    } catch (error) {
      // If anything fails, mark transfer as failed
      await ctx.db.patch(transfer, {
        status: "failed",
        metadata: {
          ...transfer.metadata,
          errorMessage: error.message,
        },
      });

      throw error;
    }
  },
}); 