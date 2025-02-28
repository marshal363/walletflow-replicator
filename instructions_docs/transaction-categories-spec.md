# Transaction Categories Technical Specification

## 1. Transaction Types and Categories

### A. Transaction Type Definitions

```typescript
type TransactionType =
  | "p2p_payment_request" // Personal to Personal payment request
  | "business_payment_request" // Business generated payment request/invoice
  | "external_incoming" // External incoming payment (non-BitChat)
  | "external_outgoing" // External outgoing payment (non-BitChat)
  | "external_merchant" // External merchant payment request (LNURL, etc.)
  | "internal_transfer"; // Internal wallet transfer

type CategorySource =
  | "user_selected" // Manually selected by user
  | "business_profile" // Inherited from business profile
  | "auto_suggested" // Automatically suggested by system
  | "system_default"; // Default system category

interface TransactionCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  type: "expense" | "income" | "transfer";
  metadata: {
    isSystem: boolean; // True for predefined categories
    isCustom: boolean; // True for user-created categories
    parentId?: string; // For hierarchical categories
    tags: string[]; // Additional classification tags
  };
}
```

### B. Category Assignment Rules

```typescript
interface CategoryAssignmentRules {
  [TransactionType: string]: {
    required: boolean;
    allowedSources: CategorySource[];
    validation: {
      requireSubcategory: boolean;
      allowCustomDescription: boolean;
      allowOverride: boolean;
    };
    inheritance?: {
      source: "business_profile" | "payment_request" | "merchant_data";
      mode: "strict" | "suggested";
    };
  };
}

const categoryAssignmentRules: CategoryAssignmentRules = {
  p2p_payment_request: {
    required: true,
    allowedSources: ["user_selected", "system_default"],
    validation: {
      requireSubcategory: false,
      allowCustomDescription: true,
      allowOverride: true,
    },
  },
  business_payment_request: {
    required: true,
    allowedSources: ["business_profile"],
    validation: {
      requireSubcategory: true,
      allowCustomDescription: false,
      allowOverride: false,
    },
    inheritance: {
      source: "business_profile",
      mode: "strict",
    },
  },
  external_incoming: {
    required: false,
    allowedSources: ["auto_suggested", "user_selected"],
    validation: {
      requireSubcategory: false,
      allowCustomDescription: true,
      allowOverride: true,
    },
  },
  external_outgoing: {
    required: false,
    allowedSources: ["auto_suggested", "user_selected"],
    validation: {
      requireSubcategory: false,
      allowCustomDescription: true,
      allowOverride: true,
    },
  },
  external_merchant: {
    required: false,
    allowedSources: ["auto_suggested", "user_selected"],
    validation: {
      requireSubcategory: false,
      allowCustomDescription: true,
      allowOverride: true,
    },
    inheritance: {
      source: "merchant_data",
      mode: "suggested",
    },
  },
};
```

## 2. Category Schema

### A. Base Categories Table

```typescript
categories: defineTable({
  // Core Category Data
  name: v.string(),
  icon: v.string(),
  color: v.string(),
  description: v.string(),
  type: v.union(
    v.literal("expense"),
    v.literal("income"),
    v.literal("transfer")
  ),

  // Hierarchy and Classification
  parentId: v.optional(v.id("categories")),
  path: v.array(v.id("categories")), // Full path from root
  level: v.number(), // Depth in hierarchy

  // Metadata
  metadata: v.object({
    isSystem: v.boolean(),
    isCustom: v.boolean(),
    tags: v.array(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
    lastUsed: v.optional(v.string()),
    usageCount: v.number(),
  }),

  // Budget Settings
  budgetSettings: v.optional(
    v.object({
      defaultLimit: v.number(),
      warningThreshold: v.number(), // percentage
      trackingEnabled: v.boolean(),
    })
  ),

  // Analytics Settings
  analyticsSettings: v.object({
    includeInReports: v.boolean(),
    aggregationType: v.union(
      v.literal("sum"),
      v.literal("average"),
      v.literal("count")
    ),
    customMetrics: v.array(v.string()),
  }),
});
```

### B. Category Assignments Table

```typescript
categoryAssignments: defineTable({
  // Assignment Context
  transactionId: v.union(v.id("transactions"), v.id("paymentRequests")),
  categoryId: v.id("categories"),

  // Assignment Metadata
  source: v.union(
    v.literal("user_selected"),
    v.literal("business_profile"),
    v.literal("auto_suggested"),
    v.literal("system_default")
  ),

  // For auto-suggested categories
  confidence: v.optional(v.number()),
  suggestionMethod: v.optional(v.string()),

  // Tracking
  assignedAt: v.string(),
  assignedBy: v.id("users"),
  previousAssignments: v.array(
    v.object({
      categoryId: v.id("categories"),
      assignedAt: v.string(),
      assignedBy: v.id("users"),
      reason: v.string(),
    })
  ),
});
```

