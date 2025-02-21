# Send Sats Feature Specification

## 1. Overview

The Send Sats feature enables seamless Bitcoin transactions within the messaging interface, allowing users to send Bitcoin (sats) to other users through an intuitive chat-based experience.

## 2. Core Functionality

### 2.1 User Flow

1. **Initiation**

   - From message thread or standalone send screen
   - Quick action buttons in chat
   - AI-detected payment suggestions
   - Manual amount entry

2. **Amount Selection**

   - NumPad interface for amount entry
   - Preset amount suggestions
   - Currency toggle (SATS/BTC)
   - Amount validation

3. **Recipient Selection**

   - Search by username/pubkey
   - Recent recipients
   - Contact list integration
   - Recipient validation

4. **Transaction Confirmation**

   - Amount verification
   - Recipient confirmation
   - Fee preview
   - Network selection (Lightning/Onchain)

5. **Processing & Feedback**
   - Loading states
   - Success confirmation
   - Error handling
   - Transaction receipt

### 2.2 Technical Components

#### UI Components

```typescript
interface SendComponentProps {
  recipientId?: Id<"users">;
  initialAmount?: number;
  onSuccess?: (txId: Id<"transfers">) => void;
  onError?: (error: Error) => void;
}

interface AmountComponentProps {
  onAmountConfirm: (amount: number) => void;
  initialAmount?: number;
  maxAmount?: number;
}

interface TransferHandlerProps {
  amount: number;
  recipientId: Id<"users">;
  networkType: "lightning" | "onchain";
}
```

#### Data Models

```typescript
interface Transfer {
  id: Id<"transfers">;
  senderId: Id<"users">;
  recipientId: Id<"users">;
  amount: number;
  status: "pending" | "completed" | "failed";
  networkType: "lightning" | "onchain";
  messageId?: Id<"messages">;
  createdAt: string;
  metadata: {
    txHash?: string;
    errorMessage?: string;
    fee?: number;
  };
}

interface TransferMessage {
  type: "transfer";
  transferId: Id<"transfers">;
  amount: number;
  status: TransferStatus;
  senderAccountId: Id<"accounts">;
  recipientAccountId: Id<"accounts">;
}
```

### 2.3 State Management

```typescript
// Transfer State
interface TransferState {
  isProcessing: boolean;
  currentStep: "amount" | "recipient" | "confirm";
  amount?: number;
  recipient?: User;
  error?: Error;
  transferId?: Id<"transfers">;
}

// Logging State
interface TransferLogs {
  userId: string;
  accountId: string;
  amount: number;
  recipientId: string;
  timestamp: string;
  status: string;
  context: {
    messageId?: string;
    conversationId?: string;
  };
}
```

## 3. Implementation Details

### 3.1 Enhanced Logging

```typescript
// Component Level Logging
console.log("💸 Send Component State:", {
  userId: currentUser?.id,
  accountId: selectedAccount?.id,
  amount,
  recipient,
  step: currentStep,
  isProcessing,
});

// Transfer Processing Logging
console.log("🔄 Transfer Processing:", {
  transferId,
  senderId: currentUser.id,
  recipientId: recipient.id,
  amount,
  networkType,
  timestamp: new Date().toISOString(),
});

// Message Integration Logging
console.log("💬 Message Integration:", {
  messageId,
  conversationId,
  transferId,
  status,
  timestamp: new Date().toISOString(),
});
```

### 3.2 Error Handling

```typescript
interface TransferError extends Error {
  code: "INSUFFICIENT_FUNDS" | "INVALID_RECIPIENT" | "NETWORK_ERROR";
  details?: {
    requiredAmount?: number;
    availableBalance?: number;
    networkStatus?: string;
  };
}

// Error Boundary Implementation
class TransferErrorBoundary extends React.Component {
  // Implementation details...
}
```

### 3.3 Inline Chat Notifications

#### Message Types

```typescript
interface InlineTransferMessage extends BaseMessage {
  type: "transfer";
  transferData: {
    amount: number;
    status: TransferStatus;
    direction: "send" | "receive";
    networkType: "lightning" | "onchain";
    timestamp: string;
  };
  displayConfig: {
    showAmount: boolean;
    showStatus: boolean;
    expandable: boolean;
  };
}

interface InlineRequestMessage extends BaseMessage {
  type: "request";
  requestData: {
    amount: number;
    status: "pending" | "fulfilled" | "declined" | "expired";
    expiresAt: string;
    note?: string;
  };
  actions: {
    canPay: boolean;
    canDecline: boolean;
    canCancel: boolean;
  };
}
```

#### UI Components

```typescript
interface TransferNotificationProps {
  message: InlineTransferMessage;
  onExpand?: () => void;
  onRetry?: () => void;
}

interface RequestNotificationProps {
  message: InlineRequestMessage;
  onPay: () => void;
  onDecline: () => void;
  onCancel: () => void;
}
```

#### Notification States

