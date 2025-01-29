import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const initializeDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    // Create users
    const user1 = await ctx.db.insert("users", {
      name: "John Doe",
      email: "john.doe@example.com",
      profileImage: "https://example.com/profiles/john.jpg",
      clerkId: "user_clerk_1", // Replace with actual Clerk ID
      preferences: {
        defaultCurrency: "USD",
        notifications: true,
        twoFactorEnabled: true,
      },
    });

    const user2 = await ctx.db.insert("users", {
      name: "Jane Smith",
      email: "jane.smith@example.com",
      profileImage: "https://example.com/profiles/jane.jpg",
      clerkId: "user_clerk_2", // Replace with actual Clerk ID
      preferences: {
        defaultCurrency: "EUR",
        notifications: true,
        twoFactorEnabled: false,
      },
    });

    // Create accounts
    const personalAccount = await ctx.db.insert("accounts", {
      userId: user1,
      type: "personal",
      name: "Personal Account",
      status: "active",
    });

    const businessAccount = await ctx.db.insert("accounts", {
      userId: user1,
      type: "business",
      name: "Business Account",
      status: "active",
      businessDetails: {
        companyName: "Doe Enterprises",
        registrationNumber: "BE123456",
        type: "LLC",
      },
    });

    // Create wallets
    const spendingWallet = await ctx.db.insert("wallets", {
      accountId: personalAccount,
      type: "spending",
      name: "Daily Expenses",
      balance: 1500000,
      currency: "sats",
      lastUpdated: new Date().toISOString(),
    });

    const savingsWallet = await ctx.db.insert("wallets", {
      accountId: personalAccount,
      type: "savings",
      name: "Long-term Savings",
      balance: 10000000,
      currency: "sats",
      lastUpdated: new Date().toISOString(),
    });

    const businessWallet = await ctx.db.insert("wallets", {
      accountId: businessAccount,
      type: "business",
      name: "Business Operations",
      balance: 5000000,
      currency: "sats",
      lastUpdated: new Date().toISOString(),
    });

    // Create bolt card
    await ctx.db.insert("boltCards", {
      walletId: spendingWallet,
      name: "Daily Spender",
      status: "active",
      limitPerTransaction: 100000,
      dailyLimit: 500000,
      lastUsed: new Date().toISOString(),
    });

    // Create signers
    await ctx.db.insert("signers", {
      walletId: businessWallet,
      userId: user1,
      role: "owner",
      publicKey: "02abc...def",
      weight: 2,
    });

    await ctx.db.insert("signers", {
      walletId: businessWallet,
      userId: user2,
      role: "co-signer",
      publicKey: "03def...abc",
      weight: 1,
    });

    // Create transactions
    await ctx.db.insert("transactions", {
      walletId: spendingWallet,
      type: "payment",
      amount: 50000,
      fee: 100,
      status: "completed",
      timestamp: new Date().toISOString(),
      description: "Coffee shop payment",
      recipient: {
        name: "Coffee Shop",
        address: "bc1q...",
      },
      metadata: {
        lightning: true,
        memo: "Morning coffee",
        tags: ["food", "drinks"],
      },
    });

    // Create contacts
    await ctx.db.insert("contacts", {
      userId: user1,
      contactId: user2,
      nickname: "Jane",
      type: "personal",
      status: "active",
      metadata: {
        notes: "Roommate",
        tags: ["friend", "roommate"],
        lastInteraction: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
    });

    // Create notifications
    await ctx.db.insert("notifications", {
      userId: user1,
      type: "payment_received",
      title: "Payment Received",
      content: "You received 25000 sats from Jane Smith",
      status: "unread",
      metadata: {
        actionUrl: "/transactions/tx_2",
        relatedId: "tx_2",
        priority: "medium",
      },
      createdAt: new Date().toISOString(),
    });

    // Create activity logs
    await ctx.db.insert("activityLogs", {
      userId: user1,
      type: "payment",
      action: "send_payment",
      status: "success",
      metadata: {
        ipAddress: "192.168.1.1",
        deviceInfo: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        location: "San Francisco, CA",
        details: {
          amount: 50000,
          recipient: "Coffee Shop",
          walletId: spendingWallet,
        },
      },
      timestamp: new Date().toISOString(),
    });

    return {
      message: "Database initialized with sample data",
      users: [user1, user2],
      accounts: [personalAccount, businessAccount],
      wallets: [spendingWallet, savingsWallet, businessWallet],
    };
  },
}); 