import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState, useCallback, useRef } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import { useAuth } from "@clerk/clerk-react";
import { create } from 'zustand';

interface UserAccountsAndWallets {
  accounts: {
    _id: Id<"accounts">;
    type: "personal" | "business";
    name: string;
    status: "active" | "inactive" | "suspended";
    identitySettings?: {
      username: string;
      domain: string;
      customDomain?: string;
      prefix?: string;
      suffix?: string;
    };
    wallets: Doc<"wallets">[];
  }[];
  isLoading: boolean;
  error: Error | null;
  selectedAccountId: Id<"accounts"> | null;
  setSelectedAccountId: (id: Id<"accounts"> | null) => void;
  isAccountSwitching: boolean;
  selectedWalletId: string | null;
  setSelectedWalletId: (id: string | null) => void;
}

interface AccountState {
  currentAccountId: Id<"accounts"> | null;
  isAccountSwitching: boolean;
  setCurrentAccountId: (id: Id<"accounts"> | null) => void;
  setIsAccountSwitching: (switching: boolean) => void;
}

// Create global state store
export const useAccountStore = create<AccountState>((set) => ({
  currentAccountId: null,
  isAccountSwitching: false,
  setCurrentAccountId: (id) => set({ currentAccountId: id }),
  setIsAccountSwitching: (switching) => set({ isAccountSwitching: switching }),
}));