1. **Send Transaction**

   ```typescript
   const sendStates = {
     pending: {
       icon: "⏳",
       color: "text-yellow-500",
       text: "Sending {amount} sats...",
       action: "retry",
     },
     completed: {
       icon: "✅",
       color: "text-green-500",
       text: "Sent {amount} sats",
       expandable: true,
     },
     failed: {
       icon: "❌",
       color: "text-red-500",
       text: "Failed to send {amount} sats",
       action: "retry",
     },
   };
   ```

2. **Request Transaction**
   ```typescript
   const requestStates = {
     pending: {
       icon: "🔔",
       color: "text-blue-500",
       text: "Requested {amount} sats",
       actions: ["pay", "decline"],
     },
     fulfilled: {
       icon: "✅",
       color: "text-green-500",
       text: "Request fulfilled",
       expandable: true,
     },
     declined: {
       icon: "❌",
       color: "text-gray-500",
       text: "Request declined",
     },
     expired: {
       icon: "⏰",
       color: "text-gray-500",
       text: "Request expired",
     },
   };
   ```

#### Notification Styling

```typescript
const notificationStyles = {
  container: "flex items-center p-2 rounded-lg my-1",
  icon: "mr-2 text-lg",
  content: "flex-1",
  amount: "font-medium",
  status: "text-sm opacity-75",
  actions: "flex gap-2 mt-1",
  button: "px-3 py-1 rounded-md text-sm",
  expandButton: "text-blue-500 hover:text-blue-600",
};
```

#### Integration Example

```typescript
function TransferNotification({ message }: TransferNotificationProps) {
  const { transferData, displayConfig } = message;
  const state = transferData.direction === "send" ? sendStates[transferData.status] : receiveStates[transferData.status];

  return (
    <div className={`${notificationStyles.container} ${state.color}`}>
      <span className={notificationStyles.icon}>{state.icon}</span>
      <div className={notificationStyles.content}>
        <div className={notificationStyles.amount}>
          {state.text.replace("{amount}", transferData.amount.toString())}
        </div>
        {displayConfig.showStatus && (
          <div className={notificationStyles.status}>
            {formatTimestamp(transferData.timestamp)}
          </div>
        )}
        {state.action && (
          <div className={notificationStyles.actions}>
            <button
              className={`${notificationStyles.button} bg-primary-blue`}
              onClick={onRetry}
            >
              Retry
            </button>
          </div>
        )}
      </div>
      {displayConfig.expandable && (
        <button
          className={notificationStyles.expandButton}
          onClick={onExpand}
        >
          Details
        </button>
      )}
    </div>
  );
}
```

#### Animation States

```typescript
const notificationAnimations = {
  enter: "transition ease-out duration-200",
  enterFrom: "transform opacity-0 scale-95",
  enterTo: "transform opacity-100 scale-100",
  leave: "transition ease-in duration-150",
  leaveFrom: "transform opacity-100 scale-100",
  leaveTo: "transform opacity-0 scale-95",
};
```

#### Notification Behavior

1. **Display Rules**

   - Show inline with chat messages
   - Group related transactions
   - Collapse old transactions
   - Highlight pending states
   - Auto-update status

2. **Interaction Rules**

   - Expandable for transaction details
   - Quick actions for pending requests
   - Retry option for failed transactions
   - Copy transaction details
   - Share transaction receipt

3. **Update Handling**

   - Real-time status updates
   - Optimistic UI updates
   - Fallback states
   - Error recovery
   - Network reconnection

4. **Accessibility**
   - Screen reader support
   - Keyboard navigation
   - High contrast states
   - Focus management
   - ARIA attributes

## 4. UI/UX Requirements

### 4.1 Visual Design

