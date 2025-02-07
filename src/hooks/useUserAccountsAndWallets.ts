import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState, useCallback, useRef } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import { useAuth } from "@clerk/clerk-react";

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

export function useUserAccountsAndWallets(): UserAccountsAndWallets {
  const { userId } = useAuth();
  // State for selected account and wallet
  const [selectedAccountId, setSelectedAccountId] = useState<Id<"accounts"> | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [isAccountSwitching, setIsAccountSwitching] = useState(false);
  
  // Refs for tracking changes
  const prevAccountIdRef = useRef<Id<"accounts"> | null>(null);
  const prevWalletsRef = useRef<Doc<"wallets">[] | undefined>(null);
  const walletSelectionsRef = useRef<Map<string, string>>(new Map());
  const isInitialMount = useRef(true);
  const lastSelectedAccountRef = useRef<Id<"accounts"> | null>(null);

  // Fetch accounts for the user using clerkId
  const accounts = useQuery(api.accounts.getAccountsByUser, 
    userId ? { clerkId: userId } : "skip"
  );
  
  // Fetch wallets for the selected account
  const wallets = useQuery(api.wallets.getWallets, 
    selectedAccountId ? { accountId: selectedAccountId } : "skip"
  );

  // Calculate loading state
  const isLoading = !accounts || isWalletLoading;

  // Debug log for data fetching
  useEffect(() => {
    console.log('📊 Data Status:', {
      hasAccounts: !!accounts?.length,
      accountsCount: accounts?.length || 0,
      selectedAccountId: selectedAccountId?.toString() || 'none',
      lastSelectedAccountId: lastSelectedAccountRef.current?.toString() || 'none',
      walletsQuery: selectedAccountId ? 'active' : 'skipped',
      walletsCount: wallets?.length || 0,
      isWalletLoading,
      isAccountSwitching,
      accountsLoading: !accounts
    });
  }, [accounts, selectedAccountId, wallets, isWalletLoading, isAccountSwitching]);

  // Persist last selected account
  useEffect(() => {
    if (selectedAccountId) {
      lastSelectedAccountRef.current = selectedAccountId;
      // Store in localStorage for persistence across refreshes
      localStorage.setItem('lastSelectedAccountId', selectedAccountId.toString());
    }
  }, [selectedAccountId]);

  // Set initial account selection
  useEffect(() => {
    if (!accounts?.length) return;

    // If we have a stored selection, use it
    const storedAccountId = localStorage.getItem('lastSelectedAccountId');
    const storedAccount = storedAccountId ? accounts.find(a => a._id.toString() === storedAccountId) : null;

    if (isInitialMount.current) {
      console.log('🎬 Initial Account Setup:', {
        hasStoredAccount: !!storedAccount,
        storedAccountId: storedAccountId || 'none',
        currentSelection: selectedAccountId?.toString() || 'none',
        accountsCount: accounts.length
      });

      isInitialMount.current = false;

      // Use stored account if valid, otherwise use first account
      if (storedAccount && !selectedAccountId) {
        console.log('♻️ Restoring stored account selection:', storedAccount._id.toString());
        handleAccountSelection(storedAccount._id);
      } else if (!selectedAccountId) {
        console.log('🆕 Setting default account:', accounts[0]._id.toString());
        handleAccountSelection(accounts[0]._id);
      }
    } else if (!selectedAccountId && lastSelectedAccountRef.current) {
      // Restore last selected account if state was reset
      console.log('🔄 Restoring last selected account:', lastSelectedAccountRef.current.toString());
      handleAccountSelection(lastSelectedAccountRef.current);
    }
  }, [accounts, selectedAccountId]);

  // Handle account selection with state persistence
  const handleAccountSelection = useCallback((id: Id<"accounts"> | null) => {
    if (id === selectedAccountId) return;

    const selectedAccount = accounts?.find(a => a._id === id);
    console.log('👉 Account Selection:', {
      from: selectedAccountId?.toString() || 'none',
      to: id?.toString() || 'none',
      accountType: selectedAccount?.type || 'unknown',
      currentWallet: selectedWalletId || 'none',
      hasStoredWallet: id ? !!walletSelectionsRef.current.get(id.toString()) : false
    });

    // Store current wallet selection before switching
    if (selectedAccountId && selectedWalletId) {
      console.log('💾 Storing wallet selection:', {
        accountId: selectedAccountId.toString(),
        walletId: selectedWalletId,
        totalStored: walletSelectionsRef.current.size
      });
      walletSelectionsRef.current.set(selectedAccountId.toString(), selectedWalletId);
      // Store wallet selection in localStorage
      localStorage.setItem(`wallet_${selectedAccountId.toString()}`, selectedWalletId);
    }

    // Clear states in correct order
    setSelectedWalletId(null);
    setIsWalletLoading(true);
    setIsAccountSwitching(true);
    
    // Update account selection
    setSelectedAccountId(id);
    prevAccountIdRef.current = id;
    if (id) lastSelectedAccountRef.current = id;
    
    // Clear wallet reference to force refetch
    prevWalletsRef.current = undefined;

    // Restore previous wallet selection after state updates
    if (id) {
      // Try to get wallet selection from memory first, then localStorage
      const previousSelection = walletSelectionsRef.current.get(id.toString()) || 
                              localStorage.getItem(`wallet_${id.toString()}`);
      if (previousSelection) {
        console.log('♻️ Restoring previous wallet selection:', {
          accountId: id.toString(),
          walletId: previousSelection,
          accountType: selectedAccount?.type,
          source: walletSelectionsRef.current.has(id.toString()) ? 'memory' : 'localStorage'
        });
        requestAnimationFrame(() => {
          setSelectedWalletId(previousSelection);
        });
      }
    }
  }, [accounts, selectedAccountId, selectedWalletId]);

  // Handle wallet loading state and selection
  useEffect(() => {
    const accountChanged = selectedAccountId !== prevAccountIdRef.current;
    const walletsChanged = wallets !== prevWalletsRef.current;
    const hasWallets = wallets?.length > 0;
    const selectedAccount = accounts?.find(a => a._id === selectedAccountId);

    console.log('🔍 Change Detection:', {
      accountChanged,
      walletsChanged,
      currentAccountId: selectedAccountId?.toString() || 'none',
      accountType: selectedAccount?.type || 'unknown',
      walletsCount: wallets?.length || 0,
      hasWalletSelection: !!selectedWalletId,
      isWalletLoading,
      isAccountSwitching
    });

    if (accountChanged) {
      prevAccountIdRef.current = selectedAccountId;
      // Force wallet refetch on account change
      prevWalletsRef.current = undefined;
    }

    if (walletsChanged) {
      prevWalletsRef.current = wallets;
      
      if (hasWallets && !selectedWalletId) {
        const firstWalletId = wallets[0]._id.toString();
        console.log('🎯 Auto-selecting first wallet:', {
          walletId: firstWalletId,
          accountId: selectedAccountId?.toString(),
          accountType: selectedAccount?.type,
          totalWallets: wallets.length
        });
        setSelectedWalletId(firstWalletId);
        if (selectedAccountId) {
          walletSelectionsRef.current.set(selectedAccountId.toString(), firstWalletId);
        }
      }
      
      if (hasWallets || selectedAccountId === null) {
        setIsWalletLoading(false);
        setIsAccountSwitching(false);
      }
    }
  }, [accounts, selectedAccountId, wallets, selectedWalletId]);

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
    isLoading,
    error,
    selectedAccountId,
    setSelectedAccountId: handleAccountSelection,
    isAccountSwitching,
    selectedWalletId,
    setSelectedWalletId
  };
} 