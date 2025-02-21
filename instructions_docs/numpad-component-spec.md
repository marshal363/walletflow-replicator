# NumPad Component Specification

## 1. Overview

The NumPad component provides a consistent interface for amount input across the application, specifically optimized for Bitcoin/fiat amount entry with real-time currency conversion.

## 2. Visual Design

### 2.1 Layout

```
┌────────────────────────────┐
│        Amount Display      │
├────────────────────────────┤
│   ┌────┐  ┌────┐  ┌────┐  │
│   │ 1  │  │ 2  │  │ 3  │  │
│   └────┘  └────┘  └────┘  │
│   ┌────┐  ┌────┐  ┌────┐  │
│   │ 4  │  │ 5  │  │ 6  │  │
│   └────┘  └────┘  └────┘  │
│   ┌────┐  ┌────┐  ┌────┐  │
│   │ 7  │  │ 8  │  │ 9  │  │
│   └────┘  └────┘  └────┘  │
│   ┌────┐  ┌────┐  ┌────┐  │
│   │ .  │  │ 0  │  │ ←  │  │
│   └────┘  └────┘  └────┘  │
└────────────────────────────┘
```

### 2.2 Components

1. **Amount Display**

   - Primary amount (large font)
   - Secondary amount (smaller font, conversion)
   - Currency indicators (SATS/USD)

2. **Number Buttons**

   - Size: 48x48px (mobile), 64x64px (desktop)
   - Background: zinc-800
   - Hover state: zinc-700
   - Active state: zinc-600
   - Text: white, 24px, medium weight

3. **Action Buttons**
   - Decimal: Only enabled when in fiat mode
   - Delete: Icon with backspace symbol
   - Quick amount suggestions (optional)

## 3. Interactions

### 3.1 Basic Input

```typescript
interface NumPadProps {
  value: string;
  onChange: (value: string) => void;
  currency: "SATS" | "USD";
  maxLength?: number;
  maxValue?: number;
  showConversion?: boolean;
  quickAmounts?: number[];
}
```

### 3.2 Input Rules

1. **SATS Mode**

   - No decimal point allowed
   - Maximum 10 digits
   - Minimum value: 1
   - Leading zeros removed

2. **USD Mode**
   - Maximum 2 decimal places
   - Maximum 7 digits before decimal
   - Leading zeros handled appropriately
   - Decimal button enabled

### 3.3 Validation

```typescript
interface ValidationRules {
  maxAmount: {
    SATS: 100000000; // 1 BTC
    USD: 1000000; // $1M
  };
  minAmount: {
    SATS: 1;
    USD: 0.01;
  };
  decimals: {
    SATS: 0;
    USD: 2;
  };
}
```

## 4. Animation States

### 4.1 Button Feedback

```typescript
const buttonStates = {
  default: {
    scale: 1,
    background: "bg-zinc-800",
  },
  hover: {
    scale: 1.02,
    background: "bg-zinc-700",
  },
  active: {
    scale: 0.98,
    background: "bg-zinc-600",
  },
  disabled: {
    opacity: 0.5,
    background: "bg-zinc-800",
  },
};
```

### 4.2 Amount Changes

```typescript
const amountAnimations = {
  update: {
    type: "spring",
    duration: 0.3,
    scale: [1, 1.02, 1],
  },
  currency: {
    type: "crossfade",
    duration: 0.2,
  },
};
```

## 5. Implementation

### 5.1 Core Component

```typescript
export const NumPad: React.FC<NumPadProps> = ({
  value,
  onChange,
  currency,
  maxLength = 10,
  maxValue,
  showConversion = true,
  quickAmounts,
}) => {
  // Implementation details...
};
```

### 5.2 Usage Example

```typescript
const RequestAmount = () => {
  const [amount, setAmount] = useState("0");
  const [currency, setCurrency] = useState<"SATS" | "USD">("SATS");

  return (
    <NumPad
      value={amount}
      onChange={setAmount}
      currency={currency}
      showConversion
      quickAmounts={[1000, 5000, 10000, 50000]}
    />
  );
};
```

## 6. Error Handling

```typescript
interface NumPadError {
  type: "MAX_AMOUNT" | "MIN_AMOUNT" | "INVALID_FORMAT";
  message: string;
  value: string;
  limit?: number;
}

const handleError = (error: NumPadError) => {
  switch (error.type) {
    case "MAX_AMOUNT":
      // Vibrate device
      // Show error tooltip
      // Reset to max value
      break;
    case "MIN_AMOUNT":
      // Show minimum amount warning
      break;
    case "INVALID_FORMAT":
      // Prevent invalid input
      break;
  }
};
```

## 7. Accessibility

- ARIA labels for all buttons
- Keyboard navigation support
- Screen reader descriptions
- High contrast support
- Touch target sizes
- Haptic feedback support

## 8. Testing Scenarios

1. **Input Validation**

   - Maximum amount limits
   - Minimum amount limits
   - Decimal point handling
   - Currency switching
   - Leading zeros

2. **User Interactions**

   - Touch input
   - Keyboard input
   - Quick amount selection
   - Currency toggle
   - Error states

3. **Edge Cases**
   - Rapid input
   - Multiple decimal attempts
   - Delete at zero
   - Maximum length
   - Invalid characters

## 9. Integration Points

```typescript
// Parent component integration
interface NumPadIntegration {
  // Amount updates
  onAmountChange: (amount: string) => void;
  onCurrencyToggle: (currency: "SATS" | "USD") => void;

  // Validation
  onMaxAmount: () => void;
  onMinAmount: () => void;

  // Navigation
  onConfirm: () => void;
  onCancel: () => void;
}
```
