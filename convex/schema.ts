import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    profileImage: v.optional(v.string()),
    clerkId: v.string(),
    preferences: v.object({
      defaultCurrency: v.string(),
      notifications: v.boolean(),
      twoFactorEnabled: v.boolean(),
    }),
  }).index("by_clerk_id", ["clerkId"]),

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

  boltCards: defineTable({
    walletId: v.id("wallets"),
    name: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("blocked")),
    limitPerTransaction: v.number(),
    dailyLimit: v.number(),
    lastUsed: v.optional(v.string()),
  }).index("by_wallet_id", ["walletId"]),

  signers: defineTable({
    walletId: v.id("wallets"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("co-signer")),
    publicKey: v.string(),
    weight: v.number(),
  })
    .index("by_wallet_id", ["walletId"])
    .index("by_user_id", ["userId"]),

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

  insights: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("spending_pattern"),
      v.literal("savings_goal")
    ),
    period: v.string(),
    data: v.any(),
  }).index("by_user_id", ["userId"]),

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

  paymentRequests: defineTable({
    requesterId: v.id("users"),
    payerId: v.id("users"),
    amount: v.number(),
    currency: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("expired"),
      v.literal("cancelled")
    ),
    expiresAt: v.string(),
    metadata: v.optional(v.object({
      category: v.optional(v.string()),
      splitDetails: v.optional(v.array(v.object({
        userId: v.string(),
        amount: v.number(),
        status: v.union(
          v.literal("pending"),
          v.literal("paid")
        ),
      }))),
      recurringDetails: v.optional(v.object({
        frequency: v.string(),
        nextDueDate: v.string(),
        endDate: v.optional(v.string()),
      })),
    })),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_requester", ["requesterId"])
    .index("by_payer", ["payerId"])
    .index("by_status", ["status"]),

  contacts: defineTable({
    userId: v.id("users"),
    contactId: v.id("users"),
    nickname: v.optional(v.string()),
    type: v.union(
      v.literal("personal"),
      v.literal("business"),
      v.literal("merchant")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("blocked"),
      v.literal("pending")
    ),
    metadata: v.optional(v.object({
      notes: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      lastInteraction: v.optional(v.string()),
    })),
    createdAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_contact", ["contactId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("payment_received"),
      v.literal("payment_sent"),
      v.literal("payment_request"),
      v.literal("message"),
      v.literal("security_alert"),
      v.literal("system")
    ),
    title: v.string(),
    content: v.string(),
    status: v.union(
      v.literal("unread"),
      v.literal("read"),
      v.literal("archived")
    ),
    metadata: v.optional(v.object({
      actionUrl: v.optional(v.string()),
      relatedId: v.optional(v.string()),
      priority: v.optional(v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high")
      )),
    })),
    createdAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  activityLogs: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("login"),
      v.literal("logout"),
      v.literal("payment"),
      v.literal("wallet_action"),
      v.literal("security_change"),
      v.literal("settings_change")
    ),
    action: v.string(),
    status: v.union(
      v.literal("success"),
      v.literal("failure"),
      v.literal("pending")
    ),
    metadata: v.object({
      ipAddress: v.optional(v.string()),
      deviceInfo: v.optional(v.string()),
      location: v.optional(v.string()),
      details: v.optional(v.any()),
    }),
    timestamp: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_type", ["type"]),
});

export default schema; 