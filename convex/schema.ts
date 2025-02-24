import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table (Primary)
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
      theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
      language: v.string(),
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
    
    // Identity generation metadata
    identitySettings: v.optional(v.object({
      username: v.string(),  // Base username for all addresses
      domain: v.string(),    // Default: bitchat.com
      customDomain: v.optional(v.string()), // For business accounts
      prefix: v.optional(v.string()),  // For business accounts: company-name-
      suffix: v.optional(v.string()),  // For business accounts: -department
    })),
    
    businessDetails: v.optional(v.object({
      companyName: v.string(),
      registrationNumber: v.string(),
      type: v.string(),
    })),
  })
  .index("by_user", ["userId"])
  .index("by_user_and_type", ["userId", "type"])
  .index("by_identity_username", ["identitySettings.username"]),

  // Wallets table
  wallets: defineTable({
    accountId: v.id("accounts"),
    type: v.union(
      v.literal("spending"),
      v.literal("savings"),
      v.literal("multisig")
    ),
    name: v.string(),
    balance: v.number(),
    currency: v.string(),
    lastUpdated: v.string(),
    
    // Discriminated union based on wallet type
    networkIdentities: v.union(
      // Spending wallet identities
      v.object({
        type: v.literal("spending"),
        lightning: v.string(), // username@bitchat.com
        nostr: v.string(),    // username@bitchat.com
      }),
      
      // Savings wallet identities
      v.object({
        type: v.literal("savings"),
        bitcoinAddress: v.string(),      // Single address
        derivationPath: v.string(),      // BIP32 path
      }),
      
      // Multisig wallet identities
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
        scriptType: v.union(
          v.literal("p2sh"),
          v.literal("p2wsh"),
          v.literal("p2tr")
        ),
      })
    ),
  })
  .index("by_account_id", ["accountId"])
  .index("by_account_and_type", ["accountId", "type"])
  .index("by_account_and_balance", ["accountId", "balance"]),

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
  .index("by_wallet_and_type", ["walletId", "type"])
  .index("by_wallet_and_status", ["walletId", "status"])
  .index("by_timestamp", ["timestamp"])
  .index("by_wallet_and_timestamp", ["walletId", "timestamp"]),

  // TransferTransactions table - For internal wallet-to-wallet transfers
  transferTransactions: defineTable({
    sourceWalletId: v.id("wallets"),
    destinationWalletId: v.id("wallets"),
    amount: v.number(),
    fee: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed")
    ),
    timestamp: v.string(),
    description: v.string(),
    type: v.literal("internal_transfer"),
    metadata: v.object({
      messageId: v.optional(v.id("messages")),
      memo: v.optional(v.string()),
      tags: v.array(v.string()),
      processingAttempts: v.number(),
      lastAttempt: v.optional(v.string()),
      errorMessage: v.optional(v.string()),
    }),
  })
  .index("by_source_wallet", ["sourceWalletId"])
  .index("by_destination_wallet", ["destinationWalletId"])
  .index("by_status", ["status"])
  .index("by_timestamp", ["timestamp"]),

  // Conversations table
  conversations: defineTable({
    participants: v.array(v.id("users")),
    lastMessageId: v.optional(v.id("messages")),
    lastMessageAt: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("archived"),
      v.literal("blocked")
    ),
    metadata: v.object({
      name: v.optional(v.string()),
      isGroup: v.boolean(),
      createdBy: v.id("users"),
      linkedUserId: v.id("users")
    }),
  })
  .index("by_participants", ["participants"])
  .index("by_updated", ["updatedAt"])
  .index("by_status", ["status"]),

  // Messages table
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    timestamp: v.string(),
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read")
    ),
    type: v.union(
      v.literal("text"),
      v.literal("payment"),
      v.literal("payment_request"),
      v.literal("payment_sent"),
      v.literal("payment_received")
    ),
    metadata: v.object({
      amount: v.optional(v.number()),
      senderId: v.optional(v.id("users")),
      recipientId: v.optional(v.id("users")),
      transferId: v.optional(v.id("transferTransactions")),
      requestId: v.optional(v.id("paymentRequests")),
      visibility: v.optional(v.union(
        v.literal("sender_only"),
        v.literal("recipient_only"),
        v.literal("both")
      )),
      requestStatus: v.optional(v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("declined"),
        v.literal("cancelled"),
        v.literal("completed")
      )),
      replyTo: v.optional(v.id("messages")),
      attachments: v.optional(v.array(v.string())),
      reactions: v.optional(v.array(v.object({
        type: v.string(),
        userId: v.id("users")
      })))
    })
  })
  .index("by_conversation", ["conversationId"])
  .index("by_sender", ["senderId"])
  .index("by_timestamp", ["timestamp"])
  .index("by_status", ["status"]),

  // Conversation Participants table
  conversationParticipants: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    joinedAt: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("member")
    ),
    lastReadMessageId: v.optional(v.id("messages")),
    lastReadAt: v.optional(v.string()),
    isArchived: v.boolean(),
    isMuted: v.boolean(),
    notificationPreferences: v.object({
      mentions: v.boolean(),
      all: v.boolean()
    }),
  })
  .index("by_user", ["userId"])
  .index("by_conversation_user", ["conversationId", "userId"])
  .index("by_unread", ["lastReadAt"]),

  // Payment Requests table
  paymentRequests: defineTable({
    requesterId: v.id("users"),
    recipientId: v.id("users"),
    messageId: v.id("messages"),
    amount: v.number(),
    currency: v.string(),
    type: v.union(v.literal("lightning"), v.literal("onchain")),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("cancelled"),
      v.literal("completed")
    ),
    metadata: v.object({
      description: v.string(),
      expiresAt: v.string(),
      paymentRequest: v.string(),
      customData: v.object({
        category: v.string(),
        notes: v.optional(v.string()),
        tags: v.optional(v.array(v.string()))
      }),
      declineReason: v.optional(v.string()),
      cancelReason: v.optional(v.string())
    }),
    createdAt: v.string(),
    updatedAt: v.string()
  })
  .index("by_requester", ["requesterId"])
  .index("by_recipient", ["recipientId"])
  .index("by_status", ["status"])
  .index("by_created", ["createdAt"])
  .index("by_updated", ["updatedAt"]),

  // Notifications table - Enhanced for Suggested Actions
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("payment_request"),
      v.literal("payment_sent"),
      v.literal("payment_received"),
      v.literal("security"),
      v.literal("system")
    ),
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("dismissed"),
      v.literal("actioned"),
      v.literal("expired")
    ),
    priority: v.object({
      base: v.union(
        v.literal("high"),
        v.literal("medium"),
        v.literal("low")
      ),
      modifiers: v.object({
        actionRequired: v.boolean(),
        timeConstraint: v.boolean(),
        amount: v.number(),
        role: v.union(
          v.literal("sender"),
          v.literal("recipient")
        )
      }),
      calculatedPriority: v.number()
    }),
    displayLocation: v.union(
      v.literal("suggested_actions"),
      v.literal("toast"),
      v.literal("both")
    ),
    metadata: v.object({
      gradient: v.string(),
      expiresAt: v.optional(v.string()),
      actionRequired: v.boolean(),
      dismissible: v.boolean(),
      relatedEntityId: v.optional(v.string()),
      relatedEntityType: v.optional(v.string()),
      counterpartyId: v.optional(v.id("users")),
      visibility: v.union(
        v.literal("sender_only"),
        v.literal("recipient_only"),
        v.literal("both")
      ),
      role: v.optional(v.union(
        v.literal("sender"),
        v.literal("recipient")
      )),
      parentNotificationId: v.optional(v.id("notifications")),
      paymentData: v.optional(v.object({
        amount: v.number(),
        currency: v.string(),
        type: v.union(
          v.literal("lightning"),
          v.literal("onchain")
        ),
        status: v.union(
          v.literal("pending"),
          v.literal("completed"),
          v.literal("failed")
        )
      }))
    }),
    createdAt: v.string(),
    updatedAt: v.string()
  })
  .index("by_user", ["userId"])
  .index("by_status", ["status"])
  .index("by_type", ["type"])
  .index("by_priority", ["priority.calculatedPriority"])
  .index("by_display_location", ["displayLocation"])
  .index("by_related", ["metadata.relatedEntityId"]),

  // Contacts table
  contacts: defineTable({
    userId: v.id("users"),
    contactId: v.id("users"),
    nickname: v.string(),
    type: v.union(v.literal("personal"), v.literal("business")),
    status: v.union(v.literal("active"), v.literal("blocked")),
    metadata: v.object({
      notes: v.optional(v.string()),
      tags: v.array(v.string()),
      lastInteraction: v.string(),
    }),
    createdAt: v.string(),
  })
  .index("by_user", ["userId"])
  .index("by_contact", ["contactId"]),

  // Bolt Cards table
  boltCards: defineTable({
    walletId: v.id("wallets"),
    name: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("suspended")
    ),
    limitPerTransaction: v.number(),
    dailyLimit: v.number(),
    lastUsed: v.string(),
  }).index("by_wallet", ["walletId"]),
  
}); 