import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, ArrowUpRight, ArrowDownLeft, CreditCard, QrCode, Lock } from 'lucide-react';
import TransactionList from './TransactionList';
import SpendingTrendWidget from './SpendingTrendWidget';
import SuggestedActionsWidget from './SuggestedActionsWidget';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { Id } from "../../../convex/_generated/dataModel";
import { useUserAccountsAndWallets, useAccountStore } from "../../hooks/useUserAccountsAndWallets";
import { formatCurrency } from "@/lib/utils";

// Mock data - Replace with real data later
const mockTransactions = [
  { id: '1', name: "McDonald's", type: 'Apple Pay', amount: '-21,763', fiat: '-10.19', wallet: 'Spending', timestamp: '2024-01-20T10:30:00Z' },
  { id: '2', name: 'MAXI', type: 'Montréal, QC', amount: '-128,821', fiat: '-16.00', wallet: 'Spending', timestamp: '2024-01-20T09:15:00Z' },
  { id: '3', name: 'Starbucks', type: 'Apple Pay', amount: '-15,000', fiat: '-5.25', wallet: 'Spending', timestamp: '2024-01-20T08:45:00Z' },
  { id: '4', name: 'Amazon', type: 'Online Purchase', amount: '-250,000', fiat: '-87.50', wallet: 'Spending', timestamp: '2024-01-19T22:30:00Z' }
];

const quickActions = {
  spending: [
    { icon: Send, label: 'Send' },
    { icon: ArrowDownLeft, label: 'Receive' },
    { icon: CreditCard, label: 'Card' },
    { icon: QrCode, label: 'Scan' }
  ],
  savings: [
    { icon: ArrowUpRight, label: 'Deposit' },
    { icon: ArrowDownLeft, label: 'Withdraw' },
    { icon: Lock, label: 'Keys' },
    { icon: QrCode, label: 'Scan' }
  ],
  multisig: [
    { icon: ArrowUpRight, label: 'Deposit' },
    { icon: ArrowDownLeft, label: 'Withdraw' },
    { icon: Lock, label: 'Keys' },
    { icon: QrCode, label: 'Scan' }
  ]
};

const walletColors = {
  spending: {
    color: 'bg-purple-600',
    accent: 'text-purple-500',
    icon: '💳'
  },
  savings: {
    color: 'bg-orange-600',
    accent: 'text-orange-500',
    icon: '🏦'
  },
  multisig: {
    color: 'bg-blue-600',
    accent: 'text-blue-500',
    icon: '🔐'
  }
};

interface HomeWidgetsProps {
  selectedWalletId: string;
  onWalletSelect: (id: string) => void;
}

