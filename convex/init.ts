import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const initializeDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();
    
    // Get existing users
    const users = await ctx.db.query("users").collect();
    if (users.length < 2) {
      throw new Error("Please create sample users first using the createSampleUsers mutation");
    }
    
    const [sergioUser, secondUser] = users;
    
    // Create accounts for both users
    const sergioPersonalAccount = await ctx.db.insert("accounts", {
      userId: sergioUser._id,
      type: "personal",
      name: "Personal Account",
      status: "active",
    });

    const sergioBusinessAccount = await ctx.db.insert("accounts", {
      userId: sergioUser._id,
      type: "business",
      name: "Business Account",
      status: "active",
      businessDetails: {
        companyName: "Sergio's Tech",
        registrationNumber: "BT123456",
        type: "LLC",
      },
    });

    const secondUserPersonalAccount = await ctx.db.insert("accounts", {
      userId: secondUser._id,
      type: "personal",
      name: "Personal Account",
      status: "active",
    });

    // Create wallets for each account
    const sergioSpendingWallet = await ctx.db.insert("wallets", {
      accountId: sergioPersonalAccount,
      type: "spending",
      name: "Daily Expenses",
      balance: 2500000, // 2.5M sats
      currency: "sats",
      lastUpdated: now,
    });

    const sergioSavingsWallet = await ctx.db.insert("wallets", {
      accountId: sergioPersonalAccount,
      type: "savings",
      name: "Long-term Savings",
      balance: 15000000, // 15M sats
      currency: "sats",
      lastUpdated: now,
    });

    const sergioBusinessWallet = await ctx.db.insert("wallets", {
      accountId: sergioBusinessAccount,
      type: "business",
      name: "Business Operations",
      balance: 7500000, // 7.5M sats
      currency: "sats",
      lastUpdated: now,
    });

    const secondUserSpendingWallet = await ctx.db.insert("wallets", {
      accountId: secondUserPersonalAccount,
      type: "spending",
      name: "Daily Expenses",
      balance: 1800000, // 1.8M sats
      currency: "sats",
      lastUpdated: now,
    });

    // Create some transactions
    await ctx.db.insert("transactions", {
      walletId: sergioSpendingWallet,
      type: "payment",
      amount: 150000,
      fee: 100,
      status: "completed",
      timestamp: now,
      description: "Coffee and lunch",
      recipient: {
        name: "Local Cafe",
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      },
      metadata: {
        lightning: true,
        memo: "Lunch with team",
        tags: ["food", "business"],
      },
    });

    await ctx.db.insert("transactions", {
      walletId: sergioSpendingWallet,
      type: "receive",
      amount: 500000,
      fee: 0,
      status: "completed",
      timestamp: now,
      description: "Payment from client",
      sender: {
        name: "Client Co.",
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      },
      metadata: {
        lightning: true,
        memo: "Website development",
        tags: ["income", "freelance"],
      },
    });

    // Create messages between users
    await ctx.db.insert("messages", {
      senderId: sergioUser._id,
      receiverId: secondUser._id,
      type: "text",
      content: "Hey! Can you send me that invoice?",
      status: "delivered",
      timestamp: now,
    });

    await ctx.db.insert("messages", {
      senderId: secondUser._id,
      receiverId: sergioUser._id,
      type: "payment_request",
      content: "Invoice for website work",
      status: "read",
      metadata: {
        paymentAmount: 500000,
        paymentCurrency: "sats",
        paymentStatus: "completed",
      },
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    });

    // Create notifications
    await ctx.db.insert("notifications", {
      userId: sergioUser._id,
      type: "payment_received",
      title: "Payment Received",
      content: "You received 500,000 sats from Client Co.",
      status: "unread",
      metadata: {
        actionUrl: "/transactions/latest",
        relatedId: "tx_1",
        priority: "high",
      },
      createdAt: now,
    });

    // Create contacts
    await ctx.db.insert("contacts", {
      userId: sergioUser._id,
      contactId: secondUser._id,
      nickname: "Sergio A.",
      type: "business",
      status: "active",
      metadata: {
        notes: "Developer colleague",
        tags: ["work", "developer"],
        lastInteraction: now,
      },
      createdAt: now,
    });

    // Create bolt cards
    await ctx.db.insert("boltCards", {
      walletId: sergioSpendingWallet,
      name: "Daily Card",
      status: "active",
      limitPerTransaction: 100000,
      dailyLimit: 500000,
      lastUsed: now,
    });

    return {
      message: "Database initialized with mock data",
      users: {
        sergioUser: sergioUser._id,
        secondUser: secondUser._id,
      },
      accounts: {
        sergioPersonalAccount,
        sergioBusinessAccount,
        secondUserPersonalAccount,
      },
      wallets: {
        sergioSpendingWallet,
        sergioSavingsWallet,
        sergioBusinessWallet,
        secondUserSpendingWallet,
      },
    };
  },
}); 