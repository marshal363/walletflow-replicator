# Suggested Actions Notifications Specification

## Overview

The Suggested Actions Notifications feature enhances the user experience by displaying important notifications and actionable items in a dedicated carousel within the Suggested Actions area. The system supports bi-directional notifications, ensuring that all parties involved in an action receive appropriate, contextual notifications simultaneously.

## Goals

1. Improve visibility of important notifications
2. Provide persistent access to critical actions
3. Reduce notification fatigue
4. Maintain context for payment-related actions
5. Enable quick response to time-sensitive requests
6. Ensure bi-directional notification delivery
7. Maintain action context for all involved parties

## User Experience

### Display Location

- Notifications appear in the Suggested Actions carousel at the top of the chat interface
- Multiple notifications can be viewed by scrolling horizontally
- Notifications maintain visibility based on their lifecycle rules
- Maximum of 3-5 critical notifications and 5-7 history notifications displayed

### Notification Lifecycle

1. **Action-Required Notifications**

   - Persist until explicitly acted upon
   - High visibility in Suggested Actions area
   - Cannot be dismissed without action

2. **Completed Action Notifications**

   - Auto-dismiss after 5 seconds
   - Move to history if significant
   - Can be manually dismissed

3. **Quick-lived Notifications**

   - Match toast duration (3-5 seconds)
   - Auto-dismiss without user interaction
   - Lower priority in queue

4. **Critical Notifications**
   - Persist until explicitly dismissed
   - Maintain position in critical queue
   - May require acknowledgment

### Notification Types

#### Transaction Notifications

```typescript
interface TransactionNotification extends Action {
  id: string;
  type: "transaction";
  title: string;
  description: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  timestamp: string;
  gradient: string;
  action: () => void;
  metadata: {
    txId: string;
    counterpartyId: Id<"users">;
    counterpartyName: string;
    networkType: "lightning" | "onchain";
    role: "sender" | "recipient";
    visibility: "sender_only" | "recipient_only" | "both";
    parentNotificationId?: Id<"notifications">;
  };
}
```

#### Payment Request Notifications

```typescript
interface PaymentRequestNotification extends Action {
  id: string;
  type: "payment_request";
  title: string;
  description: string;
  amount: number;
  status: "pending" | "approved" | "declined" | "expired";
  expiresAt: string;
  gradient: string;
  action: () => void;
  metadata: {
    requestId: string;
    counterpartyId: Id<"users">;
    counterpartyName: string;
    note?: string;
    role: "requester" | "recipient";
    visibility: "sender_only" | "recipient_only" | "both";
    parentNotificationId?: Id<"notifications">;
  };
}
```

#### Security Notifications

```typescript
interface SecurityNotification extends Action {
  id: string;
  type: "security";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  gradient: string;
  action: () => void;
  metadata?: {
    category: "backup" | "update" | "warning";
    recommendedAction?: string;
  };
}
```

### Priority System

```typescript
interface NotificationPriority {
  base: "high" | "medium" | "low";
  modifiers: {
    actionRequired: boolean;
    timeConstraint: boolean;
    amount: number;
    role: "sender" | "recipient";
  };
  calculatedPriority: number; // 0-100, calculated based on modifiers
}

const calculatePriority = (notification: Notification): number => {
  const basePriority = {
    high: 70,
    medium: 40,
    low: 10,
  }[notification.priority.base];

  const modifiers = {
    actionRequired: 20,
    timeConstraint: 15,
    largeAmount: 10,
    recipientRole: 5,
  };

  return Math.min(
    100,
    basePriority +
      (notification.modifiers.actionRequired ? modifiers.actionRequired : 0) +
      (notification.modifiers.timeConstraint ? modifiers.timeConstraint : 0) +
      (notification.modifiers.amount > 100000 ? modifiers.largeAmount : 0) +
      (notification.modifiers.role === "recipient"
        ? modifiers.recipientRole
        : 0)
  );
};
```

### Queue Management

```typescript
interface NotificationQueue {
  critical: {
    maxSize: 5;
    items: Notification[];
    priority: number; // Minimum priority for critical queue
  };
  history: {
    maxSize: 7;
    items: Notification[];
    retentionTime: number; // Time to keep in history
  };
}
```

### Animation System

#### Animation States

