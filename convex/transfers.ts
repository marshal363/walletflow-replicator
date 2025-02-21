import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getOrCreateSpendingWallet, validateTransferEligibility, createTransactionPair } from "./utils/walletHelpers";

// Debug logger that accepts both query and mutation contexts
const debug = {
  log: (message: string, data?: Record<string, unknown>) => {
    console.log("[CONVEX M(transfers:transferSats)] [LOG]", `'[Convex:Transfers] ${message}'`, {
      ...data,
      timestamp: new Date().toISOString()
    });
  },
  error: (message: string, error?: unknown) => {
    console.error("[CONVEX M(transfers:transferSats)] [ERROR]", `'[Convex:Transfers] ${message}'`, {
      error,
      timestamp: new Date().toISOString()
    });
  },
  startGroup: (name: string) => {
    console.log("[CONVEX M(transfers:transferSats)] [GROUP_START]", `'[Convex:Transfers] ${name}'`, {
      timestamp: new Date().toISOString()
    });
  },
  endGroup: () => {
    console.log("[CONVEX M(transfers:transferSats)] [GROUP_END]", {
      timestamp: new Date().toISOString()
    });
  }
};

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
    // Initial logging of transfer request
    debug.log("Starting transfer", {
      sourceWalletId: args.sourceWalletId,
      destinationUserId: args.destinationUserId,
      amount: args.amount,
      providedConversationId: args.conversationId,
    });

    // 1. Validate source wallet and amount
    const sourceWallet = await validateTransferEligibility(ctx, args.sourceWalletId, args.amount);

    // Get source user info
    const sourceAccount = await ctx.db.get(sourceWallet.accountId);
    if (!sourceAccount) throw new Error("Source account not found");
    
    const sourceUser = await ctx.db.get(sourceAccount.userId);
    if (!sourceUser) throw new Error("Source user not found");

    debug.log("Source user details", {
      sourceUserId: sourceUser._id,
      sourceWalletId: sourceWallet._id,
      sourceBalance: sourceWallet.balance,
    });

    // 2. Get or create destination wallet
    const destinationWallet = await getOrCreateSpendingWallet(ctx, args.destinationUserId);
    
    // Get destination user info
    const destinationUser = await ctx.db.get(args.destinationUserId);
    if (!destinationUser) throw new Error("Destination user not found");

    debug.log("Destination user details", {
      destinationUserId: destinationUser._id,
      destinationWalletId: destinationWallet._id,
      destinationBalance: destinationWallet.balance,
    });

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

      // 6. Handle conversation and messages
      debug.startGroup("Conversation and Messages");
      
      // Simple conversation validation
      if (!args.conversationId) {
        debug.error("Conversation ID is required for payment messages", {
          transferId: transfer,
          timestamp: new Date().toISOString()
        });
        throw new Error("Conversation ID is required for payment messages");
      }

      // Validate conversation exists and participants
      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation) {
        debug.error("Conversation not found", {
          conversationId: args.conversationId,
          transferId: transfer,
          timestamp: new Date().toISOString()
        });
        throw new Error("Conversation not found");
      }

      // Validate participants
      if (!conversation.participants.includes(sourceUser._id) || 
          !conversation.participants.includes(destinationUser._id)) {
        debug.error("Invalid conversation participants", {
          conversationId: args.conversationId,
          expectedParticipants: [sourceUser._id, destinationUser._id],
          actualParticipants: conversation.participants,
          transferId: transfer,
          timestamp: new Date().toISOString()
        });
        throw new Error("Invalid conversation participants");
      }

      debug.log("Conversation validated", {
        conversationId: args.conversationId,
        participants: conversation.participants,
        transferId: transfer,
        timestamp: new Date().toISOString()
      });

      // Create payment sent message
      const sentMessage = await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        senderId: sourceUser._id,
        content: `Sent ${args.amount} sats to ${destinationUser.fullName}`,
        timestamp: new Date().toISOString(),
        status: "sent",
        type: "payment_sent",
        metadata: {
          amount: args.amount,
          recipientId: destinationUser._id,
          senderId: sourceUser._id,
          transferId: transfer,
          replyTo: undefined,
          attachments: undefined,
          reactions: undefined,
        },
      });

      debug.log("Payment sent message created", {
        messageId: sentMessage,
        conversationId: args.conversationId,
        senderId: sourceUser._id,
        recipientId: destinationUser._id,
        amount: args.amount,
        transferId: transfer,
        timestamp: new Date().toISOString()
      });

      // Create payment received message
      const receivedMessage = await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        senderId: destinationUser._id,
        content: `Received ${args.amount} sats from ${sourceUser.fullName}`,
        timestamp: new Date().toISOString(),
        status: "sent",
        type: "payment_received",
        metadata: {
          amount: args.amount,
          recipientId: destinationUser._id,
          senderId: sourceUser._id,
          transferId: transfer,
          replyTo: undefined,
          attachments: undefined,
          reactions: undefined,
        },
      });

      debug.log("Payment received message created", {
        messageId: receivedMessage,
        conversationId: args.conversationId,
        senderId: destinationUser._id,
        recipientId: sourceUser._id,
        amount: args.amount,
        transferId: transfer,
        timestamp: new Date().toISOString()
      });

      // Update conversation's last message
      await ctx.db.patch(args.conversationId, {
        lastMessageId: receivedMessage,
        lastMessageAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      debug.log("Conversation updated", {
        conversationId: args.conversationId,
        lastMessageId: receivedMessage,
        lastMessageAt: new Date().toISOString(),
        transferId: transfer,
        timestamp: new Date().toISOString()
      });

      debug.endGroup();

      // Update transfer status to completed
      await ctx.db.patch(transfer, {
        status: "completed",
      });

      debug.log("Transfer completed", {
        success: true,
        transferId: transfer,
        conversationId: args.conversationId,
        sentMessageId: sentMessage,
        receivedMessageId: receivedMessage,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        transferId: transfer,
        conversationId: args.conversationId,
        sentMessageId: sentMessage,
        receivedMessageId: receivedMessage,
        isExistingConversation: true
      };
    } catch (error) {
      debug.error("Transfer execution failed", {
        phase: "execution",
        error: error instanceof Error ? error.message : "Unknown error",
        context: {
          transferId: transfer,
          conversationId: args.conversationId,
          timestamp: new Date().toISOString()
        }
      });

      // If anything fails, mark transfer as failed
      await ctx.db.patch(transfer, {
        status: "failed",
        metadata: {
          messageId: args.messageId,
          memo: args.description,
          tags: ["internal_transfer"],
          processingAttempts: 1,
          lastAttempt: new Date().toISOString(),
          errorMessage: error instanceof Error ? error.message : "Unknown error"
        },
      });

      throw error;
    }
  },
}); 