export function useUserAccountsAndWallets(): UserAccountsAndWallets {
  const { userId } = useAuth();
  
  // Connect to global state
  const { 
    currentAccountId,
    isAccountSwitching: globalIsAccountSwitching,
    setCurrentAccountId,
    setIsAccountSwitching: setGlobalIsAccountSwitching 
  } = useAccountStore();
  
  // Local state
  const [selectedAccountId, setSelectedAccountId] = useState<Id<"accounts"> | null>(currentAccountId);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [isAccountSwitching, setIsAccountSwitching] = useState(globalIsAccountSwitching);
  
  // Refs for tracking changes
  const prevAccountIdRef = useRef<Id<"accounts"> | null>(null);
  const prevWalletsRef = useRef<Doc<"wallets">[] | undefined>(null);
  const walletSelectionsRef = useRef<Map<string, string>>(new Map());
  const isInitialMount = useRef(true);
  const lastSelectedAccountRef = useRef<Id<"accounts"> | null>(null);
  const stateUpdateTimeRef = useRef<number | null>(null);

  // Fetch accounts for the user using clerkId
  const accounts = useQuery(api.accounts.getAccountsByUser, 
    userId ? { clerkId: userId } : "skip"
  );
  
  // Fetch wallets for the selected account
  const wallets = useQuery(api.wallets.getWallets, 
    selectedAccountId ? { accountId: selectedAccountId } : "skip"
  );

  // Debug log for data fetching and state changes
  useEffect(() => {
    console.log('🔄 AccountsAndWallets Hook:', {
      event: 'Data Update',
      hasAccounts: !!accounts?.length,
      accountsCount: accounts?.length || 0,
      selectedAccountId: selectedAccountId?.toString() || 'none',
      lastSelectedAccountId: lastSelectedAccountRef.current?.toString() || 'none',
      walletsQuery: selectedAccountId ? 'active' : 'skipped',
      walletsCount: wallets?.length || 0,
      isWalletLoading,
      isAccountSwitching,
      accountsLoading: !accounts,
      timestamp: new Date().toISOString()
    });
  }, [accounts, selectedAccountId, wallets, isWalletLoading, isAccountSwitching]);

  // Track state updates timing
  useEffect(() => {
    if (isAccountSwitching && !stateUpdateTimeRef.current) {
      stateUpdateTimeRef.current = Date.now();
    } else if (!isAccountSwitching && stateUpdateTimeRef.current) {
      const duration = Date.now() - stateUpdateTimeRef.current;
      console.log('⏱️ AccountsAndWallets Timing:', {
        event: 'State Update Complete',
        duration,
        accountId: selectedAccountId?.toString() || 'none',
        timestamp: new Date().toISOString()
      });
      stateUpdateTimeRef.current = null;
    }
  }, [isAccountSwitching, selectedAccountId]);

  // Persist last selected account with logging
  useEffect(() => {
    if (selectedAccountId) {
      console.log('💾 AccountsAndWallets Storage:', {
        event: 'Persisting Selection',
        accountId: selectedAccountId.toString(),
        previousAccount: lastSelectedAccountRef.current?.toString() || 'none',
        timestamp: new Date().toISOString()
      });

      lastSelectedAccountRef.current = selectedAccountId;
      localStorage.setItem('lastSelectedAccountId', selectedAccountId.toString());
    }
  }, [selectedAccountId]);

  // Set initial account selection with enhanced logging
  useEffect(() => {
    if (!accounts?.length) return;

    const storedAccountId = localStorage.getItem('lastSelectedAccountId');
    const storedAccount = storedAccountId ? accounts.find(a => a._id.toString() === storedAccountId) : null;

    if (isInitialMount.current) {
      console.log('🎬 AccountsAndWallets Init:', {
        event: 'Initial Setup',
        hasStoredAccount: !!storedAccount,
        storedAccountId: storedAccountId || 'none',
        currentSelection: selectedAccountId?.toString() || 'none',
        accountsCount: accounts.length,
        timestamp: new Date().toISOString()
      });

      isInitialMount.current = false;

      if (storedAccount && !selectedAccountId) {
        console.log('♻️ AccountsAndWallets Restore:', {
          event: 'Restoring Stored Account',
          accountId: storedAccount._id.toString(),
          accountType: storedAccount.type,
          timestamp: new Date().toISOString()
        });
        handleAccountSelection(storedAccount._id);
      } else if (!selectedAccountId) {
        console.log('🆕 AccountsAndWallets Default:', {
          event: 'Setting Default Account',
          accountId: accounts[0]._id.toString(),
          accountType: accounts[0].type,
          timestamp: new Date().toISOString()
        });
        handleAccountSelection(accounts[0]._id);
      }
    } else if (!selectedAccountId && lastSelectedAccountRef.current) {
      console.log('🔄 AccountsAndWallets Recovery:', {
        event: 'Restoring Last Account',
        accountId: lastSelectedAccountRef.current.toString(),
        timestamp: new Date().toISOString()
      });
      handleAccountSelection(lastSelectedAccountRef.current);
    }
  }, [accounts, selectedAccountId]);

  // Sync local and global state
  useEffect(() => {
    if (currentAccountId !== selectedAccountId) {
      console.log('🔄 AccountsAndWallets Sync:', {
        event: 'Global State Sync',
        local: selectedAccountId?.toString() || 'none',
        global: currentAccountId?.toString() || 'none',
        timestamp: new Date().toISOString()
      });
      setSelectedAccountId(currentAccountId);
    }
  }, [currentAccountId, selectedAccountId, setSelectedAccountId]);

  useEffect(() => {
    if (globalIsAccountSwitching !== isAccountSwitching) {
      console.log('🔄 AccountsAndWallets Sync:', {
        event: 'Switch State Sync',
        local: isAccountSwitching,
        global: globalIsAccountSwitching,
        timestamp: new Date().toISOString()
      });
      setIsAccountSwitching(globalIsAccountSwitching);
    }
  }, [globalIsAccountSwitching, isAccountSwitching, setIsAccountSwitching]);

  // Modified account selection handler
  const handleAccountSelection = useCallback((id: Id<"accounts"> | null) => {
    if (id === selectedAccountId) {
      // If selecting same account, ensure switching state is reset
      setGlobalIsAccountSwitching(false);
      setIsAccountSwitching(false);
      return;
    }

    const selectedAccount = accounts?.find(a => a._id === id);
    console.log('👉 AccountsAndWallets Selection:', {
      event: 'Account Selection',
      from: selectedAccountId?.toString() || 'none',
      to: id?.toString() || 'none',
      accountType: selectedAccount?.type || 'unknown',
      currentWallet: selectedWalletId || 'none',
      hasStoredWallet: id ? !!walletSelectionsRef.current.get(id.toString()) : false,
      timestamp: new Date().toISOString()
    });

    // Update global state first
    setGlobalIsAccountSwitching(true);
    setCurrentAccountId(id);

    // Then update local state
    setIsAccountSwitching(true);
    setIsWalletLoading(true);
    setSelectedWalletId(null);
    setSelectedAccountId(id);
    prevAccountIdRef.current = id;
    
    if (id) {
      lastSelectedAccountRef.current = id;
      // Clear wallet reference to force refetch
      prevWalletsRef.current = undefined;

      // Try to restore previous wallet selection
      const previousSelection = walletSelectionsRef.current.get(id.toString()) || 
                              localStorage.getItem(`wallet_${id.toString()}`);
      
      if (previousSelection) {
        console.log('♻️ AccountsAndWallets Restore:', {
          event: 'Restoring Wallet Selection',
          accountId: id.toString(),
          walletId: previousSelection,
          accountType: selectedAccount?.type,
          source: walletSelectionsRef.current.has(id.toString()) ? 'memory' : 'localStorage',
          timestamp: new Date().toISOString()
        });
        
        // Use requestAnimationFrame to ensure proper state sequence
        requestAnimationFrame(() => {
          setSelectedWalletId(previousSelection);
          // Reset switching state after wallet is selected
          setGlobalIsAccountSwitching(false);
          setIsAccountSwitching(false);
        });
      } else {
        // If no previous wallet, reset switching state after a short delay
        setTimeout(() => {
          setGlobalIsAccountSwitching(false);
          setIsAccountSwitching(false);
        }, 100);
      }
    } else {
      // Reset switching state immediately if no account selected
      setGlobalIsAccountSwitching(false);
      setIsAccountSwitching(false);
    }
  }, [accounts, selectedAccountId, selectedWalletId, setCurrentAccountId, setGlobalIsAccountSwitching]);

  // Modified effect for wallet loading state
  useEffect(() => {
    const accountChanged = selectedAccountId !== prevAccountIdRef.current;
    const walletsChanged = wallets !== prevWalletsRef.current;
    const hasWallets = wallets?.length > 0;
    const selectedAccount = accounts?.find(a => a._id === selectedAccountId);

    console.log('🔍 AccountsAndWallets Changes:', {
      event: 'Change Detection',
      accountChanged,
      walletsChanged,
      currentAccountId: selectedAccountId?.toString() || 'none',
      accountType: selectedAccount?.type || 'unknown',
      walletsCount: wallets?.length || 0,
      hasWalletSelection: !!selectedWalletId,
      isWalletLoading,
      isAccountSwitching,
      timestamp: new Date().toISOString()
    });

    if (accountChanged) {
      prevAccountIdRef.current = selectedAccountId;
      prevWalletsRef.current = undefined;
    }

    if (walletsChanged) {
      prevWalletsRef.current = wallets;
      
      if (hasWallets && !selectedWalletId) {
        const firstWalletId = wallets[0]._id.toString();
        console.log('🎯 AccountsAndWallets Selection:', {
          event: 'Auto-selecting Wallet',
          walletId: firstWalletId,
          accountId: selectedAccountId?.toString(),
          accountType: selectedAccount?.type,
          totalWallets: wallets.length,
          timestamp: new Date().toISOString()
        });
        
        setSelectedWalletId(firstWalletId);
        if (selectedAccountId) {
          walletSelectionsRef.current.set(selectedAccountId.toString(), firstWalletId);
        }
      }
      
      // Reset loading states when we have wallets data or no account selected
      if (hasWallets || selectedAccountId === null) {
        setIsWalletLoading(false);
        // Only reset switching state if we have wallets or explicitly no account
        if (hasWallets || selectedAccountId === null) {
          setIsAccountSwitching(false);
          setGlobalIsAccountSwitching(false);
        }
      }
    }
  }, [accounts, selectedAccountId, wallets, selectedWalletId, setGlobalIsAccountSwitching]);

  // Verify wallet belongs to current account
  useEffect(() => {
    if (selectedWalletId && wallets) {
      const walletExists = wallets.some(w => w._id.toString() === selectedWalletId);
      console.log('🔎 Wallet Validation:', {
        walletId: selectedWalletId,
        exists: walletExists,
        accountId: selectedAccountId?.toString(),
        walletsCount: wallets.length
      });
      
      if (!walletExists) {
        console.log('⚠️ Selected wallet not found in current account, clearing selection');
        setSelectedWalletId(null);
      }
    }
  }, [selectedWalletId, wallets, selectedAccountId]);

  // Combine accounts and wallets data
  const accountsWithWallets = accounts?.map(account => ({
    ...account,
    wallets: account._id === selectedAccountId && wallets ? wallets : []
  })) ?? [];

  return {
    accounts: accountsWithWallets,
    isLoading: !accounts || isWalletLoading,
    error,
    selectedAccountId,
    setSelectedAccountId: handleAccountSelection,
    isAccountSwitching,
    selectedWalletId,
    setSelectedWalletId
  };
} 