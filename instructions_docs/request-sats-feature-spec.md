# Request Sats Feature Specification

## 1. Overview

The Request Sats feature enables users to request Bitcoin payments through two main flows:

1. Lightning Invoice Generation (Lightning route)
2. In-Chat Payment Requests (Chat route)

Both flows integrate seamlessly with the wallet and messaging system while maintaining consistent UX patterns.

## 2. Core Components

### 2.1 QR Code Display Component

#### Overview

The QR code component provides a user-friendly interface for displaying payment information, focusing on simplicity while maintaining technical accuracy.

#### Visual Design

```
┌────────────────────────────────┐
│     ┌──────────────┐          │
│     │              │          │
│     │    QR Code   │          │
│     │              │          │
│     └──────────────┘          │
│                               │
│     Amount: 1,000 SATS        │
│     ≈ $0.43 USD              │
│                               │
│     [Copy Invoice]            │
│     [Share Payment]           │
│                               │
│     Expires in 23:45         │
└────────────────────────────────┘
```

#### Technical Implementation

```typescript
interface QRCodeDisplayProps {
  // Payment Data
  paymentData: {
    type: "internal_transfer";
    amount: number;
    recipientId: string;
    description?: string;
    expiresAt: string;
    paymentId: string;
  };

  // Display Configuration
  config: {
    size: {
      mobile: 280; // px
      tablet: 320; // px
      desktop: 380; // px
    };
    theme: {
      light: {
        foreground: "#000000";
        background: "#FFFFFF";
      };
      dark: {
        foreground: "#FFFFFF";
        background: "#000000";
      };
    };
    errorCorrection: "L" | "M" | "Q" | "H";
    quietZone: number;
  };

  // Status Management
  status: {
    state: "pending" | "processing" | "confirmed" | "failed" | "expired";
    timeRemaining?: number;
    confirmations?: number;
    error?: string;
  };

  // Callbacks
  onCopy: () => void;
  onShare: () => void;
  onStatusChange: (status: PaymentStatus) => void;
}
```

#### Features

1. **Responsive Display**

   - Automatically adjusts size based on device
   - Maintains optimal scanning size
   - High contrast display modes

2. **Payment Information**

   - Clear amount display in SATS and USD
   - Real-time USD conversion updates
   - Expiration countdown
   - Payment status indicator

3. **User Actions**

   - Copy invoice string
   - Share via system share sheet
   - Quick share buttons for messaging
   - Status notifications

4. **Status Handling**
   ```typescript
   interface StatusDisplay {
     pending: {
       animation: "pulse";
       color: "blue";
       message: "Waiting for payment...";
     };
     processing: {
       animation: "spinner";
       color: "yellow";
       message: "Processing payment...";
     };
     confirmed: {
       animation: "success";
       color: "green";
       message: "Payment received!";
     };
     failed: {
       animation: "none";
       color: "red";
       message: "Payment failed";
     };
     expired: {
       animation: "none";
       color: "gray";
       message: "Invoice expired";
     };
   }
   ```

### 2.2 Request Card Component

#### Overview

The Request Card component provides a comprehensive interface for displaying and managing payment requests within the chat context.

#### Visual Design

```
┌────────────────────────────────┐
│ Payment Request    [⋮]         │
│ ────────────────────          │
│ 1,000 SATS                    │
│ ≈ $0.43 USD                   │
│                               │
│ From: @alice                  │
│ Status: Pending               │
│                               │
│ [Approve] [Decline]          │
│                               │
│ Expires in 23:45             │
└────────────────────────────────┘
```

#### Technical Implementation

```typescript
interface RequestCardProps {
  // Request Data
  request: {
    id: string;
    amount: number;
    requesterId: string;
    recipientId: string;
    status: RequestStatus;
    createdAt: string;
    expiresAt: string;
    description?: string;
    type: "lightning" | "onchain";
  };

  // Display Mode
  mode: "chat" | "standalone";

  // State Management
  state: RequestState;

  // User Context
  userRole: "requester" | "recipient";

  // Callbacks
  onAction: (action: RequestAction) => void;
  onExpand: () => void;
  onCollapse: () => void;
}

type RequestStatus =
  | "pending"
  | "approved"
  | "declined"
  | "expired"
  | "completed";

type RequestAction =
  | "approve"
  | "decline"
  | "cancel"
  | "remind"
  | "create_new"
  | "view_transfer";
```

