# Profile Modal & Account Switching - Feature Specification

## 1. Overview

The Profile Modal serves as a central hub for user identity management and account switching within the BitChat application. It provides a seamless interface for managing multiple accounts, user profiles, and associated settings while maintaining state consistency across the application.

## 2. Core Components

### 2.1 Profile Display

- **QR Code Section**
  - Dynamic QR code generation for user identification
  - Centered user avatar with initials display
  - Username display with @ prefix
  - Contact sharing functionality

### 2.2 Account Switcher

- **Account List**
  - Display of all user accounts
  - Visual indication of currently selected account
  - Account type indicators (Personal/Business)
  - Account-specific metadata display
  - Create new account option

### 2.3 Quick Actions

- Invite friends functionality
- Account settings access
- Documents & statements view
- Premium upgrade option

## 3. State Management

### 3.1 Account Switching Flow

```typescript
interface AccountSwitchState {
  isAccountSwitching: boolean;
  previousAccountId: Id<"accounts"> | null;
  pendingAccountId: Id<"accounts"> | null;
  selectedAccountId: Id<"accounts"> | null;
}
```

#### State Transitions

1. **Initial State**

   - Load current account details
   - Initialize account list
   - Set up state observers

2. **During Switch**

   - Set isAccountSwitching flag
   - Store previous account ID
   - Queue pending account change
   - Trigger UI loading states

3. **Post Switch**
   - Update global account context
   - Refresh associated data
   - Clear transition flags
   - Update UI components

### 3.2 Global State Updates

When a user selects a different account, the following updates MUST occur across the application:

#### Profile Modal Updates

- User avatar and initials
- Username and display information
- QR code regeneration
- Account type indicator
- Account-specific settings
- Premium status

#### Home View Updates

- Wallet list and balances
- Transaction history
- Payment methods
- Account statistics
- Recent activity

#### Header Updates

- Account name
- Profile picture
- Account type badge
- Notification preferences

#### Messaging Updates

- Chat history for selected account
- Contact list refresh
- Unread message counts
- Active conversations
- Message permissions
- Payment requests

#### Financial Data

- Transaction history
- Payment methods
- Account balances
- Spending limits
- Payment preferences

#### Security Context

- Permission levels
- Access controls
- Authentication tokens
- Security settings

### 3.3 Chat Context Management

- Preserve chat history during switches
- Handle unread message states
- Manage active conversations
- Update chat permissions

## 4. User Interface States

### 4.1 Modal States

```typescript
type ModalState =
  | "viewing-profile"
  | "creating-account"
  | "switching-account"
  | "loading";
```

### 4.2 Transitions

- Smooth animations between states
- Loading indicators during transitions
- Error state handling
- Success confirmations

## 5. Account Creation Flow

### 5.1 Form Fields

- Account Type Selection (Personal/Business)
- Account Name Input
- Username Selection
- Optional Profile Picture

### 5.2 Validation Rules

- Username uniqueness check
- Required field validation
- Format restrictions
- Real-time validation

## 6. Security Considerations

### 6.1 Authentication

- Session validation during switches
- Permission verification
- Rate limiting on actions
- Security token management

### 6.2 Data Protection

- Secure storage of account data
- Encryption of sensitive information
- Access control enforcement
- Audit logging

## 7. Performance Requirements

### 7.1 Metrics

- Account switch completion < 500ms
- Modal render time < 100ms
- State sync delay < 200ms
- Animation smoothness 60fps

### 7.2 Optimization

- Lazy loading of account data
- Caching of frequent operations
- Efficient state updates
- Resource cleanup

## 8. Error Handling

### 8.1 Error States

```typescript
type ProfileError =
  | "switch-failed"
  | "creation-failed"
  | "validation-failed"
  | "network-error";
```

### 8.2 Recovery Procedures

- Automatic retry logic
- Fallback mechanisms
- User feedback
- Error logging

## 9. Integration Points

### 9.1 Backend Services

- Convex data synchronization
- Clerk authentication
- Real-time updates
- State persistence

### 9.2 Frontend Components

- Global state management
- Router integration
- Event system
- UI component library

## 10. Testing Requirements

### 10.1 Unit Tests

- Component rendering
- State transitions
- Error handling
- Validation logic

### 10.2 Integration Tests

- Account switching flow
- Data persistence
- UI interactions
- Error scenarios

## 11. Accessibility

### 11.1 Requirements

- Keyboard navigation
- Screen reader support
- Focus management
- ARIA attributes

### 11.2 Standards

- WCAG 2.1 compliance
- Semantic HTML
- Color contrast
- Interactive elements

## 12. Implementation Guidelines

### 12.1 Code Structure

```typescript
// Component Organization
/src
  /components
    /profile
      ProfileModal.tsx
      AccountSwitcher.tsx
      CreateAccountForm.tsx
      QuickActions.tsx
  /hooks
    useAccountSwitch.ts
    useProfileState.ts
  /context
    AccountContext.tsx
  /types
    profile.types.ts
```

### 12.2 State Management

```typescript
// Example hook implementation
function useAccountSwitch() {
  const [state, setState] = useState<AccountSwitchState>({
    isAccountSwitching: false,
    previousAccountId: null,
    pendingAccountId: null,
    selectedAccountId: null,
  });

  const handleAccountSwitch = async (accountId: Id<"accounts">) => {
    setState((prev) => ({
      ...prev,
      isAccountSwitching: true,
      pendingAccountId: accountId,
    }));

    // Implement switch logic

    setState((prev) => ({
      ...prev,
      isAccountSwitching: false,
      selectedAccountId: accountId,
      previousAccountId: prev.selectedAccountId,
    }));
  };

  return {
    state,
    handleAccountSwitch,
  };
}
```

## 13. Future Considerations

### 13.1 Scalability

- Support for larger account numbers
- Performance optimization
- State management improvements
- Caching strategies

### 13.2 Feature Expansion

- Enhanced profile customization
- Advanced account management
- Additional security features
- Integration with new services
