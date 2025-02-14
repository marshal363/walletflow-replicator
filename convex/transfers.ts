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
    conversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    // 1. Validate source wallet and amount
    const sourceWallet = await validateTransferEligibility(ctx, args.sourceWalletId, args.amount);

    // Get source user info
    const sourceAccount = await ctx.db.get(sourceWallet.accountId);
    if (!sourceAccount) throw new Error("Source account not found");
    
    const sourceUser = await ctx.db.get(sourceAccount.userId);
    if (!sourceUser) throw new Error("Source user not found");

    // 2. Get or create destination wallet
    const destinationWallet = await getOrCreateSpendingWallet(ctx, args.destinationUserId);
    
    // Get destination user info
    const destinationUser = await ctx.db.get(args.destinationUserId);
    if (!destinationUser) throw new Error("Destination user not found");

    // 3. Create transfer record
    const transfer = await ctx.db.insert("transferTransactions", {
      sourceWalletId: args.sourceWalletId,
      destinationWalletId: destinationWallet._id,
      amount: args.amount,
      fee: 0,
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

      // 6. Create or get conversation
      let conversationId = args.conversationId;
      if (!conversationId) {
        // Check if conversation exists
        const existingConversation = await ctx.db
          .query("conversations")
          .withIndex("by_participants", q => 
            q.eq("participants", [sourceUser._id, destinationUser._id].sort())
          )
          .first();

        if (existingConversation) {
          conversationId = existingConversation._id;
        } else {
          // Create new conversation
          conversationId = await ctx.db.insert("conversations", {
            participants: [sourceUser._id, destinationUser._id].sort(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastMessageAt: new Date().toISOString(),
            status: "active",
            metadata: {
              name: undefined,
              isGroup: false,
              createdBy: sourceUser._id,
            },
          });
        }
      }

      // 7. Create payment sent message
      const sentMessage = await ctx.db.insert("messages", {
        conversationId,
        senderId: sourceUser._id,
        content: `Sent ${args.amount} sats to ${destinationUser.fullName}`,
        timestamp: new Date().toISOString(),
        status: "sent",
        type: "payment_sent",
        metadata: {
          amount: args.amount,
          recipientId: destinationUser._id,
          transferId: transfer,
        },
      });

      // 8. Create payment received message
      const receivedMessage = await ctx.db.insert("messages", {
        conversationId,
        senderId: destinationUser._id,
        content: `Received ${args.amount} sats from ${sourceUser.fullName}`,
        timestamp: new Date().toISOString(),
        status: "sent",
        type: "payment_received",
        metadata: {
          amount: args.amount,
          senderId: sourceUser._id,
          transferId: transfer,
        },
      });

      // 9. Update conversation's last message
      await ctx.db.patch(conversationId, {
        lastMessageId: receivedMessage,
        lastMessageAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 10. Update transfer status to completed
      await ctx.db.patch(transfer, {
        status: "completed",
      });

      return {
        success: true,
        transferId: transfer,
        conversationId,
        sentMessageId: sentMessage,
        receivedMessageId: receivedMessage,
      };
    } catch (error) {
      // If anything fails, mark transfer as failed
      await ctx.db.patch(transfer, {
        status: "failed",
        metadata: {
          messageId: args.messageId,
          memo: args.description,
          tags: ["internal_transfer"],
          processingAttempts: 1,
          lastAttempt: new Date().toISOString(),
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });

      throw error;
    }
  },
}); 