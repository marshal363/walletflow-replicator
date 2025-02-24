# Notification System Improvements Feature Document

## Overview

This document outlines the improvements made to the notification system, specifically focusing on payment-related notifications and their icon display. The changes ensure proper bi-directional notification delivery and correct icon mapping for different notification types.

## Goals

1. Fix icon display issues for payment-related notifications
2. Ensure consistent notification types across the system
3. Improve bi-directional notification handling
4. Enhance debugging capabilities
5. Maintain type safety throughout the notification system

## Technical Implementation

### Schema Updates

The notification types have been standardized across the system to use the following types:

```typescript
type NotificationType =
  | "payment_sent"
  | "payment_received"
  | "payment_request"
  | "system";
```

### Icon Mapping

The notification icons have been updated to correctly map to each notification type:

```typescript
const ICON_MAP: Record<NotificationType, JSX.Element> = {
  payment_sent: <ArrowUpRight className="h-5 w-5 text-white" />,
  payment_received: <ArrowDownRight className="h-5 w-5 text-white" />,
  payment_request: <Clock className="h-5 w-5 text-white" />,
  system: <Star className="h-5 w-5 text-white" />
};
```

### Notification Creation

Notifications are now created with proper type assignments in the transfer process:

```typescript
// Sender notification
{
  type: "payment_sent",
  title: "Payment Sent",
  metadata: {
    role: "sender",
    visibility: "sender_only"
  }
}

// Recipient notification
{
  type: "payment_received",
  title: "Payment Received",
  metadata: {
    role: "recipient",
    visibility: "recipient_only"
  }
}
```

### Debug Logging

Comprehensive debug logging has been added throughout the system:

1. NotificationIcons Component:

```typescript
debug.log("Icon map initialized", {
  availableTypes: Object.keys(ICON_MAP),
  iconCount: Object.keys(ICON_MAP).length,
});
```

2. NotificationCard Component:

```typescript
debug.log("Rendering notification", {
  type,
  hasIcon: !!ICON_MAP[type],
  availableIcons: Object.keys(ICON_MAP),
  notificationData: notification,
});
```

3. Transfer Process:

```typescript
debug.log("Transfer notification created", {
  type: "payment_sent",
  userId: sourceUser._id,
  timestamp: new Date().toISOString(),
});
```

## Bi-directional Notification Types

### Payment Flow Notifications (Bi-directional)

1. **Direct Payment**

   ```typescript
   // Sender's Notification
   {
     type: "payment_sent",
     title: "Payment Sent",
     metadata: {
       role: "sender",
       visibility: "sender_only",
       counterpartyId: recipientId,
       paymentData: {
         amount: number,
         currency: "BTC",
         type: "lightning",
         status: "completed"
       }
     }
   }

   // Recipient's Notification
   {
     type: "payment_received",
     title: "Payment Received",
     metadata: {
       role: "recipient",
       visibility: "recipient_only",
       counterpartyId: senderId,
       parentNotificationId: senderNotificationId,
       paymentData: {
         amount: number,
         currency: "BTC",
         type: "lightning",
         status: "completed"
       }
     }
   }
   ```

2. **Payment Request Flow**

   ```typescript
   // Requester's Notifications
   {
     initial: {
       type: "payment_request",
       title: "Payment Request Sent",
       status: "pending",
       metadata: {
         role: "sender",
         visibility: "sender_only",
         actionRequired: false
       }
     },
     onApproval: {
       type: "payment_request",
       title: "Payment Request Approved",
       status: "approved",
       metadata: {
         role: "sender",
         visibility: "sender_only"
       }
     },
     onDecline: {
       type: "payment_request",
       title: "Payment Request Declined",
       status: "declined",
       metadata: {
         role: "sender",
         visibility: "sender_only"
       }
     }
   }

   // Recipient's Notifications
   {
     initial: {
       type: "payment_request",
       title: "New Payment Request",
       status: "pending",
       metadata: {
         role: "recipient",
         visibility: "recipient_only",
         actionRequired: true,
         parentNotificationId: requesterNotificationId
       }
     },
     onPayment: {
       type: "payment_sent",
       title: "Payment Sent",
       status: "completed",
       metadata: {
         role: "sender",
         visibility: "sender_only"
       }
     }
   }
   ```

### Payment Request Cancellation/Decline Flow