- Primary blue color (#0066FF) for action buttons
- Glassy effect for modals
- Consistent typography
- Clear loading states
- Intuitive error messages

### 4.2 Responsive Behavior

- Mobile-first design
- Adaptive numpad
- Touch-friendly controls
- Landscape mode support

## 5. Testing Requirements

### 5.1 Unit Tests

- Amount validation
- Recipient validation
- Network selection
- Error handling

### 5.2 Integration Tests

- Transfer flow
- Message integration
- State management
- Error recovery

### 5.3 E2E Tests

- Complete transfer flow
- Edge cases
- Network conditions
- Error scenarios

## 6. Security Considerations

### 6.1 Validation

- Amount limits
- Recipient verification
- Network status
- Balance checks

### 6.2 Error Prevention

- Double-spend protection
- Transaction timeout
- Invalid amount prevention
- Network validation

## 7. Performance Requirements

- < 100ms amount validation
- < 2s transaction initiation
- < 5s end-to-end completion
- Optimistic UI updates

## 8. Dependencies

### 8.1 Internal

- Messages component
- User search
- Account management
- Wallet integration

### 8.2 External

- Lightning Network
- Bitcoin Core
- Nostr protocol
- Authentication service

## 9. Success Metrics

- Transaction success rate
- Average completion time
- Error rate
- User satisfaction

## 10. Future Enhancements

- Scheduled transfers
- Recurring payments
- Payment templates
- Multi-recipient support

## 11. Related Documentation

- See `messages-feature-requirements.md`
- See `messages-masterplan.md`
- See `messaging-flow.mermaid`

#### Payment Request Card Styling

```typescript
const paymentRequestCard = {
  container: "bg-gray-800 rounded-lg p-4 max-w-[280px]",
  header: {
    wrapper: "flex items-center gap-2 mb-3",
    icon: "text-primary-blue text-xl",
    text: "text-white text-lg font-medium",
  },
  amount: {
    btc: "text-white text-2xl font-bold mb-1",
    fiat: "text-gray-400 text-md mb-4",
  },
  button: "w-full bg-primary-blue text-white py-3 rounded-lg font-medium",
  timestamp: "text-gray-500 text-sm mt-2",
};

// Implementation example
function PaymentRequestCard({ amount, fiatAmount, timestamp }: PaymentRequestProps) {
  return (
    <div className={paymentRequestCard.container}>
      <div className={paymentRequestCard.header.wrapper}>
        <span className={paymentRequestCard.header.icon}>⚡</span>
        <span className={paymentRequestCard.header.text}>Payment Request</span>
      </div>
      <div className={paymentRequestCard.amount.btc}>{amount} BTC</div>
      <div className={paymentRequestCard.amount.fiat}>≈ ${fiatAmount}</div>
      <button className={paymentRequestCard.button}>Pay Now</button>
      <div className={paymentRequestCard.timestamp}>{timestamp}</div>
    </div>
  );
}
```

#### Inline Transaction Notifications

```typescript
const inlineNotificationStyles = {
  container: {
    base: "rounded-lg p-3 my-1 max-w-[280px]",
    sent: "bg-primary-blue text-white ml-auto",
    received: "bg-gray-800 text-white",
  },
  header: {
    wrapper: "flex items-center gap-2 mb-1",
    label: "text-sm font-medium opacity-90",
  },
  content: {
    amount: "text-base font-bold",
    recipient: "text-sm opacity-80",
  },
  timestamp: "text-xs opacity-70 mt-1",
};

// Updated notification states to match UI
const transactionStates = {
  sent: {
    label: "You sent",
    containerStyle: inlineNotificationStyles.container.sent,
  },
  received: {
    label: "Received",
    containerStyle: inlineNotificationStyles.container.received,
  },
};

// Implementation example
function InlineTransactionNotification({
  type,
  amount,
  timestamp,
  sender,
}: InlineTransactionProps) {
  const state = transactionStates[type];

  return (
    <div className={`${inlineNotificationStyles.container.base} ${state.containerStyle}`}>
      <div className={inlineNotificationStyles.header.wrapper}>
        <span className={inlineNotificationStyles.header.label}>
          {state.label}
        </span>
      </div>
      <div className={inlineNotificationStyles.content.amount}>
        {amount} BTC
      </div>
      {type === 'received' && (
        <div className={inlineNotificationStyles.content.recipient}>
          from {sender}
        </div>
      )}
      <div className={inlineNotificationStyles.timestamp}>
        {timestamp}
      </div>
    </div>
  );
}
```

#### Action Bar Styling

```typescript
const actionBarStyles = {
  container: "flex items-center gap-3 p-4 border-t border-gray-800 bg-black",
  button: {
    base: "flex items-center gap-2 px-4 py-2 rounded-lg font-medium",
    primary: "bg-primary-blue text-white",
    secondary: "bg-gray-800 text-white",
  },
  icon: "text-xl",
  label: "text-sm",
};

// Implementation example
function ActionBar() {
  return (
    <div className={actionBarStyles.container}>
      <button className={`${actionBarStyles.button.base} ${actionBarStyles.button.primary}`}>
        <span className={actionBarStyles.icon}>📤</span>
        <span className={actionBarStyles.label}>Send</span>
      </button>
      <button className={`${actionBarStyles.button.base} ${actionBarStyles.button.secondary}`}>
        <span className={actionBarStyles.icon}>📥</span>
        <span className={actionBarStyles.label}>Request</span>
      </button>
      <button className={`${actionBarStyles.button.base} ${actionBarStyles.button.secondary}`}>
        <span className={actionBarStyles.icon}>🔄</span>
        <span className={actionBarStyles.label}>Split</span>
      </button>
    </div>
  );
}
```

### Updated Display Rules

1. **Message Layout**

   - Payment requests appear as distinct cards with dark background
   - Transaction notifications align right (sent) or left (received)
   - Consistent spacing between messages (my-1)
   - Max width of 280px for payment cards and notifications

2. **Typography Hierarchy**

   - BTC amounts: Large, bold (text-2xl font-bold)
   - Fiat amounts: Medium, gray (text-md text-gray-400)
   - Labels: Medium weight (font-medium)
   - Timestamps: Small, low opacity (text-sm opacity-70)

3. **Color System**

   - Primary actions: #0066FF (primary-blue)
   - Background cards: Dark gray (gray-800)
   - Text: White with varying opacity
   - Status indicators: Blue for pending, green for success

4. **Interactive Elements**
   - Full-width "Pay Now" buttons
   - Floating action bar at bottom
   - Quick action buttons with icons
   - Clear touch targets (min 44px)