export default function HomeWidgets({
  selectedWalletId: externalSelectedWalletId,
  onWalletSelect: externalOnWalletSelect,
}: HomeWidgetsProps) {
  const { user } = useUser();
  
  // Connect to global state
  const { 
    currentAccountId,
    isAccountSwitching: globalIsAccountSwitching
  } = useAccountStore();

  const {
    accounts,
    isLoading: accountsLoading,
    selectedAccountId,
    setSelectedAccountId,
    isAccountSwitching,
    selectedWalletId: internalSelectedWalletId,
    setSelectedWalletId
  } = useUserAccountsAndWallets();

  // Track state synchronization
  useEffect(() => {
    console.log('🏠 HomeWidgets Sync:', {
      event: 'State Comparison',
      globalAccountId: currentAccountId?.toString() || 'none',
      localAccountId: selectedAccountId?.toString() || 'none',
      globalSwitching: globalIsAccountSwitching,
      localSwitching: isAccountSwitching,
      timestamp: new Date().toISOString()
    });
  }, [currentAccountId, selectedAccountId, globalIsAccountSwitching, isAccountSwitching]);

  // Query wallets only when we have a selected account
  const wallets = useQuery(api.wallets.getWallets, 
    currentAccountId ? { accountId: currentAccountId } : "skip"
  );

  // Debug log for component state and data
  useEffect(() => {
    console.log('🏠 HomeWidgets Data:', {
      event: 'Data Update',
      globalAccountId: currentAccountId?.toString() || 'none',
      localAccountId: selectedAccountId?.toString() || 'none',
      accountType: accounts?.find(a => a._id === currentAccountId)?.type || 'unknown',
      walletsCount: wallets?.length || 0,
      externalSelectedWalletId,
      internalWalletId: internalSelectedWalletId,
      isLoading: accountsLoading,
      isAccountSwitching: globalIsAccountSwitching,
      timestamp: new Date().toISOString()
    });
  }, [accounts, currentAccountId, selectedAccountId, wallets, externalSelectedWalletId, internalSelectedWalletId, accountsLoading, globalIsAccountSwitching]);

  // Sync internal and external wallet selection
  useEffect(() => {
    if (internalSelectedWalletId && internalSelectedWalletId !== externalSelectedWalletId) {
      console.log('🔄 HomeWidgets Sync:', {
        event: 'Wallet Selection Sync',
        from: externalSelectedWalletId,
        to: internalSelectedWalletId,
        accountId: currentAccountId?.toString() || 'none',
        timestamp: new Date().toISOString()
      });
      externalOnWalletSelect(internalSelectedWalletId);
    }
  }, [internalSelectedWalletId, externalSelectedWalletId, externalOnWalletSelect, currentAccountId]);

  // Handle wallet selection
  const handleWalletSelect = useCallback((id: string) => {
    if (id === internalSelectedWalletId) return;
    
    const selectedWallet = wallets?.find(w => w._id.toString() === id);
    console.log('🎯 HomeWidgets Selection:', {
      event: 'Wallet Selection',
      current: internalSelectedWalletId,
      new: id,
      walletType: selectedWallet?.type || 'unknown',
      accountId: currentAccountId?.toString() || 'none',
      timestamp: new Date().toISOString()
    });
    
    setSelectedWalletId(id);
    externalOnWalletSelect(id);
  }, [setSelectedWalletId, externalOnWalletSelect, internalSelectedWalletId, wallets, currentAccountId]);

  // Format wallets for UI components with proper memoization
  const formattedWallets = React.useMemo(() => {
    const formatted = wallets?.map(wallet => ({
      id: wallet._id.toString(),
      name: wallet.name,
      icon: walletColors[wallet.type].icon,
      color: walletColors[wallet.type].color.replace('bg-', '')
    })) ?? [];
    
    console.log('💅 HomeWidgets Format:', {
      event: 'Wallet Formatting',
      count: formatted.length,
      wallets: formatted.map(w => ({ id: w.id, name: w.name })),
      accountId: currentAccountId?.toString() || 'none',
      timestamp: new Date().toISOString()
    });
    
    return formatted;
  }, [wallets, currentAccountId]);

  // Show loading states with proper conditions
  const isLoading = accountsLoading || 
    (globalIsAccountSwitching && !wallets) || // Only show loading if switching AND no wallets
    (currentAccountId && !wallets && !accountsLoading); // Show loading when waiting for wallets

  if (isLoading) {
    console.log('⏳ HomeWidgets Loading:', {
      event: 'Loading State',
      accountsLoading,
      globalSwitching: globalIsAccountSwitching,
      hasSelectedAccount: !!currentAccountId,
      hasWallets: !!wallets,
      accountId: currentAccountId?.toString() || 'none',
      timestamp: new Date().toISOString()
    });
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-6 h-6 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Add early return for missing account/wallets with proper logging
  if (!accounts?.length) {
    console.log('⚠️ HomeWidgets State:', {
      event: 'No Accounts',
      accountsLoading,
      globalSwitching: globalIsAccountSwitching,
      timestamp: new Date().toISOString()
    });
    return null;
  }

  const selectedAccount = accounts?.find(account => account._id === selectedAccountId);
  if (!selectedAccount || !wallets) {
    console.log('⚠️ HomeWidgets State:', {
      event: 'Invalid State',
      hasSelectedAccount: !!selectedAccount,
      hasWallets: !!wallets,
      selectedAccountId: selectedAccountId?.toString() || 'none',
      accountType: selectedAccount?.type || 'unknown',
      timestamp: new Date().toISOString()
    });
    return null;
  }

  const currentWallet = wallets.find(w => w._id.toString() === internalSelectedWalletId);
  console.log('🎯 Current Wallet:', {
    walletId: currentWallet?._id.toString() || 'none',
    type: currentWallet?.type || 'none',
    name: currentWallet?.name || 'none',
    accountId: selectedAccountId.toString(),
    accountType: selectedAccount.type
  });

  const currentActions = currentWallet ? quickActions[currentWallet.type] : [];

  const handleActionClick = (actionId: string) => {
    // Handle action clicks here
    console.log('Action clicked:', actionId);
  };

  return (
    <div className="space-y-6">
      {/* Suggested Actions Widget */}
      <div className="pt-2 pb-1">
        <SuggestedActionsWidget onActionClick={handleActionClick} />
      </div>

      {/* Wallet Section */}
      <div className="space-y-4">
        {/* Wallet Carousel */}
        <div className="px-4">
          <div className="pb-2 flex items-center justify-between">
            <h2 className="text-sm text-zinc-400">
              {selectedAccount.type === 'personal' ? 'Personal' : 'Business'} Wallets
            </h2>
            <button className="text-sm text-pink-500">See All</button>
          </div>
          <Carousel
            className="w-full"
            opts={{
              align: "start",
              loop: true
            }}
          >
            <CarouselContent className="-ml-4">
              {wallets?.map((wallet) => {
                const walletStyle = walletColors[wallet.type];
                return (
                  <CarouselItem key={wallet._id.toString()} className="pl-4 basis-[85%] md:basis-[85%]">
                    <Card 
                      className={`border-0 ${walletStyle.color} rounded-xl`}
                      onClick={() => handleWalletSelect(wallet._id.toString())}
                    >
                      <CardContent className="p-6 h-48 relative">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs text-white/80">{wallet.type.charAt(0).toUpperCase() + wallet.type.slice(1)}</span>
                            <p className="font-medium text-white">{wallet.name}</p>
                          </div>
                          <span className="text-2xl">{walletStyle.icon}</span>
                        </div>
                        
                        <div className="absolute bottom-6 left-6">
                          <div className="space-y-1">
                            <p className="text-2xl font-bold text-white">
                              {formatCurrency(wallet.balance, wallet.currency)}
                            </p>
                            <p className="text-sm text-white/80">
                              Last updated: {new Date(wallet.lastUpdated).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <div className="flex justify-center gap-2 mt-4">
              {wallets?.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index === wallets.findIndex(w => w._id.toString() === internalSelectedWalletId)
                      ? 'w-4 bg-white'
                      : 'w-1.5 bg-zinc-600'
                  }`}
                />
              ))}
            </div>
          </Carousel>
        </div>

        {/* Quick Actions Grid */}
        {currentWallet && (
          <div className="grid grid-cols-4 gap-4 px-4">
            {currentActions.map((action, index) => (
              <button key={index} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center">
                  <action.icon className={`h-5 w-5 ${walletColors[currentWallet.type].accent}`} />
                </div>
                <span className="text-xs">{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4"
      >
        <TransactionList
          transactions={mockTransactions}
          wallets={formattedWallets}
          selectedWalletId={internalSelectedWalletId}
          onWalletSelect={handleWalletSelect}
          onViewAll={() => {/* Handle view all */}}
        />
      </motion.div>

      {/* Spending Trends Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-4 bg-zinc-900 rounded-lg mx-4"
      >
        <SpendingTrendWidget
          wallets={formattedWallets}
          selectedWalletId={internalSelectedWalletId}
          onWalletSelect={handleWalletSelect}
        />
      </motion.div>

      {/* Replace the old loading indicator with a simpler one */}
      {accountsLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center py-4"
        >
          <div className="w-6 h-6 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
        </motion.div>
      )}
    </div>
  );
} 