1. **Payment Request Cancellation**

   ```typescript
   // When requester cancels the request
   {
     // Requester's Notification Update
     requester: {
       type: "payment_request",
       title: "Payment Request Cancelled",
       status: "cancelled",
       metadata: {
         role: "sender",
         visibility: "sender_only",
         gradient: "from-[#1d1d1d] to-[#2d2d2d]",
         actionRequired: false,
         dismissible: true
       }
     },

     // Recipient's Notification Update
     recipient: {
       type: "payment_request",
       title: "Payment Request Cancelled",
       status: "cancelled",
       metadata: {
         role: "recipient",
         visibility: "recipient_only",
         gradient: "from-[#1d1d1d] to-[#2d2d2d]",
         actionRequired: false,
         dismissible: true,
         parentNotificationId: requesterNotificationId
       }
     }
   }
   ```

   Visual Structure (Cancelled):

   ```
   ┌────────────────────────────────────────┐
   │ ╭─────╮                          1m ago│
   │ │ 🕒  │ Payment Request Cancelled      │
   │ ╰─────╯ 1,000 sats request cancelled   │
   │                                        │
   │ [Cancelled]                            │
   └────────────────────────────────────────┘
   ```

2. **Payment Request Decline**

   ```typescript
   // When recipient declines the request
   {
     // Recipient's Action Notification
     recipient: {
       type: "payment_request",
       title: "Payment Request Declined",
       status: "declined",
       metadata: {
         role: "recipient",
         visibility: "recipient_only",
         gradient: "from-[#2b1d1d] to-[#472d2d]",
         actionRequired: false,
         dismissible: true,
         parentNotificationId: requesterNotificationId,
         declineReason: string | undefined
       }
     },

     // Requester's Update Notification
     requester: {
       type: "payment_request",
       title: "Payment Request Declined",
       status: "declined",
       metadata: {
         role: "sender",
         visibility: "sender_only",
         gradient: "from-[#2b1d1d] to-[#472d2d]",
         actionRequired: false,
         dismissible: true,
         declineReason: string | undefined
       }
     }
   }
   ```

   Visual Structure (Declined):

   ```
   ┌────────────────────────────────────────┐
   │ ╭─────╮                          1m ago│
   │ │ 🕒  │ Payment Request Declined       │
   │ ╰─────╯ 1,000 sats request declined    │
   │         Reason: Incorrect amount       │
   │ [Declined]                             │
   └────────────────────────────────────────┘
   ```

3. **State Transition Flow**

   ```typescript
   const paymentRequestTransitionFlow = {
     // Cancellation Flow
     onCancel: {
       from: "pending",
       to: "cancelled",
       trigger: "requester_action",
       updates: ["status", "title", "gradient"],
       notifications: ["requester", "recipient"],
     },

     // Decline Flow
     onDecline: {
       from: "pending",
       to: "declined",
       trigger: "recipient_action",
       updates: ["status", "title", "gradient"],
       notifications: ["requester", "recipient"],
       additionalData: {
         declineReason: string | undefined,
       },
     },

     // Auto-dismiss Configuration
     autoDismiss: {
       cancelled: {
         delay: 5000, // 5 seconds
         action: "archive",
       },
       declined: {
         delay: 5000, // 5 seconds
         action: "archive",
       },
     },
   };
   ```

4. **Status Badge Styles**

   ```typescript
   const cancelledDeclinedStyles = {
     cancelled: {
       badge: {
         background: "bg-[#1d1d1d] border-[#2d2d2d]",
         text: "text-gray-400",
       },
       gradient: "from-[#1d1d1d] to-[#2d2d2d]",
     },
     declined: {
       badge: {
         background: "bg-[#2b1d1d] border-[#472d2d]",
         text: "text-red-400",
       },
       gradient: "from-[#2b1d1d] to-[#472d2d]",
     },
   };
   ```

5. **Reason Handling**

   ```typescript
   interface DeclineReason {
     type: "incorrect_amount" | "wrong_recipient" | "duplicate" | "other";
     message?: string;
     timestamp: string;
     actorId: Id<"users">;
   }

   const formatDeclineReason = (reason: DeclineReason): string => {
     const reasons = {
       incorrect_amount: "Incorrect amount",
       wrong_recipient: "Wrong recipient",
       duplicate: "Duplicate request",
       other: reason.message || "No reason provided",
     };
     return reasons[reason.type];
   };
   ```