```typescript
interface NotificationAnimationState {
  // Entry animations
  entering: boolean;
  entered: boolean;
  // Exit animations
  exiting: boolean;
  exited: boolean;
  // Position transitions
  moving: boolean;
  // Queue transitions
  promoting: boolean; // Moving from history to critical
  demoting: boolean; // Moving from critical to history
  // Carousel-specific states
  scrolling: boolean; // During carousel scroll
  dragging: boolean; // During drag interaction
}

interface AnimationConfig {
  duration: {
    enter: number; // 300ms
    exit: number; // 200ms
    move: number; // 250ms
    promote: number; // 400ms
    demote: number; // 300ms
    scroll: number; // 150ms for smooth scroll transitions
  };
  easing: {
    enter: string; // "cubic-bezier(0.4, 0, 0.2, 1)"
    exit: string; // "cubic-bezier(0.4, 0, 1, 1)"
    move: string; // "cubic-bezier(0, 0, 0.2, 1)"
    promote: string; // "cubic-bezier(0.4, 0, 0.2, 1)"
    demote: string; // "cubic-bezier(0.4, 0, 0.2, 1)"
    scroll: string; // "cubic-bezier(0.4, 0, 0.2, 1)"
  };
}
```

#### Animation Variants

```typescript
const notificationAnimationVariants = {
  // Entry animations (from right)
  initial: {
    opacity: 0,
    x: 50, // Enter from right
    scale: 0.95,
  },
  enter: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },

  // Exit animations (to left)
  exit: {
    opacity: 0,
    scale: 0.95,
    x: -50, // Exit to left
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },

  // Position change animations (horizontal)
  move: {
    x: 0,
    transition: {
      duration: 0.25,
      ease: "easeInOut",
    },
  },

  // Queue transition animations (maintain horizontal position)
  promote: {
    scale: [1, 1.02, 1],
    y: [-10, 0], // Subtle vertical shift
    transition: {
      duration: 0.4,
      ease: "easeInOut",
    },
  },

  demote: {
    scale: [1, 0.98, 1],
    y: [0, 10], // Subtle vertical shift
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
};
```

#### Implementation Example

```typescript
// Using Framer Motion with Shadcn Carousel
const NotificationCarousel: React.FC<{
  notifications: Notification[];
  onDismiss: (id: string) => void;
}> = ({ notifications, onDismiss }) => {
  return (
    <Carousel className="w-full">
      <CarouselContent>
        <AnimatePresence mode="popLayout">
          {notifications.map((notification, index) => (
            <CarouselItem
              key={notification.id}
              className="basis-[85%] sm:basis-[45%] md:basis-[35%]"
            >
              <motion.div
                layout
                layoutId={notification.id}
                initial="initial"
                animate="enter"
                exit="exit"
                variants={notificationAnimationVariants}
                custom={index}
                className={`notification-item ${notification.gradient}`}
                drag="x" // Enable horizontal drag
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, info) => {
                  if (Math.abs(info.offset.x) > 100) {
                    onDismiss(notification.id);
                  }
                }}
              >
                {/* Notification content */}
              </motion.div>
            </CarouselItem>
          ))}
        </AnimatePresence>
      </CarouselContent>
    </Carousel>
  );
};
```

#### Carousel-Specific Animations

```typescript
const carouselConfig = {
  // Scroll behavior
  scroll: {
    behavior: "smooth",
    duration: 150,
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  },

  // Item sizing and spacing
  items: {
    spacing: 12, // Gap between items
    baseWidth: "85%", // Mobile default
    breakpoints: {
      sm: "45%", // Tablet
      md: "35%", // Desktop
    },
  },

  // Drag interactions
  drag: {
    elastic: 0.2,
    dragThreshold: 100, // Distance required for dismiss
    velocityThreshold: 500, // Speed required for dismiss
  },

  // Transition effects
  effects: {
    // Scale effect during scroll
    scale: {
      active: 1,
      inactive: 0.95,
      transition: {
        duration: 0.2,
      },
    },

    // Opacity during scroll
    opacity: {
      active: 1,
      inactive: 0.7,
      transition: {
        duration: 0.2,
      },
    },

    // Parallax effect during scroll
    parallax: {
      factor: 0.1,
      transition: {
        duration: 0.3,
      },
    },
  },
};

// Usage in component
const NotificationItem: React.FC<{
  notification: Notification;
  isActive: boolean;
}> = ({ notification, isActive }) => {
  return (
    <motion.div
      animate={{
        scale: isActive ? carouselConfig.effects.scale.active : carouselConfig.effects.scale.inactive,
        opacity: isActive ? carouselConfig.effects.opacity.active : carouselConfig.effects.opacity.inactive,
      }}
      transition={carouselConfig.effects.scale.transition}
      className={`notification-item ${notification.gradient}`}
    >
      {/* Notification content */}
    </motion.div>
  );
};
```

