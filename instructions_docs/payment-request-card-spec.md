# Payment Request Card Component Specification

## Overview

The Payment Request Card is a critical component within the chat interface that handles the display and management of payment requests between users. This component is responsible for rendering payment request states, managing permissions, and handling various payment-related actions.

## Core Requirements

### 1. Display Requirements

- Card must clearly display:
  - Request amount in sats
  - Requester and recipient information
  - Current status of the request
  - Timestamp and expiration information
  - Relevant action buttons based on user role
- Visual differentiation between different states (pending, paid, expired, cancelled, declined)
- Mobile-responsive design that maintains readability across all screen sizes

### 2. State Management

- Implement proper state tracking for payment requests with the following statuses:
  ```typescript
  type PaymentRequestStatus =
    | "pending"
    | "paid"
    | "expired"
    | "cancelled"
    | "declined";
  ```
- Terminal states (paid, cancelled, declined) must be permanent and not overridable by expiration
- Proper handling of expiration:
  - Automatic status updates when request expires
  - Expiration time must be set during request creation
  - Clear visual indication of time remaining

### 3. Role-Based Permissions

- Strict enforcement of role-based actions:
  - Requester can:
    - View request status
    - Cancel their own requests
    - NOT approve their own requests
  - Recipient can:
    - View request
    - Pay (approve) request
    - Decline request
- Clear visual distinction of available actions based on user role

### 4. Error Handling & Validation

- Comprehensive error handling for all payment-related actions
- Input validation for payment amounts
- Clear error messages for users when actions fail
- Proper handling of edge cases:
  - Network failures
  - Concurrent actions
  - Invalid states

### 5. Data Structure

```typescript
interface PaymentRequest {
  id: Id<"paymentRequests">;
  amount: number;
  requesterId: Id<"users">;
  recipientId: Id<"users">;
  status: PaymentRequestStatus;
  createdAt: number;
  expiresAt: number;
  messageId: Id<"messages">;
  updatedAt?: number;
  completedAt?: number;
}
```

## Technical Implementation

### 1. Component Structure

```typescript
interface PaymentRequestCardProps {
  request: PaymentRequest;
  isRequester: boolean;
  isRecipient: boolean;
  onPay: () => Promise<void>;
  onDecline: () => Promise<void>;
  onCancel: () => Promise<void>;
}
```

### 2. State Management Rules

- Use React hooks for local state management
- Implement proper cleanup in useEffect hooks
- Maintain single source of truth for request status
- Handle state updates through Convex mutations

### 3. Permissions Logic

```typescript
const canPay = isRecipient && request.status === "pending" && !isExpired;
const canCancel = isRequester && request.status === "pending" && !isExpired;
const canDecline = isRecipient && request.status === "pending" && !isExpired;
```

### 4. Expiration Handling

- Server-side expiration check:
  ```typescript
  const isExpired = (request: PaymentRequest) => {
    if (["paid", "cancelled", "declined"].includes(request.status)) {
      return false;
    }
    return Date.now() > request.expiresAt;
  };
  ```
- Client-side expiration display with countdown timer

## UI/UX Guidelines

### 1. Status Indicators

- Use clear visual indicators for different states:
  - Pending: Yellow/Orange
  - Paid: Green
  - Expired: Gray
  - Cancelled/Declined: Red
- Include status icons alongside text

### 2. Action Buttons

- Primary action (Pay) should be prominent
- Secondary actions (Cancel, Decline) should be less prominent
- Disabled states should be visually distinct
- Loading states during action processing

### 3. Responsive Design

- Adapt layout for different screen sizes
- Maintain touch-friendly tap targets on mobile
- Ensure all information is visible without scrolling when possible

## Error Handling

### 1. Client-Side Validation

- Amount validation
- Status transition validation
- Role-based action validation

### 2. Server-Side Validation

- Double-check permissions
- Validate request status before mutations
- Ensure atomic operations
- Prevent race conditions

### 3. Error Messages

- User-friendly error messages
- Technical details in logs
- Clear action paths for error recovery

## Logging Requirements

### 1. Debug Logging

- State transitions
- Action attempts
- Permission checks
- Expiration calculations

### 2. Error Logging

- Failed mutations
- Invalid state transitions
- Permission violations
- Network failures

## Testing Requirements

### 1. Unit Tests

- Component rendering
- Permission logic
- State transitions
- Expiration handling

### 2. Integration Tests

- End-to-end payment flow
- Role-based permissions
- Error handling
- State management

### 3. Edge Cases

- Concurrent actions
- Network failures
- Invalid states
- Race conditions

## Performance Considerations

### 1. Optimization

- Memoize expensive calculations
- Optimize re-renders
- Efficient state updates
- Proper cleanup of subscriptions and timers

### 2. Loading States

- Skeleton loading state
- Action button loading states
- Progressive enhancement

## Security Considerations

### 1. Data Validation

- Server-side validation of all inputs
- Prevention of unauthorized actions
- Protection against injection attacks

### 2. Permission Enforcement

- Double-check permissions on both client and server
- Prevent unauthorized state modifications
- Audit logging of sensitive actions

## Future Considerations

### 1. Potential Enhancements

- Payment request templates
- Recurring payment requests
- Batch actions for multiple requests
- Advanced filtering and sorting

### 2. Integration Points

- Notification system
- Analytics tracking
- Payment history
- User preferences

## Implementation Checklist

- [ ] Basic component structure
- [ ] State management implementation
- [ ] Permission system
- [ ] UI/UX implementation
- [ ] Error handling
- [ ] Testing suite
- [ ] Performance optimization
- [ ] Security measures
- [ ] Documentation
- [ ] Code review
