# Account State Management Requirements

## Overview

This document outlines the requirements for improving the account state management system in the WalletFlow application, focusing on resolving current inconsistencies and establishing a more robust state management architecture.

## Current Architecture

The application currently uses a dual state management approach:

- Zustand store (`useAccountStore`) for global state
- React Context (`AccountContext`) for some component states
- Local component states in various components

## Core Requirements

### 1. State Management Consolidation

#### Global State Store

- Single source of truth using Zustand
- Remove redundant React Context implementation
- Centralized state interface:

```typescript
interface AccountState {
  currentAccountId: Id<"accounts"> | null;
  isAccountSwitching: boolean;
  selectedWalletId: string | null;
  wallets: Doc<"wallets">[];
  accounts: Account[];
  error: Error | null;
}
```

#### State Actions

```typescript
interface AccountActions {
  setCurrentAccount: (id: Id<"accounts">, wallets: Doc<"wallets">[]) => void;
  startAccountSwitch: () => void;
  completeAccountSwitch: () => void;
  setSelectedWallet: (id: string | null) => void;
  setError: (error: Error | null) => void;
}
```

### 2. Account Switching Flow

#### State Transitions

1. Initial State → Account Switch Initiated
2. Account Switch Initiated → Loading New Account Data
3. Loading New Account Data → Account Switch Complete
4. Error States (at any point)

#### Required Behaviors

- Atomic state updates
- Proper loading states during transitions
- Error handling at each step
- State rollback capabilities
- Persistence of selections

### 3. Component Integration

#### HomeWidgets Component

- Clear loading states during account switches
- Proper wallet selection reset
- Consistent state updates

#### Messages/Lightning Views

- Account-specific data segregation
- Clear transition states
- Proper cleanup on account switch

### 4. Data Persistence

#### Local Storage

- Account selection history
- Wallet preferences per account
- Last known good state

#### Memory Management

- Proper cleanup of old state
- Cache invalidation
- Memory leak prevention

### 5. Error Handling

#### Required Error States

- Account switch failure
- Data fetch failure
- Validation errors
- Network errors

#### Recovery Mechanisms

- Automatic retry logic
- Fallback states
- User feedback
- State recovery

### 6. Performance Requirements

#### State Updates

- Minimize re-renders
- Batch state updates
- Proper memoization
- Efficient subscription patterns

#### Loading States

- Skeleton loading UI
- Progressive data loading
- Optimistic updates where appropriate

### 7. Security Requirements

#### Data Isolation

- Strict account context validation
- Proper cleanup of sensitive data
- Access control validation

#### State Validation

- Type safety
- Runtime checks
- Input validation

## Implementation Guidelines

### State Updates

```typescript
// Example of proper state update pattern
const switchAccount = async (accountId: Id<"accounts">) => {
  store.startAccountSwitch();
  try {
    const wallets = await fetchWallets(accountId);
    store.setCurrentAccount(accountId, wallets);
    store.completeAccountSwitch();
  } catch (error) {
    store.setError(error);
    store.completeAccountSwitch();
  }
};
```

### Component Integration

```typescript
// Example of component integration
function AccountAwareComponent() {
  const { currentAccountId, isAccountSwitching } = useAccountStore();

  useEffect(() => {
    if (isAccountSwitching) {
      // Clear component state
      // Show loading state
    }
  }, [isAccountSwitching]);
}
```

## Testing Requirements

### Unit Tests

- State transitions
- Error handling
- Component integration
- Data persistence

### Integration Tests

- Account switching flow
- Component interactions
- Error recovery
- Performance benchmarks

## Monitoring Requirements

### Performance Metrics

- State update timing
- Component render timing
- Memory usage
- Error rates

### User Experience Metrics

- Account switch success rate
- Switch completion time
- Error recovery rate
- User interaction patterns

## Migration Plan

### Phase 1: State Consolidation

- Remove React Context
- Implement unified Zustand store
- Update component integrations

### Phase 2: Error Handling

- Implement comprehensive error states
- Add recovery mechanisms
- Update error reporting

### Phase 3: Performance Optimization

- Optimize state updates
- Implement proper memoization
- Add performance monitoring

## Success Criteria

### Functional

- Zero state inconsistencies
- 100% account switch success rate
- Proper error recovery
- Complete data isolation

### Performance

- Account switch under 500ms
- No unnecessary re-renders
- Memory usage within bounds
- Smooth UI transitions