#### Gesture Handling

```typescript
const gestureConfig = {
  // Swipe to dismiss (horizontal)
  swipe: {
    threshold: 100, // Distance required for dismiss
    velocity: 500, // Speed required for dismiss
    elastic: 0.2, // Elastic bounce effect
    animation: {
      exit: {
        x: (direction: number) => direction * 200,
        opacity: 0,
        transition: {
          duration: 0.2,
        },
      },
      reset: {
        x: 0,
        opacity: 1,
        transition: {
          type: "spring",
          stiffness: 500,
          damping: 30,
        },
      },
    },
  },

  // Scroll momentum
  scroll: {
    momentum: true,
    momentumMultiplier: 0.8,
    velocityThreshold: 50,
    boundaryDamping: 0.8,
  },
};
```

### Notification Transitions

#### State Machine

```typescript
type NotificationState =
  | "created" // Initial state
  | "active" // Displayed in Suggested Actions
  | "actioned" // User took action
  | "dismissed" // Manually dismissed
  | "expired" // Time-based expiration
  | "archived"; // Moved to history

interface NotificationTransition {
  from: NotificationState;
  to: NotificationState;
  trigger: "user_action" | "system" | "time" | "manual";
  affectedParties: "sender" | "recipient" | "both";
}
```

#### Transition Rules

1. **Payment Request Flow**

   ```typescript
   const paymentRequestTransitions = {
     // Initial Creation
     created: {
       requester: {
         state: "active",
         notification: {
           title: "Payment Request Sent",
           priority: { base: "medium", modifiers: { actionRequired: false } },
         },
       },
       recipient: {
         state: "active",
         notification: {
           title: "New Payment Request",
           priority: { base: "high", modifiers: { actionRequired: true } },
         },
       },
     },

     // On Approval
     approved: {
       requester: {
         state: "actioned",
         notification: {
           title: "Payment Request Approved",
           duration: 5000, // Auto-dismiss after 5s
           gradient: "from-green-500 to-green-600",
         },
       },
       recipient: {
         state: "archived",
         previousNotification: "move_to_history",
       },
     },

     // On Decline
     declined: {
       requester: {
         state: "actioned",
         notification: {
           title: "Payment Request Declined",
           duration: 5000,
           gradient: "from-red-500 to-red-600",
         },
       },
       recipient: {
         state: "archived",
         previousNotification: "archive",
       },
     },

     // On Expiration
     expired: {
       requester: {
         state: "expired",
         notification: {
           title: "Payment Request Expired",
           duration: 3000,
         },
       },
       recipient: {
         state: "expired",
         previousNotification: "remove",
       },
     },
   };
   ```

2. **Transaction Flow**

   ```typescript
   const transactionTransitions = {
     // Initial Send
     initiated: {
       sender: {
         state: "active",
         notification: {
           title: "Sending Payment",
           priority: { base: "high", modifiers: { timeConstraint: true } },
         },
       },
       recipient: {
         state: "active",
         notification: {
           title: "Incoming Payment",
           priority: { base: "medium", modifiers: { timeConstraint: true } },
         },
       },
     },

     // On Success
     completed: {
       sender: {
         state: "actioned",
         notification: {
           title: "Payment Sent",
           duration: 5000,
           gradient: "from-green-500 to-green-600",
         },
       },
       recipient: {
         state: "actioned",
         notification: {
           title: "Payment Received",
           duration: 5000,
           gradient: "from-green-500 to-green-600",
         },
       },
     },

     // On Failure
     failed: {
       sender: {
         state: "active",
         notification: {
           title: "Payment Failed",
           priority: { base: "high", modifiers: { actionRequired: true } },
           gradient: "from-red-500 to-red-600",
         },
       },
       recipient: {
         state: "dismissed",
         previousNotification: "remove",
       },
     },
   };
   ```

#### Implementation Example