## 2. Predefined Categories

### A. System Categories

```typescript
const SYSTEM_CATEGORIES = {
  // Income Categories
  INCOME: {
    id: "income",
    name: "Income",
    icon: "wallet",
    color: "#34D399",
    type: "income",
    subcategories: {
      SALARY: {
        id: "salary",
        name: "Salary",
        icon: "briefcase",
      },
      BUSINESS: {
        id: "business_income",
        name: "Business Income",
        icon: "storefront",
      },
      INVESTMENT: {
        id: "investment_income",
        name: "Investment Returns",
        icon: "trending-up",
      },
      OTHER: {
        id: "other_income",
        name: "Other Income",
        icon: "plus-circle",
      },
    },
  },

  // Expense Categories
  EXPENSES: {
    id: "expenses",
    name: "Expenses",
    icon: "credit-card",
    color: "#F87171",
    type: "expense",
    subcategories: {
      HOUSING: {
        id: "housing",
        name: "Housing",
        icon: "home",
        subcategories: {
          RENT: { id: "rent", name: "Rent", icon: "key" },
          UTILITIES: { id: "utilities", name: "Utilities", icon: "zap" },
          MAINTENANCE: { id: "maintenance", name: "Maintenance", icon: "tool" },
        },
      },
      FOOD: {
        id: "food",
        name: "Food & Dining",
        icon: "utensils",
        subcategories: {
          GROCERIES: {
            id: "groceries",
            name: "Groceries",
            icon: "shopping-cart",
          },
          RESTAURANTS: {
            id: "restaurants",
            name: "Restaurants",
            icon: "coffee",
          },
        },
      },
      TRANSPORTATION: {
        id: "transportation",
        name: "Transportation",
        icon: "car",
        subcategories: {
          PUBLIC: {
            id: "public_transport",
            name: "Public Transport",
            icon: "bus",
          },
          FUEL: { id: "fuel", name: "Fuel", icon: "droplet" },
          MAINTENANCE: {
            id: "vehicle_maintenance",
            name: "Vehicle Maintenance",
            icon: "tool",
          },
        },
      },
      SHOPPING: {
        id: "shopping",
        name: "Shopping",
        icon: "shopping-bag",
        subcategories: {
          CLOTHING: { id: "clothing", name: "Clothing", icon: "shirt" },
          ELECTRONICS: {
            id: "electronics",
            name: "Electronics",
            icon: "smartphone",
          },
          HOUSEHOLD: { id: "household", name: "Household", icon: "home" },
        },
      },
    },
  },
};

// Business Categories
const BUSINESS_CATEGORIES = {
  RETAIL: {
    id: "retail",
    name: "Retail",
    subcategories: {
      CLOTHING: { id: "clothing_store", name: "Clothing Store" },
      ELECTRONICS: { id: "electronics_store", name: "Electronics Store" },
      GENERAL: { id: "general_store", name: "General Store" },
    },
  },
  FOOD_SERVICE: {
    id: "food_service",
    name: "Food Service",
    subcategories: {
      RESTAURANT: { id: "restaurant", name: "Restaurant" },
      CAFE: { id: "cafe", name: "Café" },
      FAST_FOOD: { id: "fast_food", name: "Fast Food" },
    },
  },
  SERVICES: {
    id: "services",
    name: "Services",
    subcategories: {
      PROFESSIONAL: { id: "professional", name: "Professional Services" },
      PERSONAL: { id: "personal", name: "Personal Services" },
      TECHNICAL: { id: "technical", name: "Technical Services" },
    },
  },
};
```

### B. Store Items Schema

```typescript
storeItems: defineTable({
  // Basic Item Info
  name: v.string(),
  description: v.optional(v.string()),
  sku: v.optional(v.string()),

  // Pricing
  price: v.number(),
  currency: v.string(),
  discountable: v.boolean(),

  // Categorization
  category: v.object({
    id: v.id("categories"),
    name: v.string(),
    path: v.array(v.string()), // Category hierarchy path
  }),

  // Business Context
  businessId: v.id("businessProfiles"),
  storeId: v.string(),
  locationId: v.optional(v.string()),

  // Inventory
  trackInventory: v.boolean(),
  currentStock: v.optional(v.number()),
  lowStockThreshold: v.optional(v.number()),

  // Analytics
  analytics: v.object({
    totalSold: v.number(),
    revenue: v.number(),
    averageRating: v.optional(v.number()),
    popularityScore: v.number(),
  }),

  // Metadata
  metadata: v.object({
    isActive: v.boolean(),
    tags: v.array(v.string()),
    customData: v.optional(v.map(v.string())),
  }),
});
```