### Single-Direction Notifications

1. **System Notifications**
   ```typescript
   {
     type: "system",
     title: "System Update",
     metadata: {
       visibility: "recipient_only",
       actionRequired: false,
       dismissible: true
     },
     variants: [
       {
         title: "Security Alert",
         priority: { base: "high", modifiers: { actionRequired: true } }
       },
       {
         title: "Feature Update",
         priority: { base: "low", modifiers: { actionRequired: false } }
       },
       {
         title: "Maintenance Notice",
         priority: { base: "medium", modifiers: { timeConstraint: true } }
       }
     ]
   }
   ```

### Notification State Transitions

1. **Payment Flow States**

   ```typescript
   const paymentFlowStates = {
     sender: {
       initial: "pending",
       success: "completed",
       failure: "failed",
     },
     recipient: {
       initial: "pending",
       success: "completed",
       failure: "cancelled",
     },
   };
   ```

2. **Payment Request States**
   ```typescript
   const paymentRequestStates = {
     requester: {
       initial: "pending",
       approved: "approved",
       declined: "declined",
       expired: "expired",
       cancelled: "cancelled",
     },
     recipient: {
       initial: "pending",
       actioned: "completed",
       declined: "declined",
       expired: "expired",
     },
   };
   ```

### Notification Priority Calculation

```typescript
interface PriorityModifiers {
  role: "sender" | "recipient";
  actionRequired: boolean;
  timeConstraint: boolean;
  amount: number;
}

const calculatePriority = (
  base: "high" | "medium" | "low",
  modifiers: PriorityModifiers
): number => {
  const basePriority = {
    high: 70,
    medium: 40,
    low: 10,
  }[base];

  return Math.min(
    100,
    basePriority +
      (modifiers.actionRequired ? 20 : 0) +
      (modifiers.timeConstraint ? 15 : 0) +
      (modifiers.amount > 100000 ? 10 : 0) +
      (modifiers.role === "recipient" ? 5 : 0)
  );
};
```

### Bi-directional Notification Rules

1. **Linking Rules**

   ```typescript
   interface NotificationLink {
     sourceId: Id<"notifications">;
     targetId: Id<"notifications">;
     relationship: "parent_child" | "counterpart";
     syncFields: Array<"status" | "metadata">;
   }
   ```

2. **Visibility Rules**

   ```typescript
   const visibilityRules = {
     sender_only: ["payment_sent", "payment_request_sent"],
     recipient_only: ["payment_received", "payment_request_received"],
     both: ["system"],
   };
   ```

3. **Action Requirements**
   ```typescript
   const actionRequirements = {
     payment_request: {
       recipient: true, // Recipient must take action
       sender: false, // Sender just waits
     },
     payment_sent: {
       recipient: false, // Recipient just receives
       sender: false, // Sender just waits for confirmation
     },
     system: {
       recipient: true, // May require action
       sender: false, // No sender
     },
   };
   ```

## Component Updates

### NotificationCard

The NotificationCard component has been updated to:

1. Use correct icon mapping
2. Handle all notification types
3. Display appropriate status indicators
4. Format descriptions consistently

### SuggestedActionsWidget

The widget now:

1. Properly handles all notification types
2. Includes debug logging
3. Maintains type safety
4. Handles bi-directional notifications

## Notification Card Layouts

### Common Layout Structure

All notification cards share these base characteristics:

```typescript
const baseStyles = {
  container:
    "relative h-[100px] overflow-hidden rounded-xl cursor-pointer group",
  overlay: "absolute inset-0 bg-black/10",
  content: "relative h-full p-3 flex flex-col justify-between",
  iconContainer: "flex-shrink-0 w-10 h-10 p-2 rounded-xl bg-white/10",
  title: "font-medium text-white text-base mb-0.5",
  description: "text-sm text-white/80 line-clamp-1",
  footer: "flex items-center justify-between",
  timestamp: "text-xs text-white/60",
};
```

### Payment Sent Notification

```typescript
{
  type: "payment_sent",
  layout: {
    gradient: "from-[#1a2b1d] to-[#2d4731]",
    icon: <ArrowUpRight className="h-5 w-5 text-white" />,
    statusBadge: {
      background: "bg-[#1a2b1d] border-[#2d4731]",
      text: "text-emerald-400"
    },
    description: {
      format: "${amount} sats → @${recipientName}",
      username: "font-['Ubuntu'] font-bold italic"
    }
  }
}
```

