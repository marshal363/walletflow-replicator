# BitBank Messages (Social Payments) - Master Plan

## 1. Overview & Vision

The Messages feature in BitBank revolutionizes Bitcoin transactions by seamlessly integrating social payments with messaging. This creates a natural, chat-based environment where users can send and receive Bitcoin as easily as sending a message.

## 2. Core Objectives

1. Simplify Bitcoin transactions through natural conversation
2. Reduce friction in peer-to-peer payments
3. Create an intuitive social payment experience
4. Leverage AI for payment detection and automation
5. Maintain security and privacy through Nostr integration

## 3. Key Features & Functionality

### 3.1 Chat Interface

#### Direct Messaging

- One-on-one conversations
- Personal payment history
- Contact management
- Quick payment actions

#### Group Chats

- Multi-participant conversations
- Group payment coordination
- Split payment capabilities
- Shared payment history

### 3.2 AI Payment Detection

#### Natural Language Processing

- Automatic detection of payment mentions
- Amount recognition
- Intent identification (send/request)
- Context understanding

#### Smart Suggestions

- Payment action prompts
- Pre-filled payment forms
- Contextual recommendations
- Payment history integration

### 3.3 Payment Integration

#### Quick Actions

- Send/Receive buttons
- Payment shortcuts
- Preset amounts
- Recent recipient access

#### Transaction Management

- Payment status tracking
- Transaction history
- Receipt generation
- Error handling

## 4. User Experience

### 4.1 Chat Layout

#### Main View

- Contact/Group list
- Recent conversations
- Search functionality
- Unread indicators

#### Conversation View

- Message thread
- Payment suggestions
- Quick actions
- Input area

### 4.2 Payment Interactions

#### Manual Payments

- Direct payment button
- Amount input
- Recipient selection
- Network choice

#### AI-Suggested Payments

- Inline suggestions
- One-click confirmation
- Amount modification
- Context preservation

## 5. Social Features

### 5.1 Contact Management

- Nostr contact import
- Payment history tracking
- Favorite contacts
- Group management

### 5.2 Social Interactions

- Message reactions
- Payment acknowledgments
- Group coordination
- Share payment requests

## 6. Privacy & Security

### 6.1 Message Privacy

- End-to-end encryption
- Private chats
- Secure group messages
- Message signing

### 6.2 Payment Security

- Amount confirmation
- Transaction verification
- Error prevention
- Fraud protection

## 7. Implementation Phases

### Phase 1: Core Messaging

1. Basic chat functionality
2. Nostr integration
3. Contact management
4. Direct messaging

### Phase 2: Payment Integration

1. Manual payment features
2. Transaction tracking
3. Payment history
4. Basic AI detection

### Phase 3: Advanced Features

1. Enhanced AI capabilities
2. Group payments
3. Advanced automation
4. Rich media support

## 8. User Benefits

### 8.1 Convenience

- Natural payment flow
- Reduced friction
- Quick transactions
- Payment context preservation

### 8.2 Organization

- Payment history tracking
- Conversation context
- Transaction records
- Contact management

## 9. Technical Considerations

### 9.1 Integration Requirements

- Nostr protocol
- Lightning Network
- On-chain transactions
- AI processing

### 9.2 Performance Goals

- Real-time messaging
- Quick payment processing
- Responsive interface
- Reliable delivery

### 9.3 State Management Challenges

#### Account Switching Flow

**Issue Description:**
The wallet state management system experienced synchronization issues during account switching, specifically:

- Wallet data not updating properly after account switches
- Stale wallet data persisting in the HomeWidgets component
- Race conditions between modal closing and state updates
- Inconsistent state between AccountSwitcher and HomeWidgets components

**Root Causes:**

1. **Timing Issues**

   - State updates occurring before account switch completion
   - Modal closing event not properly synchronized with state changes
   - Lack of proper cleanup for stale wallet data

2. **Component Communication**
   - Disconnected state management between AccountSwitcher and HomeWidgets
   - No direct link between modal closing and wallet synchronization
   - Missing event handling for account switch completion

**Implementation Solution:**

