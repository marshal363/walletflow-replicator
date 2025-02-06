import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const getWallets = query({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (!user || account.userId !== user._id) {
      throw new Error("Not authorized to access this account");
    }

    return await ctx.db
      .query("wallets")
      .withIndex("by_account_id", (q) => q.eq("accountId", args.accountId))
      .collect();
  },
});

export const createWallet = mutation({
  args: {
    accountId: v.id("accounts"),
    type: v.union(v.literal("spending"), v.literal("savings"), v.literal("multisig")),
    name: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (!user || account.userId !== user._id) {
      throw new Error("Not authorized to access this account");
    }

    const networkIdentities = (() => {
      switch (args.type) {
        case "spending":
          return {
            type: "spending" as const,
            lightning: `${args.username}@bitchat.com`,
            nostr: `${args.username}@bitchat.com`,
          };
        case "savings":
          return {
            type: "savings" as const,
            bitcoinAddress: `bc1q...`, // Generate or get from external service
            derivationPath: "m/84'/0'/0'/0/0", // Example path
          };
        case "multisig":
          return {
            type: "multisig" as const,
            addresses: [{
              address: `bc1q...`, // Generate or get from external service
              signers: [{
                pubKey: "02...", // Example public key
                weight: 1,
              }],
              requiredSignatures: 1,
            }],
            scriptType: "p2tr" as const,
          };
      }
    })();

    return await ctx.db.insert("wallets", {
      accountId: args.accountId,
      type: args.type,
      name: args.name,
      balance: 0,
      currency: "sats",
      lastUpdated: new Date().toISOString(),
      networkIdentities,
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const wallet = await ctx.db.get(args.walletId);
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const account = await ctx.db.get(wallet.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (!user || account.userId !== user._id) {
      throw new Error("Not authorized to access this wallet");
    }

    const newBalance = args.type === "credit" 
      ? wallet.balance + args.amount 
      : wallet.balance - args.amount;

    if (newBalance < 0) {
      throw new Error("Insufficient balance");
    }

    return await ctx.db.patch(args.walletId, {
      balance: newBalance,
      lastUpdated: new Date().toISOString(),
    });
  },
});

export const getWalletsByAccounts = query({
  args: { 
    accountIds: v.array(v.id("accounts"))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    if (args.accountIds.length === 0) {
      return [];
    }

    return await ctx.db
      .query("wallets")
      .withIndex("by_account_id")
      .filter(q => 
        args.accountIds.some(accountId => 
          q.eq(q.field("accountId"), accountId)
        )
      )
      .collect();
  },
});

export const importWallet = mutation({
  args: {
    accountId: v.id("accounts"), // Using Convex account ID
    type: v.union(v.literal("spending"), v.literal("savings"), v.literal("multisig")),
    name: v.string(),
    balance: v.number(),
    currency: v.string(),
    lastUpdated: v.string(),
    networkIdentities: v.union(
      v.object({
        type: v.literal("spending"),
        lightning: v.string(),
        nostr: v.string(),
      }),
      v.object({
        type: v.literal("savings"),
        bitcoinAddress: v.string(),
        derivationPath: v.string(),
      }),
      v.object({
        type: v.literal("multisig"),
        addresses: v.array(v.object({
          address: v.string(),
          signers: v.array(v.object({
            pubKey: v.string(),
            weight: v.number(),
          })),
          requiredSignatures: v.number(),
        })),
        scriptType: v.union(v.literal("p2sh"), v.literal("p2wsh"), v.literal("p2tr")),
      })
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("wallets", args);
  },
}); 
