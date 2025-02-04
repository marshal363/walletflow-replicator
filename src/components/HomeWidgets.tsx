import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, ArrowUpRight, ArrowDownLeft, CreditCard, QrCode, Lock } from 'lucide-react';
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { useUserAccountsAndWallets } from "@/hooks/useUserAccountsAndWallets";
import TransactionList from './widgets/TransactionList';
import SpendingTrendWidget from './widgets/SpendingTrendWidget';
import SuggestedActionsWidget from './widgets/SuggestedActionsWidget';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface HomeWidgetsProps {
  selectedWalletId: string;
  onWalletSelect: (id: string) => void;
}

export default function HomeWidgets({
  selectedWalletId: externalSelectedWalletId,
  onWalletSelect: externalOnWalletSelect,
}: HomeWidgetsProps) {
  const { user } = useUser();
  const {
    accounts,
    isLoading: accountsLoading,
    selectedAccountId,
    setSelectedAccountId,
    isAccountSwitching,
    selectedWalletId: internalSelectedWalletId,
    setSelectedWalletId
  } = useUserAccountsAndWallets(user?.id ?? "");

  // Track previous account for change detection
  const prevAccountIdRef = useRef<string | null>(null);
  const prevWalletsRef = useRef<Doc<"wallets">[] | null>(null);
  const accountChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const forceRefreshRef = useRef<number>(0);

  // Query wallets only when we have a selected account
  const wallets = useQuery(api.wallets.getWallets, 
    selectedAccountId ? { accountId: selectedAccountId } : "skip"
  );

  // Component mount/unmount logging
  useEffect(() => {
    console.log('🔵 HomeWidgets: Component Mounted', {
      userId: user?.id,
      hasAccounts: !!accounts?.length,
      initialAccountId: selectedAccountId?.toString() || 'none'
    });

    return () => {
      console.log('🔴 HomeWidgets: Component Unmounted', {
        lastAccountId: selectedAccountId?.toString() || 'none',
        lastWalletId: internalSelectedWalletId || 'none'
      });
    };
  }, []);

  // Force refresh when account changes
  useEffect(() => {
    if (!selectedAccountId) return;

    const currentAccountId = selectedAccountId.toString();
    const prevAccountId = prevAccountIdRef.current;

    if (currentAccountId !== prevAccountId) {
      console.log('🔄 Account Change Detected:', {
        from: prevAccountId || 'none',
        to: currentAccountId,
        forceRefreshCount: forceRefreshRef.current,
        timestamp: new Date().toISOString()
      });

      // Force a refresh by incrementing the ref
      forceRefreshRef.current += 1;
      
      // Clear any stale data
      setSelectedWalletId(null);
      prevWalletsRef.current = null;
    }

    prevAccountIdRef.current = currentAccountId;
  }, [selectedAccountId, setSelectedWalletId]);

  // Handle wallet data synchronization
  useEffect(() => {
    if (!selectedAccountId || !wallets?.length) return;

    const currentAccountId = selectedAccountId.toString();
    const currentAccount = accounts?.find(a => a._id === selectedAccountId);
    const currentWallet = wallets.find(w => w._id.toString() === internalSelectedWalletId);

    console.log('🔍 Wallet Data Check:', {
      accountId: currentAccountId,
      accountType: currentAccount?.type,
      currentWalletId: internalSelectedWalletId,
      walletExists: !!currentWallet,
      walletsCount: wallets.length,
      forceRefreshCount: forceRefreshRef.current,
      timestamp: new Date().toISOString()
    });

    // If no valid wallet is selected, select the first one
    if (!currentWallet) {
      const firstWalletId = wallets[0]._id.toString();
      console.log('🎯 Auto-selecting Wallet:', {
        reason: 'No valid wallet selected',
        accountId: currentAccountId,
        accountType: currentAccount?.type,
        newWalletId: firstWalletId,
        walletType: wallets[0].type,
        timestamp: new Date().toISOString()
      });

      setSelectedWalletId(firstWalletId);
      externalOnWalletSelect(firstWalletId);
    }
  }, [selectedAccountId, wallets, accounts, internalSelectedWalletId, setSelectedWalletId, externalOnWalletSelect, forceRefreshRef.current]);

  // Verify wallet belongs to current account
  useEffect(() => {
    if (!selectedAccountId || !wallets?.length || !internalSelectedWalletId) return;

    const currentWallet = wallets.find(w => w._id.toString() === internalSelectedWalletId);
    const currentAccount = accounts?.find(a => a._id === selectedAccountId);

    console.log('🔎 Wallet Verification:', {
      accountId: selectedAccountId.toString(),
      accountType: currentAccount?.type,
      walletId: internalSelectedWalletId,
      isValid: !!currentWallet,
      forceRefreshCount: forceRefreshRef.current,
      timestamp: new Date().toISOString()
    });

    if (!currentWallet) {
      console.log('⚠️ Invalid Wallet for Account:', {
        accountId: selectedAccountId.toString(),
        accountType: currentAccount?.type,
        invalidWalletId: internalSelectedWalletId,
        timestamp: new Date().toISOString()
      });

      setSelectedWalletId(wallets[0]._id.toString());
    }
  }, [selectedAccountId, wallets, accounts, internalSelectedWalletId, setSelectedWalletId]);

  // Debug log for component state and data
  useEffect(() => {
    const currentAccountId = selectedAccountId?.toString() || 'none';
    const prevAccountId = prevAccountIdRef.current || 'none';
    
    console.log('🏠 HomeWidgets Data:', {
      accountId: currentAccountId,
      prevAccountId,
      accountType: accounts?.find(a => a._id === selectedAccountId)?.type || 'unknown',
      walletsCount: wallets?.length || 0,
      externalSelectedWalletId,
      internalWalletId: internalSelectedWalletId,
      isLoading: accountsLoading,
      isAccountSwitching,
      walletsChanged: wallets !== prevWalletsRef.current
    });

    // Update refs for change detection
    prevAccountIdRef.current = currentAccountId;
    prevWalletsRef.current = wallets;
  }, [accounts, selectedAccountId, wallets, externalSelectedWalletId, internalSelectedWalletId, accountsLoading, isAccountSwitching]);
} 