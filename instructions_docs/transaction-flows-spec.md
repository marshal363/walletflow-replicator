# Transaction Flows and Categorization Specification

## Transaction Types Overview

### 1. Personal-to-Personal Payment Requests

```typescript
interface P2PPaymentRequest {
  type: "p2p_payment_request";
  sender: {
    accountId: Id<"accounts">;
    userId: Id<"users">;
    type: "personal";
  };
  recipient: {
    accountId: Id<"accounts">;
    userId: Id<"users">;
    type: "personal";
  };
  category: {
    id: v.id("categories");
    name: string;
    source: "user_selected";
    subcategory?: string;
  };
  amount: number;
  currency: string;
  description: string;
}
```

### 2. Business-Generated Payment Requests

```typescript
interface BusinessPaymentRequest {
  type: "business_payment_request";
  sender: {
    accountId: Id<"accounts">;
    userId: Id<"users">;
    type: "business";
    businessProfile: {
      id: Id<"businessProfiles">;
      category: {
        main: string;
        sub: string;
      };
    };
  };
  recipient: {
    accountId: Id<"accounts">;
    userId: Id<"users">;
    type: "personal";
  };
  category: {
    // Inherited from business profile
    id: v.id("categories");
    name: string;
    source: "business_profile";
    subcategory: string;
  };
  items: Array<{
    id: Id<"storeItems">;
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  receipt: {
    number: string;
    subtotal: number;
    tax: number;
    total: number;
  };
}
```

### 3. External Transactions

```typescript
interface ExternalTransaction {
  type: "external_transaction";
  direction: "incoming" | "outgoing";
  externalParty: {
    identifier: string; // Lightning address, LNURL, etc.
    name?: string;
    type: "unknown" | "identified_merchant";
  };
  category: {
    id: v.id("categories");
    name: string;
    source: "user_selected" | "auto_suggested";
    confidence?: number; // For auto-suggested categories
  };
  amount: number;
  currency: string;
  description: string;
}
```

### 4. External Merchant Payment Requests

```typescript
interface ExternalMerchantRequest {
  type: "external_merchant_request";
  merchant: {
    identifier: string;
    name?: string;
    type: "lnurl_pay" | "lightning_address" | "other";
    metadata?: {
      merchantName?: string;
      description?: string;
      url?: string;
    };
  };
  category: {
    id: v.id("categories");
    name: string;
    source: "auto_suggested" | "user_selected";
    confidence?: number;
  };
  amount: number;
  currency: string;
  description: string;
}
```

## Category Assignment Flow

### 1. Personal-to-Personal Flow

```typescript
const p2pCategoryFlow = {
  selectionPoint: "payment_request_creation",
  required: true,
  allowedCategories: TRANSACTION_CATEGORIES,
  validation: {
    requireSubcategory: false,
    allowCustomDescription: true,
  },
  ui: {
    component: "CategorySelector",
    showFrequentCategories: true,
    showRecentCategories: true,
  },
};
```

### 2. Business Flow

```typescript
const businessCategoryFlow = {
  selectionPoint: "business_profile_setup",
  required: true,
  allowedCategories: BUSINESS_CATEGORIES,
  validation: {
    requireSubcategory: true,
    requireBusinessType: true,
  },
  inheritance: {
    target: "all_transactions",
    mode: "automatic",
    override: false,
  },
};
```

### 3. External Transaction Flow

```typescript
const externalCategoryFlow = {
  selectionPoint: "transaction_review",
  required: false,
  autoSuggestion: {
    enabled: true,
    sources: [
      "merchant_name_matching",
      "description_analysis",
      "historical_patterns",
    ],
    confidenceThreshold: 0.8,
  },
  ui: {
    component: "CategorySuggestionCard",
    allowEdit: true,
    showConfidence: true,
  },
};
```

## Insights Implementation

### 1. Personal Account Insights

```typescript
interface PersonalInsights {
  timeRange: {
    start: string;
    end: string;
    type: "daily" | "weekly" | "monthly" | "custom";
  };
  spending: {
    byCategory: Array<{
      categoryId: string;
      total: number;
      count: number;
      trend: number; // Percentage change from previous period
      merchants: Array<{
        name: string;
        total: number;
        frequency: number;
      }>;
    }>;
    trends: {
      topIncreases: Array<CategoryTrend>;
      topDecreases: Array<CategoryTrend>;
      unusualActivity: Array<AnomalyDetection>;
    };
  };
  budgets: {
    byCategory: Array<{
      categoryId: string;
      limit: number;
      current: number;
      projected: number;
      status: "safe" | "warning" | "exceeded";
    }>;
  };
  recommendations: Array<{
    type: "budget_adjustment" | "spending_alert" | "saving_opportunity";
    category?: string;
    description: string;
    impact: number;
  }>;
}
```

### 2. Business Account Insights

```typescript
interface BusinessInsights extends PersonalInsights {
  sales: {
    total: number;
    count: number;
    averageTicket: number;
    peakHours: Array<{
      hour: number;
      sales: number;
      transactions: number;
    }>;
  };
  customers: {
    total: number;
    returning: number;
    new: number;
    topSpenders: Array<{
      userId: string;
      total: number;
      visits: number;
    }>;
  };
  inventory?: {
    lowStock: Array<{
      itemId: string;
      name: string;
      currentStock: number;
      reorderPoint: number;
    }>;
    topSellers: Array<{
      itemId: string;
      name: string;
      quantity: number;
      revenue: number;
    }>;
  };
  locationInsights?: Array<{
    locationId: string;
    name: string;
    sales: number;
    transactions: number;
    peakHours: Array<{
      hour: number;
      sales: number;
    }>;
  }>;
}
```

## Implementation Guidelines

### 1. Category Assignment Rules

1. P2P Transactions:

   - Sender must select category during request creation
   - Category is preserved through the payment flow
   - Both parties can see the category

2. Business Transactions:

   - Category is automatically assigned from business profile
   - Cannot be overridden in normal flow
   - Stored with transaction for analytics

3. External Transactions:
   - Auto-suggestion based on available data
   - User can modify before finalizing
   - Learning system improves suggestions over time

### 2. Analytics Generation

1. Real-time Updates:

   - Transaction categorization
   - Budget tracking
   - Basic metrics

2. Scheduled Analysis:
   - Trend detection
   - Pattern recognition
   - Anomaly detection
   - Recommendation generation

### 3. Data Privacy

1. Category Information:

   - Visible to both parties in P2P
   - Business categories are public
   - Personal categorization is private

2. Analytics:
   - Personal insights are private
   - Business insights configurable
   - Aggregate data anonymized

## Migration Strategy

### Phase 1: Basic Categorization

1. Implement category selection in P2P flows
2. Add business profile categorization
3. Basic external transaction handling

### Phase 2: Enhanced Features

1. Auto-suggestion system
2. Advanced analytics
3. Business insights

### Phase 3: Machine Learning

1. Pattern recognition
2. Improved suggestions
3. Anomaly detection