```typescript
async function handleNotificationTransition(
  ctx: MutationCtx,
  params: {
    notificationId: Id<"notifications">;
    transition:
      | keyof typeof paymentRequestTransitions
      | keyof typeof transactionTransitions;
    additionalData?: Record<string, unknown>;
  }
) {
  const notification = await ctx.db.get(params.notificationId);
  if (!notification) throw new Error("Notification not found");

  const transitionRules =
    notification.type === "payment_request"
      ? paymentRequestTransitions[params.transition]
      : transactionTransitions[params.transition];

  // Handle requester/sender notification
  if (notification.metadata.role === "sender") {
    const rules = transitionRules.sender || transitionRules.requester;

    await ctx.db.patch(notification._id, {
      status: rules.state,
      ...rules.notification,
      updatedAt: new Date().toISOString(),
    });

    if (rules.state === "actioned" && rules.notification.duration) {
      // Schedule auto-dismiss
      setTimeout(async () => {
        await ctx.db.patch(notification._id, {
          status: "archived",
          updatedAt: new Date().toISOString(),
        });
      }, rules.notification.duration);
    }
  }

  // Handle recipient notification
  const recipientNotification = await ctx.db
    .query("notifications")
    .withIndex("by_related")
    .filter((q) =>
      q.and(
        q.eq(q.field("metadata.counterpartyId"), notification.userId),
        q.eq(q.field("metadata.parentNotificationId"), notification._id)
      )
    )
    .first();

  if (recipientNotification) {
    const rules = transitionRules.recipient;

    if (rules.previousNotification === "remove") {
      await ctx.db.delete(recipientNotification._id);
    } else {
      await ctx.db.patch(recipientNotification._id, {
        status: rules.state,
        ...rules.notification,
        updatedAt: new Date().toISOString(),
      });
    }
  }
}
```

#### Transition Triggers

1. **User-Initiated**

   - Explicit actions (approve, decline, dismiss)
   - Navigation to related content
   - Manual refresh

2. **System-Initiated**

   - Status updates from backend
   - Error conditions
   - Batch operations

3. **Time-Based**

   - Auto-dismiss timeouts
   - Expiration checks
   - Periodic cleanup

4. **Context-Based**
   - User presence/absence
   - Application state changes
   - Network conditions

### Visual Design

#### Gradients

- Transaction Success: `from-green-500 to-green-600`
- Transaction Pending: `from-yellow-500 to-yellow-600`
- Transaction Failed: `from-red-500 to-red-600`
- Payment Request: `from-blue-500 via-purple-500 to-purple-600`
- Security High Priority: `from-red-500 to-red-600`
- Security Medium Priority: `from-orange-500 to-orange-600`
- Security Low Priority: `from-blue-500 to-blue-600`

#### Layout

```typescript
const notificationStyles = {
  container:
    "relative flex-none h-[72px] overflow-hidden rounded-xl bg-gradient-to-r",
  overlay: "absolute inset-0 bg-black/10",
  content: "relative h-full p-3 flex items-center gap-3",
  iconContainer: "p-2 rounded-lg bg-black/20",
  icon: "h-5 w-5 text-white",
  textContainer: "flex-1",
  title: "font-medium text-white text-base",
  description: "text-sm text-white/80",
  dismissButton:
    "absolute top-2 right-2 p-1 rounded-full bg-black/20 hover:bg-black/30",
};
```

### Interaction Patterns

1. **Dismissal**

   - Click X button to dismiss individual notifications
   - Swipe to dismiss (mobile)
   - Auto-dismiss after action completion
   - Some critical notifications require explicit dismissal

2. **Actions**

   - Primary action triggered by clicking notification body
   - Secondary actions available through expansion
   - Action feedback shown in-place

3. **Prioritization**
   - Critical security notifications shown first
   - Pending transactions and requests prioritized
   - Time-sensitive items sorted by urgency

## Technical Implementation

### Component Structure

```typescript
interface SuggestedActionsNotificationProps {
  notifications: Array<
    TransactionNotification | PaymentRequestNotification | SecurityNotification
  >;
  onActionClick: (notificationId: string) => void;
  onDismiss: (notificationId: string) => void;
}
```

### State Management

1. **Local State**

   - Dismissed notifications
   - Expanded state
   - Action in progress

2. **Global State**
   - Active notifications
   - User preferences
   - Notification history

### Database Schema Updates

```typescript
notifications: defineTable({
  userId: v.id("users"),
  type: v.union(
    v.literal("transaction"),
    v.literal("payment_request"),
    v.literal("security")
  ),
  status: v.union(
    v.literal("active"),
    v.literal("dismissed"),
    v.literal("actioned"),
    v.literal("expired")
  ),
  priority: v.object({
    base: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    modifiers: v.object({
      actionRequired: v.boolean(),
      timeConstraint: v.boolean(),
      amount: v.number(),
      role: v.union(v.literal("sender"), v.literal("recipient")),
    }),
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
    counterpartyId: v.id("users"),
    visibility: v.union(
      v.literal("sender_only"),
      v.literal("recipient_only"),
      v.literal("both")
    ),
    role: v.union(v.literal("sender"), v.literal("recipient")),
    parentNotificationId: v.optional(v.id("notifications")),
  }),
  createdAt: v.string(),
  updatedAt: v.string(),
});
```