Visual Structure:

```
┌────────────────────────────────────────┐
│ ╭─────╮                          3m ago│
│ │ ↗   │ Payment Sent                   │
│ ╰─────╯ 1,000 sats → @alice           │
│                                        │
│ [Completed]                            │
└────────────────────────────────────────┘
```

### Payment Received Notification

```typescript
{
  type: "payment_received",
  layout: {
    gradient: "from-[#1a2b1d] to-[#2d4731]",
    icon: <ArrowDownRight className="h-5 w-5 text-white" />,
    statusBadge: {
      background: "bg-[#1a2b1d] border-[#2d4731]",
      text: "text-emerald-400"
    },
    description: {
      format: "${amount} sats ← @${senderName}",
      username: "font-['Ubuntu'] font-bold italic"
    }
  }
}
```

Visual Structure:

```
┌────────────────────────────────────────┐
│ ╭─────╮                          2m ago│
│ │ ↙   │ Payment Received               │
│ ╰─────╯ 1,000 sats ← @bob             │
│                                        │
│ [Completed]                            │
└────────────────────────────────────────┘
```

### Payment Request Notification

```typescript
{
  type: "payment_request",
  layout: {
    gradient: "from-[#1d2333] to-[#252a3d]",
    icon: <Clock className="h-5 w-5 text-white" />,
    statusBadge: {
      background: "bg-[#1d2333] border-[#2d3548]",
      text: "text-blue-400"
    },
    description: {
      format: "${amount} sats requested by @${requesterName}",
      username: "font-['Ubuntu'] font-bold italic"
    },
    actionIndicator: {
      show: true,
      style: "flex items-center gap-1",
      dot: "w-1 h-1 rounded-full bg-yellow-400 animate-pulse",
      text: "text-xs text-yellow-200"
    }
  }
}
```

Visual Structure:

```
┌────────────────────────────────────────┐
│ ╭─────╮                          1m ago│
│ │ 🕒  │ Payment Request                │
│ ╰─────╯ 1,000 sats requested by @carol │
│                                        │
│ [Pending] ● Action needed              │
└────────────────────────────────────────┘
```

### System Notification

```typescript
{
  type: "system",
  layout: {
    gradient: "from-[#1d1d1d] to-[#2d2d2d]",
    icon: <Star className="h-5 w-5 text-white" />,
    statusBadge: {
      background: "bg-[#1d1d1d] border-[#2d2d2d]",
      text: "text-gray-400"
    },
    description: {
      format: "${message}",
      style: "text-sm text-white/80"
    }
  }
}
```

Visual Structure:

```
┌────────────────────────────────────────┐
│ ╭─────╮                          5m ago│
│ │ ★   │ System Update                  │
│ ╰─────╯ New features available         │
│                                        │
│ [Active]                               │
└────────────────────────────────────────┘
```

### Status Indicators

```typescript
const STATUS_COLORS: Record<NotificationStatus, string> = {
  pending: "from-[#1d2333] to-[#252a3d]",
  completed: "from-[#1a2b1d] to-[#2d4731]",
  cancelled: "from-[#1d1d1d] to-[#2d2d2d]",
  declined: "from-[#2b1d1d] to-[#472d2d]",
  approved: "from-[#1a2b1d] to-[#2d4731]",
  expired: "from-[#2b1d1d] to-[#472d2d]",
};

const STATUS_BADGES: Record<NotificationStatus, { bg: string; text: string }> =
  {
    pending: { bg: "bg-[#1d2333] border-[#2d3548]", text: "text-blue-400" },
    completed: {
      bg: "bg-[#1a2b1d] border-[#2d4731]",
      text: "text-emerald-400",
    },
    cancelled: { bg: "bg-[#1d1d1d] border-[#2d2d2d]", text: "text-gray-400" },
    declined: { bg: "bg-[#2b1d1d] border-[#472d2d]", text: "text-red-400" },
    approved: { bg: "bg-[#1a2b1d] border-[#2d4731]", text: "text-emerald-400" },
    expired: { bg: "bg-[#2b1d1d] border-[#472d2d]", text: "text-red-400" },
  };
```

### Interactive Elements

1. **Dismiss Button** (when `metadata.dismissible` is true):

