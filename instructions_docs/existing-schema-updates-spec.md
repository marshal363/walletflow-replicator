# Existing Schema Updates for Categorization Support

## Overview

This document outlines the necessary updates to existing tables to support the new categorization system and transaction types.

## 1. Accounts Table Updates

```typescript
accounts: defineTable({
  // ... existing fields ...

  // New Fields
  type: v.union(v.literal("personal"), v.literal("business")),

  businessProfile: v.optional(
    v.object({
      type: v.union(
        ...Object.keys(BUSINESS_CATEGORIES).map((k) => v.literal(k))
      ),
      category: v.object({
        main: v.string(),
        sub: v.string(),
      }),
      displayName: v.string(),
      description: v.optional(v.string()),
      contactInfo: v.object({
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        website: v.optional(v.string()),
      }),
    })
  ),

  // Category Preferences
  categoryPreferences: v.optional(
    v.object({
      defaultCategories: v.array(v.id("categories")),
      budgetLimits: v.map(v.number()), // categoryId -> limit
      notificationThresholds: v.map(v.number()), // categoryId -> threshold percentage
    })
  ),

  // Analytics Preferences
  analyticsPreferences: v.optional(
    v.object({
      enabledReports: v.array(v.string()),
      customRanges: v.array(
        v.object({
          name: v.string(),
          startDate: v.string(),
          endDate: v.string(),
        })
      ),
      defaultView: v.string(),
    })
  ),
});
```

## 2. Payment Requests Table Updates

```typescript
paymentRequests: defineTable({
  // ... existing fields ...

  // Transaction Type
  type: v.union(
    v.literal("p2p_payment_request"),
    v.literal("business_payment_request"),
    v.literal("external_merchant")
  ),

  // Category Information
  category: v.object({
    id: v.id("categories"),
    name: v.string(),
    source: v.union(
      v.literal("user_selected"),
      v.literal("business_profile"),
      v.literal("auto_suggested"),
      v.literal("system_default")
    ),
    confidence: v.optional(v.number()),
  }),

  // Business Context
  businessContext: v.optional(
    v.object({
      businessId: v.id("businessProfiles"),
      storeId: v.optional(v.string()),
      locationId: v.optional(v.string()),
      items: v.optional(
        v.array(
          v.object({
            itemId: v.id("storeItems"),
            name: v.string(),
            quantity: v.number(),
            price: v.number(),
            total: v.number(),
            category: v.object({
              id: v.id("categories"),
              name: v.string(),
            }),
          })
        )
      ),
      receipt: v.optional(
        v.object({
          number: v.string(),
          subtotal: v.number(),
          tax: v.number(),
          total: v.number(),
          metadata: v.object({
            merchantName: v.string(),
            location: v.optional(v.string()),
            timestamp: v.string(),
          }),
        })
      ),
    })
  ),

  // External Context
  externalContext: v.optional(
    v.object({
      identifier: v.string(),
      type: v.union(
        v.literal("lnurl_pay"),
        v.literal("lightning_address"),
        v.literal("other")
      ),
      metadata: v.optional(
        v.object({
          merchantName: v.optional(v.string()),
          description: v.optional(v.string()),
          url: v.optional(v.string()),
        })
      ),
    })
  ),

  // Analytics Metadata
  analyticsMetadata: v.object({
    frequency: v.union(v.literal("one-time"), v.literal("recurring")),
    importance: v.union(
      v.literal("essential"),
      v.literal("non-essential"),
      v.literal("investment")
    ),
    tags: v.array(v.string()),
    customData: v.optional(v.map(v.string())),
  }),
});
```

## 3. Transactions Table Updates