## Integration Examples

1. **Payment Request Creation**

   ```typescript
   // Create notification for requester
   await ctx.db.insert("notifications", {
     userId: requesterId,
     type: "payment_request",
     status: "active",
     priority: {
       base: "medium",
       modifiers: {
         actionRequired: false,
         timeConstraint: true,
         amount: requestAmount,
         role: "sender",
       },
     },
     displayLocation: "suggested_actions",
     metadata: {
       gradient: "from-blue-500 via-purple-500 to-purple-600",
       counterpartyId: recipientId,
       visibility: "sender_only",
       role: "sender",
       // ... other metadata
     },
   });

   // Create notification for recipient
   await ctx.db.insert("notifications", {
     userId: recipientId,
     type: "payment_request",
     status: "active",
     priority: {
       base: "high",
       modifiers: {
         actionRequired: true,
         timeConstraint: true,
         amount: requestAmount,
         role: "recipient",
       },
     },
     displayLocation: "suggested_actions",
     metadata: {
       gradient: "from-blue-500 via-purple-500 to-purple-600",
       counterpartyId: requesterId,
       visibility: "recipient_only",
       role: "recipient",
       // ... other metadata
     },
   });
   ```

2. **Payment Request Approval**

   ```typescript
   // Create completion notification for requester
   await ctx.db.insert("notifications", {
     userId: requesterId,
     type: "payment_request",
     status: "active",
     priority: {
       base: "medium",
       modifiers: {
         actionRequired: false,
         timeConstraint: false,
         amount: requestAmount,
         role: "sender",
       },
     },
     displayLocation: "suggested_actions",
     metadata: {
       gradient: "from-green-500 to-green-600",
       counterpartyId: recipientId,
       visibility: "sender_only",
       role: "sender",
       parentNotificationId: originalNotificationId,
       // ... other metadata
     },
   });

   // Update recipient's notification
   await ctx.db.patch(recipientNotificationId, {
     status: "actioned",
     updatedAt: new Date().toISOString(),
   });
   ```

## Testing Requirements

1. **Unit Tests**

   - Notification creation
   - Priority sorting
   - Dismissal logic
   - Action handling

2. **Integration Tests**

   - Transaction flow
   - Payment request flow
   - Security alert flow

3. **E2E Tests**
   - Complete user journeys
   - Mobile interactions
   - Edge cases

## Performance Considerations

1. **Optimization**

   - Lazy loading of notification content
   - Efficient carousel rendering
   - Batch updates for multiple notifications

2. **Memory Management**
   - Cleanup of old notifications
   - State management optimization
   - Resource release on unmount

## Security Considerations

1. **Data Protection**

   - Sensitive information handling
   - Action verification
   - Permission validation

2. **User Privacy**
   - Notification content privacy
   - Activity tracking compliance
   - Data retention policies

## Accessibility

1. **Requirements**

   - Keyboard navigation
   - Screen reader support
   - Focus management
   - ARIA labels and roles

2. **Implementation**
   ```typescript
   // Example of accessibility implementation
   <div
     role="region"
     aria-label="Suggested Actions"
     aria-live="polite"
     tabIndex={0}
   >
     {/* Notification content */}
   </div>
   ```

## Future Enhancements

1. **Planned Features**

   - Notification grouping
   - Custom notification templates
   - Advanced filtering options
   - Rich media support

2. **Potential Improvements**
   - Machine learning for priority
   - Context-aware notifications
   - Interactive notifications
   - Cross-device sync

## Migration Plan

1. **Phase 1: Infrastructure**

   - Schema updates
   - Component creation
   - State management setup

2. **Phase 2: Integration**

   - Transaction system integration
   - Payment request integration
   - Security alerts integration

3. **Phase 3: Rollout**
   - Feature flag implementation
   - Gradual user migration
   - Monitoring and feedback

## Success Metrics

1. **Bi-directional Effectiveness**

   - Both parties receive appropriate notifications
   - Action completion rates for both parties
   - Time to action for recipients
   - Notification visibility duration

2. **Queue Performance**

   - Critical queue utilization
   - History queue turnover
   - Notification promotion rates
   - Queue balance maintenance

3. **User Engagement**
   - Action completion rate per role
   - Time to action by priority
   - Dismissal patterns by type
   - Role-specific interaction patterns