```typescript
// State Management
const [isAccountSwitching, setIsAccountSwitching] = useState(false);
const pendingAccountRef = useRef<Id<"accounts"> | null>(null);
const prevAccountIdRef = useRef<Id<"accounts"> | null>(null);

// Event Handling
useEffect(() => {
  const handleModalClose = () => {
    if (pendingAccountRef.current) {
      // Process pending account change
      setSelectedAccountId(pendingAccountRef.current);
      setIsAccountSwitching(true);
    }
  };

  document.addEventListener("modalclose", handleModalClose);
  return () => document.removeEventListener("modalclose", handleModalClose);
}, []);

// Wallet Synchronization
useEffect(() => {
  if (selectedAccountId !== prevAccountIdRef.current) {
    // Clear stale data
    setSelectedWalletId(null);
    // Trigger wallet refresh
    setIsWalletLoading(true);
    prevAccountIdRef.current = selectedAccountId;
  }
}, [selectedAccountId]);
```

**Key Improvements:**

1. **Explicit State Tracking**

   - Added isAccountSwitching flag
   - Implemented pendingAccountRef for tracking changes
   - Added proper state cleanup mechanisms

2. **Event-Based Synchronization**

   - Added modalclose event emission
   - Implemented proper event handling
   - Enhanced state synchronization flow

3. **Enhanced Error Prevention**

   - Added wallet validation checks
   - Implemented proper loading states
   - Added comprehensive logging

4. **Performance Optimization**
   - Reduced unnecessary re-renders
   - Improved state update batching
   - Enhanced data fetching efficiency

**Logging Implementation:**

```typescript
console.log("🏠 HomeWidgets Data:", {
  accountId: selectedAccountId?.toString() || "none",
  accountType: selectedAccount?.type || "unknown",
  walletsCount: wallets?.length || 0,
  isLoading: accountsLoading,
  isAccountSwitching,
});
```

**Best Practices Established:**

1. Always validate wallet belongs to current account
2. Clear stale data during account switches
3. Implement proper loading states
4. Add comprehensive logging for debugging
5. Handle race conditions explicitly
6. Synchronize modal and state changes
7. Maintain proper cleanup mechanisms

**Future Considerations:**

1. Implement optimistic updates for faster UI response
2. Add retry mechanisms for failed state updates
3. Enhance error recovery mechanisms
4. Implement state persistence for better UX
5. Add performance monitoring
6. Enhance debugging capabilities

## 10. Success Metrics

### 10.1 Usage Metrics

- Active conversations
- Payment frequency
- AI suggestion accuracy
- User retention

### 10.2 Performance Metrics

- Message delivery time
- Payment success rate
- AI detection accuracy
- User satisfaction

## 11. Future Enhancements

### 11.1 Feature Expansion

- Advanced payment scheduling
- Enhanced group features
- Rich media support
- Payment templates

### 11.2 Integration Opportunities

- Additional networks
- External services
- Payment protocols
- Identity systems

## 12. User Guidelines

### 12.1 Best Practices

- Payment verification
- Group payment etiquette
- Security measures
- Privacy considerations

### 12.2 Safety Tips

- Amount verification
- Recipient confirmation
- Security awareness
- Error recovery

## 13. Support & Documentation

### 13.1 User Support

- Setup guides
- Feature tutorials
- FAQ section
- Help resources

### 13.2 Documentation

- Feature descriptions
- Usage guidelines
- Security practices
- Troubleshooting

## 14. Competitive Advantages

### 14.1 Unique Features

- AI-powered suggestions
- Seamless integration
- Privacy focus
- User experience

### 14.2 Market Position

- Bitcoin-native solution
- Social payment pioneer
- Privacy-focused platform
- User-friendly design

Would you like me to:

1. Expand on any specific section?
2. Add more details about certain features?
3. Include user scenarios or use cases?
4. Add visual references or mockups?

PRF
Features:

fix(account-switching): ensure wallet data syncs after account changes

- Add force refresh mechanism to handle account switches
- Clear stale wallet data when account changes
- Validate wallet belongs to current account
- Add comprehensive logging for debugging
- Fix issue where HomeWidgets showed incorrect wallet after modal close

Changes:

- Add forceRefreshRef to trigger re-renders
- Improve wallet validation and synchronization
- Add proper cleanup of stale data
- Enhance logging for better debugging
- Fix race conditions in data loading

Resolves: Issue with wallet data not updating after account switch
