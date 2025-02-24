import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getOrCreateSpendingWallet, validateTransferEligibility, createTransactionPair } from "./utils/walletHelpers";
import { DatabaseReader, DatabaseWriter, MutationCtx, QueryCtx } from "./_generated/server";

// Add these types at the top
interface User {
  _id: Id<"users">;
  fullName: string;
  username?: string;
}

interface Conversation {
  _id: Id<"conversations">;
  participants: Id<"users">[];
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  metadata: {
    isGroup: boolean;
    createdBy: Id<"users">;
    name?: string;
  };
}

interface ConvexCtx {
  db: DatabaseReader | DatabaseWriter;
}

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

// Update the helper function with proper types
async function getOrCreateConversationForTransfer(
  ctx: MutationCtx,
  sourceUser: User,
  destinationUser: User,
  providedConversationId?: Id<"conversations">
): Promise<Conversation> {
  const debug = {
    log: (message: string, data?: Record<string, unknown>) => {
      console.log("[CONVEX M(transfers:transferSats)] [LOG]", `'[Convex:Transfers] ${message}'`, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  };

  // If conversation ID is provided, validate it
  if (providedConversationId) {
    const conversation = await ctx.db.get(providedConversationId);
    if (!conversation) {
      throw new Error("Provided conversation not found");
    }
    
    // Verify both users are participants
    if (!conversation.participants.includes(sourceUser._id) || 
        !conversation.participants.includes(destinationUser._id)) {
      throw new Error("Invalid conversation participants");
    }
    
    return conversation as Conversation;
  }

  // Look for existing conversation between these users
  const existingConversation = await ctx.db
    .query("conversations")
    .withIndex("by_participants")
    .filter((q) => 
      q.and(
        q.eq(q.field("metadata.isGroup"), false),
        q.or(
          q.eq(q.field("participants"), [sourceUser._id, destinationUser._id]),
          q.eq(q.field("participants"), [destinationUser._id, sourceUser._id])
        )
      )
    )
    .first();

  if (existingConversation) {
    debug.log("Found existing conversation for transfer", {
      conversationId: existingConversation._id,
      participants: existingConversation.participants
    });
    return existingConversation as Conversation;
  }

  // Create new conversation if none exists
  const now = new Date().toISOString();
  const newConversationId = await ctx.db.insert("conversations", {
    participants: [sourceUser._id, destinationUser._id],
    lastMessageAt: now,
    createdAt: now,
    updatedAt: now,
    status: "active",
    metadata: {
      isGroup: false,
      createdBy: sourceUser._id,
      name: undefined
    },
  });

  debug.log("Created new conversation for transfer", {
    conversationId: newConversationId,
    participants: [sourceUser._id, destinationUser._id]
  });

  // Create participant records
  await Promise.all([
    ctx.db.insert("conversationParticipants", {
      conversationId: newConversationId,
      userId: sourceUser._id,
      joinedAt: now,
      role: "admin",
      isArchived: false,
      isMuted: false,
      notificationPreferences: {
        mentions: true,
        all: true,
      },
    }),
    ctx.db.insert("conversationParticipants", {
      conversationId: newConversationId,
      userId: destinationUser._id,
      joinedAt: now,
      role: "member",
      isArchived: false,
      isMuted: false,
      notificationPreferences: {
        mentions: true,
        all: true,
      },
    }),
  ]);

  const newConversation = await ctx.db.get(newConversationId);
  return newConversation as Conversation;
}

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
    // Enhanced logging for transfer request
    debug.log("Transfer request initiated", {
      type: "TRANSFER_START",
      sourceWalletId: args.sourceWalletId,
      destinationUserId: args.destinationUserId,
      amount: args.amount,
      description: args.description,
      messageId: args.messageId,
      conversationId: args.conversationId,
      timestamp: new Date().toISOString()
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
      
      // Get or create conversation
      const conversation = await getOrCreateConversationForTransfer(
        ctx,
        sourceUser,
        destinationUser,
        args.conversationId
      );

      debug.log("Conversation validated/created", {
        conversationId: conversation._id,
        participants: conversation.participants,
        isNew: !args.conversationId,
        transferId: transfer
      });

      // Create payment sent message
      const sentMessage = await ctx.db.insert("messages", {
        conversationId: conversation._id,
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
          visibility: "sender_only"
        },
      });

      // Create payment received message
      const receivedMessage = await ctx.db.insert("messages", {
        conversationId: conversation._id,
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
          visibility: "recipient_only"
        },
      });

      // Create notifications for both users
      const now = new Date().toISOString();

      // Sender notification
      await ctx.db.insert("notifications", {
        userId: sourceUser._id,
        type: "payment_sent",
        title: "Payment Sent",
        description: `${args.amount} sats to @${destinationUser.username}`,
        status: "active",
        priority: {
          base: "medium",
          modifiers: {
            actionRequired: false,
            timeConstraint: false,
            amount: args.amount,
            role: "sender"
          },
          calculatedPriority: 50
        },
        displayLocation: "suggested_actions",
        metadata: {
          gradient: "from-blue-500 to-blue-600",
          actionRequired: false,
          dismissible: true,
          relatedEntityId: transfer.toString(),
          relatedEntityType: "transfer",
          counterpartyId: destinationUser._id,
          visibility: "sender_only",
          role: "sender",
          paymentData: {
            amount: args.amount,
            currency: "BTC",
            type: "lightning",
            status: "completed"
          }
        },
        createdAt: now,
        updatedAt: now
      });

      // Recipient notification
      await ctx.db.insert("notifications", {
        userId: destinationUser._id,
        type: "payment_received",
        title: "Payment Received",
        description: `${args.amount} sats from @${sourceUser.username}`,
        status: "active",
        priority: {
          base: "medium",
          modifiers: {
            actionRequired: false,
            timeConstraint: false,
            amount: args.amount,
            role: "recipient"
          },
          calculatedPriority: 50
        },
        displayLocation: "suggested_actions",
        metadata: {
          gradient: "from-green-500 to-green-600",
          actionRequired: false,
          dismissible: true,
          relatedEntityId: transfer.toString(),
          relatedEntityType: "transfer",
          counterpartyId: sourceUser._id,
          visibility: "recipient_only",
          role: "recipient",
          paymentData: {
            amount: args.amount,
            currency: "BTC",
            type: "lightning",
            status: "completed"
          }
        },
        createdAt: now,
        updatedAt: now
      });

      // Update conversation's last message
      await ctx.db.patch(conversation._id, {
        lastMessageId: receivedMessage,
        lastMessageAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      debug.endGroup();

      // Update transfer status to completed
      await ctx.db.patch(transfer, {
        status: "completed",
      });

      // Enhanced logging for transfer completion
      debug.log("Transfer execution completed", {
        type: "TRANSFER_COMPLETE",
        transferId: transfer,
        sourceWalletId: args.sourceWalletId,
        destinationWalletId: destinationWallet._id,
        amount: args.amount,
        status: "completed",
        conversationId: conversation._id,
        sentMessageId: sentMessage,
        receivedMessageId: receivedMessage,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        transferId: transfer,
        conversationId: conversation._id,
        sentMessageId: sentMessage,
        receivedMessageId: receivedMessage,
        isExistingConversation: !!args.conversationId
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