import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    // Clerk Identity Information
    clerkId: v.string(),
    email: v.string(),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    fullName: v.string(),
    profileImageUrl: v.optional(v.string()),
    
    // Timestamps
    createdAt: v.string(), // ISO string from Clerk
    lastSignInAt: v.optional(v.string()), // ISO string from Clerk
    updatedAt: v.string(), // ISO string
    
    // User Preferences
    preferences: v.object({
      defaultCurrency: v.string(),
      notifications: v.boolean(),
      twoFactorEnabled: v.boolean(),
      theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
      language: v.optional(v.string()),
    }),
    
    // User Status
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("suspended")
    ),
  })
  .index("by_clerk_id", ["clerkId"])
  .index("by_email", ["email"])
  .index("by_username", ["username"]),

  // Accounts table
  accounts: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("personal"), v.literal("business")),
    name: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("suspended")),
    businessDetails: v.optional(v.object({
      companyName: v.string(),
      registrationNumber: v.string(),
      type: v.string(),
    })),
  }).index("by_user_id", ["userId"]),

  // Wallets table
  wallets: defineTable({
    accountId: v.id("accounts"),
    type: v.union(
      v.literal("spending"),
      v.literal("savings"),
      v.literal("business")
    ),
    name: v.string(),
    balance: v.number(),
    currency: v.string(),
    lastUpdated: v.string(),
  }).index("by_account_id", ["accountId"]),

  // Transactions table
  transactions: defineTable({
    walletId: v.id("wallets"),
    type: v.union(v.literal("payment"), v.literal("receive")),
    amount: v.number(),
    fee: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed")
    ),
    timestamp: v.string(),
    description: v.string(),
    recipient: v.optional(v.object({
      name: v.string(),
      address: v.string(),
    })),
    sender: v.optional(v.object({
      name: v.string(),
      address: v.string(),
    })),
    metadata: v.object({
      lightning: v.boolean(),
      memo: v.optional(v.string()),
      tags: v.array(v.string()),
    }),
  })
  .index("by_wallet_id", ["walletId"])
  .index("by_status", ["status"]),

  // Messages table
  messages: defineTable({
    senderId: v.id("users"),
    receiverId: v.id("users"),
    type: v.union(
      v.literal("text"),
      v.literal("payment_request"),
      v.literal("payment_sent"),
      v.literal("payment_received")
    ),
    content: v.string(),
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read")
    ),
    metadata: v.optional(v.object({
      paymentAmount: v.optional(v.number()),
      paymentCurrency: v.optional(v.string()),
      paymentStatus: v.optional(v.union(
        v.literal("pending"),
        v.literal("completed"),
        v.literal("expired"),
        v.literal("cancelled")
      )),
      attachments: v.optional(v.array(v.string())),
    })),
    timestamp: v.string(),
  })
  .index("by_sender", ["senderId"])
  .index("by_receiver", ["receiverId"])
  .index("by_conversation", ["senderId", "receiverId"]),
}); 