### C. Transaction Analytics

```typescript
transactionAnalytics: defineTable({
  // Entity References
  transactionId: v.union(v.id("transactions"), v.id("paymentRequests")),
  accountId: v.id("accounts"),
  categoryId: v.id("categories"),

  // Time Context
  timestamp: v.string(),
  period: v.object({
    day: v.string(),
    week: v.string(),
    month: v.string(),
    year: v.string(),
  }),

  // Basic Metrics
  amount: v.number(),
  currency: v.string(),
  type: v.union(
    v.literal("income"),
    v.literal("expense"),
    v.literal("transfer")
  ),

  // Category Analysis
  categoryMetrics: v.object({
    periodTotal: v.number(),
    periodAverage: v.number(),
    percentageOfCategory: v.number(),
    trend: v.union(
      v.literal("increasing"),
      v.literal("decreasing"),
      v.literal("stable")
    ),
  }),

  // Budget Impact
  budgetMetrics: v.optional(
    v.object({
      budgetId: v.id("budgets"),
      currentSpent: v.number(),
      remainingBudget: v.number(),
      percentageUsed: v.number(),
    })
  ),

  // Business Metrics
  businessMetrics: v.optional(
    v.object({
      customerSegment: v.string(),
      lifetime_value: v.number(),
      repeatPurchaseRate: v.number(),
    })
  ),

  // Predictive Metrics
  predictions: v.optional(
    v.object({
      nextExpectedAmount: v.number(),
      nextExpectedDate: v.string(),
      confidence: v.number(),
    })
  ),
});
```

## 3. Auto-Categorization System

### A. Merchant Recognition

```typescript
interface MerchantRecognitionRule {
  patterns: {
    name: RegExp[];
    description: RegExp[];
    identifier: RegExp[];
  };
  category: {
    id: string;
    confidence: number;
  };
  metadata: {
    created: string;
    lastUpdated: string;
    successRate: number;
    timesApplied: number;
  };
}
```

### B. ML-Based Categorization

```typescript
interface CategoryPrediction {
  categoryId: string;
  confidence: number;
  features: {
    merchantName: number;
    amount: number;
    description: number;
    timePattern: number;
    userHistory: number;
  };
  explanation: {
    mainFactors: string[];
    supportingEvidence: string[];
  };
}
```

## 4. Analytics Integration

### A. Category Analytics

```typescript
interface CategoryAnalytics {
  categoryId: string;
  period: {
    start: string;
    end: string;
    type: "day" | "week" | "month" | "year";
  };
  metrics: {
    transactionCount: number;
    totalAmount: number;
    averageAmount: number;
    medianAmount: number;
    largestTransaction: {
      id: string;
      amount: number;
      date: string;
    };
  };
  trends: {
    periodOverPeriod: number;
    yearOverYear: number;
    trend: "increasing" | "decreasing" | "stable";
  };
  budget: {
    limit: number;
    current: number;
    projected: number;
    status: "within" | "near" | "exceeded";
  };
}
```

### B. Business Category Analytics

```typescript
interface BusinessCategoryAnalytics extends CategoryAnalytics {
  customerMetrics: {
    uniqueCustomers: number;
    repeatCustomers: number;
    averageTicketSize: number;
  };
  itemMetrics: {
    topItems: Array<{
      itemId: string;
      name: string;
      quantity: number;
      revenue: number;
    }>;
    categoryDistribution: Array<{
      categoryId: string;
      percentage: number;
    }>;
  };
}
```

## 5. Implementation Guidelines

### A. Category Assignment Flow

1. Determine transaction type
2. Apply appropriate assignment rules
3. Handle auto-categorization if applicable
4. Validate category selection
5. Store assignment with metadata

### B. Analytics Processing

1. Real-time metrics update
2. Daily aggregation jobs
3. Weekly trend analysis
4. Monthly report generation

### C. Machine Learning Pipeline

1. Data collection and preprocessing
2. Feature extraction
3. Model training and validation
4. Prediction service deployment
5. Feedback loop integration

## 6. Migration Strategy

### Phase 1: Basic Structure

1. Create categories table
2. Implement base assignment system
3. Set up basic analytics

### Phase 2: Advanced Features

1. Enable auto-categorization
2. Implement ML pipeline
3. Add advanced analytics

### Phase 3: Optimization

1. Performance tuning
2. ML model refinement
3. Analytics optimization