#### Features

1. **State-Based Display**

   ```typescript
   interface StateDisplay {
     pending: {
       layout: "action_prominent";
       actions: ["approve", "decline"];
       color: "blue";
       expandable: true;
     };
     approved: {
       layout: "info_prominent";
       actions: ["view_transfer"];
       color: "green";
       expandable: false;
     };
     declined: {
       layout: "info_prominent";
       actions: ["create_new"];
       color: "red";
       expandable: false;
     };
     expired: {
       layout: "info_prominent";
       actions: ["create_new"];
       color: "gray";
       expandable: false;
     };
   }
   ```

2. **Role-Based Actions**

   ```typescript
   interface UserActions {
     requester: {
       pending: {
         primary: ["cancel"];
         secondary: ["remind"];
       };
       approved: {
         primary: ["view_transfer"];
         secondary: [];
       };
       declined: {
         primary: ["create_new"];
         secondary: ["view_history"];
       };
     };
     recipient: {
       pending: {
         primary: ["approve", "decline"];
         secondary: ["counter_offer"];
       };
       approved: {
         primary: ["view_transfer"];
         secondary: [];
       };
       declined: {
         primary: ["view_history"];
         secondary: [];
       };
     };
   }
   ```

3. **Amount Display**

   ```typescript
   interface AmountDisplay {
     primary: {
       value: number;
       currency: "SATS";
       format: "comma_separated";
     };
     secondary: {
       value: number;
       currency: "USD";
       format: "decimal_2";
       updateFrequency: "real_time";
     };
   }
   ```

4. **History Tracking**

   ```typescript
   interface RequestHistory {
     events: Array<{
       timestamp: string;
       type: "created" | "modified" | "approved" | "declined" | "expired";
       actor: string;
       details: string;
     }>;
     attachments: Array<{
       type: "note" | "image" | "file";
       content: string;
       timestamp: string;
     }>;
   }
   ```

5. **Chat Integration**
   ```typescript
   interface ChatIntegration {
     collapsed: {
       height: number;
       preview: boolean;
       actions: string[];
     };
     expanded: {
       maxHeight: string;
       fullDetails: boolean;
       actions: string[];
     };
     animation: {
       type: "spring";
       duration: number;
       easing: string;
     };
   }
   ```

## 3. User Flows

### 3.1 Request Creation Flow

1. User initiates request
2. Enters amount via NumPad
3. Adds description (optional)
4. Confirms request
5. Request card appears in chat

### 3.2 Request Response Flow

1. Recipient views request
2. Reviews amount and details
3. Chooses action (approve/decline)
4. Confirms action
5. Views updated status

### 3.3 Payment Completion Flow

1. Request approved
2. Payment initiated
3. QR code displayed
4. Payment confirmed
5. Status updated

## 4. Error Handling

```typescript
interface ErrorHandling {
  validation: {
    amount: {
      min: number;
      max: number;
      message: string;
    };
    expiration: {
      min: string;
      max: string;
      message: string;
    };
  };
  network: {
    retry: {
      attempts: number;
      delay: number;
    };
    fallback: {
      type: string;
      message: string;
    };
  };
  user: {
    insufficient_funds: string;
    invalid_state: string;
    expired: string;
  };
}
```

## 5. Security Considerations

1. **Request Validation**

   - Amount limits
   - User authorization
   - Expiration enforcement
   - State transitions

2. **Payment Security**

   - Invoice validation
   - Payment confirmation
   - Balance updates
   - Transaction records

3. **User Protection**
   - Rate limiting
   - Spam prevention
   - Amount warnings
   - Confirmation dialogs

## 6. Success Metrics

1. **User Engagement**

   - Request creation rate
   - Response time
   - Completion rate
   - Abandonment rate

2. **Technical Performance**

   - Load time
   - Error rate
   - Status update speed
   - QR code scan success

3. **Business Metrics**
   - Transaction volume
   - Average request size
   - Conversion rate
   - User retention

## 7. Future Enhancements

1. **Technical**

   - Multiple invoice formats
   - Advanced routing options
   - Cross-chain support
   - Payment batching

2. **User Experience**

   - Request templates
   - Recurring payments
   - Split payments
   - Payment links

3. **Integration**
   - Wallet app deep links
   - External service hooks
   - Analytics integration
   - Notification system