```typescript
transactions: defineTable({
  // ... existing fields ...

  // Transaction Type
  type: v.union(
    v.literal("p2p_payment"),
    v.literal("business_payment"),
    v.literal("external_incoming"),
    v.literal("external_outgoing"),
    v.literal("internal_transfer")
  ),

  // Category Information
  category: v.object({
    id: v.id("categories"),
    name: v.string(),
    source: v.union(
      v.literal("payment_request"),
      v.literal("business_profile"),
      v.literal("auto_suggested"),
      v.literal("user_selected"),
      v.literal("system_default")
    ),
    confidence: v.optional(v.number()),
  }),

  // Related Entities
  relatedEntities: v.object({
    paymentRequestId: v.optional(v.id("paymentRequests")),
    messageId: v.optional(v.id("messages")),
    notificationIds: v.array(v.id("notifications")),
  }),

  // Business Context
  businessContext: v.optional(
    v.object({
      businessId: v.id("businessProfiles"),
      storeId: v.optional(v.string()),
      locationId: v.optional(v.string()),
      receipt: v.optional(
        v.object({
          number: v.string(),
          items: v.array(
            v.object({
              name: v.string(),
              quantity: v.number(),
              price: v.number(),
              total: v.number(),
              category: v.object({
                id: v.id("categories"),
                name: v.string(),
              }),
            })
          ),
        })
      ),
    })
  ),

  // External Context
  externalContext: v.optional(
    v.object({
      identifier: v.string(),
      type: v.union(
        v.literal("lightning_address"),
        v.literal("lnurl"),
        v.literal("other")
      ),
      metadata: v.optional(
        v.object({
          merchantName: v.optional(v.string()),
          description: v.optional(v.string()),
          url: v.optional(v.string()),
        })
      ),
    })
  ),

  // Analytics Metadata
  analyticsMetadata: v.object({
    frequency: v.union(v.literal("one-time"), v.literal("recurring")),
    importance: v.union(
      v.literal("essential"),
      v.literal("non-essential"),
      v.literal("investment")
    ),
    cashFlowImpact: v.union(
      v.literal("income"),
      v.literal("expense"),
      v.literal("transfer")
    ),
    tags: v.array(v.string()),
    customData: v.optional(v.map(v.string())),
  }),
});
```

## 4. Messages Table Updates

```typescript
messages: defineTable({
  // ... existing fields ...

  // Payment Context
  paymentContext: v.optional(
    v.object({
      type: v.union(
        v.literal("p2p_payment_request"),
        v.literal("business_payment_request"),
        v.literal("external_merchant"),
        v.literal("payment"),
        v.literal("refund")
      ),
      amount: v.number(),
      currency: v.string(),
      category: v.object({
        id: v.id("categories"),
        name: v.string(),
        source: v.string(),
      }),
      businessContext: v.optional(
        v.object({
          businessId: v.id("businessProfiles"),
          storeId: v.optional(v.string()),
          locationId: v.optional(v.string()),
        })
      ),
    })
  ),

  // Message Metadata
  metadata: v.object({
    isPaymentRelated: v.boolean(),
    hasCategory: v.boolean(),
    tags: v.array(v.string()),
  }),
});
```

## Implementation Guidelines

### 1. Migration Steps

```typescript
async function migrateExistingData(db: DatabaseTransaction) {
  // 1. Update Accounts
  const accounts = await db.query("accounts").collect();
  for (const account of accounts) {
    await db.patch(account._id, {
      type: account.businessProfile ? "business" : "personal",
      categoryPreferences: {
        defaultCategories: [],
        budgetLimits: {},
        notificationThresholds: {},
        autoCategorizationEnabled: true,
      },
    });
  }

  // 2. Update Payment Requests
  const requests = await db.query("paymentRequests").collect();
  for (const request of requests) {
    const category = await determineCategory(request);
    await db.patch(request._id, {
      type: determinePRType(request),
      category,
      analyticsMetadata: generateAnalyticsMetadata(request),
    });
  }

  // 3. Update Transactions
  const transactions = await db.query("transactions").collect();
  for (const tx of transactions) {
    const category = await determineCategory(tx);
    await db.patch(tx._id, {
      type: determineTxType(tx),
      category,
      analyticsMetadata: generateAnalyticsMetadata(tx),
    });
  }
}
```

### 2. Category Assignment Functions

```typescript
async function determineCategory(
  entity: PaymentRequest | Transaction
): Promise<Category> {
  if (entity.businessContext?.businessId) {
    return getBusinessCategory(entity.businessContext.businessId);
  }

  if (entity.type === "external_merchant") {
    return suggestCategoryFromMerchant(entity);
  }

  return getDefaultCategory();
}

async function suggestCategoryFromMerchant(
  entity: PaymentRequest | Transaction
): Promise<Category> {
  const confidence = await calculateConfidence(entity);
  if (confidence > 0.8) {
    return {
      ...(await predictCategory(entity)),
      source: "auto_suggested",
      confidence,
    };
  }
  return getDefaultCategory();
}
```

## Migration Strategy

### Phase 1: Schema Updates

1. Deploy new table schemas
2. Add new fields with default values
3. Create necessary indexes

### Phase 2: Data Migration

1. Categorize existing transactions
2. Update business profiles
3. Generate initial analytics

### Phase 3: Feature Rollout

1. Enable new transaction types
2. Activate categorization system
3. Launch analytics features

## Validation Requirements

### 1. Data Integrity

- Ensure all required fields are present
- Validate category relationships
- Check business profile consistency

### 2. Performance

- Monitor query performance
- Check index effectiveness
- Validate analytics generation time

### 3. User Experience

- Test category selection flow
- Validate business profile creation
- Check analytics accessibility
