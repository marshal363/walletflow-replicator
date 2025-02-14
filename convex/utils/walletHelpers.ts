import { MutationCtx, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

export async function getOrCreateSpendingWallet(
  ctx: MutationCtx,
  userId: Id<"users">
): Promise<Doc<"wallets">> {
  // First, find the user's personal account
  const account = await ctx.db
    .query("accounts")
    .withIndex("by_user_and_type", (q) => 
      q.eq("userId", userId).eq("type", "personal")
    )
    .first();

  if (!account) {
    throw new Error("User account not found");
  }

  // Find or create spending wallet
  const existingWallet = await ctx.db
    .query("wallets")
    .withIndex("by_account_and_type", (q) =>
      q.eq("accountId", account._id).eq("type", "spending")
    )
    .first();

  if (existingWallet) {
    return existingWallet;
  }

  // Get user info for wallet identity
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Create new spending wallet
  const walletId = await ctx.db.insert("wallets", {
    accountId: account._id,
    type: "spending",
    name: "Default Spending Wallet",
    balance: 0,
    currency: "BTC",
    lastUpdated: new Date().toISOString(),
    networkIdentities: {
      type: "spending",
      lightning: `${user.username || user.email}@bitchat.com`,
      nostr: `${user.username || user.email}@bitchat.com`,
    },
  });

  return await ctx.db.get(walletId);
}

export async function validateTransferEligibility(
  ctx: QueryCtx,
  sourceWalletId: Id<"wallets">,
  amount: number
): Promise<Doc<"wallets">> {
  const sourceWallet = await ctx.db.get(sourceWalletId);
  
  if (!sourceWallet) {
    throw new Error("Source wallet not found");
  }
  
  if (sourceWallet.type !== "spending") {
    throw new Error("Only spending wallets can send transfers");
  }
  
  if (sourceWallet.balance < amount) {
    throw new Error("Insufficient funds");
  }
  
  if (amount <= 0) {
    throw new Error("Transfer amount must be positive");
  }
  
  return sourceWallet;
}

export async function createTransactionPair(
  ctx: MutationCtx,
  params: {
    sourceWallet: Doc<"wallets">,
    destinationWallet: Doc<"wallets">,
    amount: number,
    description: string,
    transferId: Id<"transferTransactions">,
  }
) {
  // Create sender's transaction (payment)
  await ctx.db.insert("transactions", {
    walletId: params.sourceWallet._id,
    type: "payment",
    amount: params.amount,
    fee: 0,
    status: "completed",
    timestamp: new Date().toISOString(),
    description: params.description,
    recipient: {
      name: "Internal Transfer",
      address: params.destinationWallet._id.toString(),
    },
    metadata: {
      lightning: false,
      memo: params.description,
      tags: ["internal_transfer"],
    },
  });

  // Create receiver's transaction (receive)
  await ctx.db.insert("transactions", {
    walletId: params.destinationWallet._id,
    type: "receive",
    amount: params.amount,
    fee: 0,
    status: "completed",
    timestamp: new Date().toISOString(),
    description: params.description,
    sender: {
      name: "Internal Transfer",
      address: params.sourceWallet._id.toString(),
    },
    metadata: {
      lightning: false,
      memo: params.description,
      tags: ["internal_transfer"],
    },
  });
} 