```typescript
const dismissButton = {
  position: "absolute top-2 right-2",
  style: "p-1.5 rounded-full hover:bg-black/30 transition-colors z-10",
  icon: <XIcon className="h-3.5 w-3.5 text-white/90" />
};
```

2. **Action Indicator** (when `priority.modifiers.actionRequired` is true):

```typescript
const actionIndicator = {
  container: "flex items-center gap-1",
  dot: "w-1 h-1 rounded-full bg-yellow-400 animate-pulse",
  label: "text-xs text-yellow-200",
};
```

3. **Hover State**:

```typescript
const hoverEffect = {
  scale: "hover:scale-[1.02]",
  transition: "transition-all",
};
```

### Animation States

```typescript
const animationStates = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: {
    duration: 0.2,
    ease: "easeInOut",
  },
};
```

## Type Definitions

### NotificationData Interface

```typescript
interface NotificationData {
  _id: Id<"notifications">;
  type: NotificationType;
  title: string;
  description: string;
  status: "active" | "dismissed" | "actioned" | "expired";
  metadata: NotificationMetadata;
  priority: {
    base: "high" | "medium" | "low";
    modifiers: {
      actionRequired: boolean;
      timeConstraint: boolean;
      amount: number;
      role: "sender" | "recipient";
    };
    calculatedPriority: number;
  };
  displayLocation: "suggested_actions" | "toast" | "both";
}
```

### NotificationMetadata Interface

```typescript
interface NotificationMetadata {
  gradient: string;
  dismissible: boolean;
  actionRequired: boolean;
  expiresAt?: string;
  role?: "sender" | "recipient";
  visibility: "sender_only" | "recipient_only" | "both";
  counterpartyId?: Id<"users">;
  parentNotificationId?: Id<"notifications">;
  paymentData?: {
    amount: number;
    currency: string;
    type: "lightning" | "onchain";
    status: "pending" | "completed" | "failed";
  };
}
```

## Testing Requirements

1. **Unit Tests**

   - Icon mapping for all notification types
   - Notification type handling
   - Status display logic
   - Description formatting

2. **Integration Tests**

   - Bi-directional notification creation
   - Transfer flow notifications
   - Payment request notifications
   - System notifications

3. **End-to-End Tests**
   - Complete payment flows
   - Notification display in UI
   - Icon rendering
   - Status updates

## Success Metrics

1. **Icon Display**

   - All payment-related notifications show correct icons
   - No fallback to default icons
   - Consistent icon sizing and colors

2. **Type Safety**

   - No type errors in notification handling
   - Consistent type usage across components
   - Proper type inference in debug logs

3. **User Experience**
   - Clear distinction between notification types
   - Accurate status display
   - Proper bi-directional notification delivery

## Future Improvements

1. **Enhanced Animation**

   - Add subtle animations for status changes
   - Improve transition effects
   - Add loading states

2. **Advanced Filtering**

   - Filter by notification type
   - Custom sorting options
   - Group similar notifications

3. **Rich Media Support**
   - Add support for images
   - Enhanced formatting options
   - Custom notification templates

## Migration Notes

1. The old "transaction" notification type has been removed
2. Existing notifications should be migrated to new types
3. Debug logging should be monitored during initial rollout
4. Type definitions should be kept in sync across all components

## Security Considerations

1. **Data Protection**

   - Notification visibility is strictly controlled
   - User data is properly sanitized
   - Sensitive information is handled appropriately

2. **Access Control**
   - Notifications are only visible to intended recipients
   - Actions are properly authenticated
   - Role-based access is enforced

## Performance Considerations

1. **Optimization**

   - Icon components are properly memoized
   - Debug logging is conditional
   - Type checking is efficient

2. **Memory Management**
   - Notification cleanup is automated
   - Old notifications are archived
   - Resources are properly released

## Documentation Updates

1. **Code Comments**

   - All new components are documented
   - Type definitions include JSDoc
   - Debug logging is explained

2. **Developer Guide**
   - Updated notification type usage
   - Debug logging guidelines
   - Testing procedures

## Rollout Plan

1. **Phase 1: Type Updates**

   - Update notification types
   - Migrate existing notifications
   - Update schema

2. **Phase 2: Icon Fixes**

   - Implement new icon mapping
   - Add debug logging
   - Test icon display

3. **Phase 3: Monitoring**
   - Monitor debug logs
   - Track type errors
   - Gather user feedback
