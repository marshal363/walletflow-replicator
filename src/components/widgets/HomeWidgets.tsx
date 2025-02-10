import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, ArrowUpRight, ArrowDownLeft, CreditCard, QrCode, Lock, Plus, MoreVertical } from 'lucide-react';
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
import { WalletCard } from "@/components/ui/WalletCard";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

// Mock data - Replace with real data later
// const mockTransactions = [ ... ];

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
  const navigate = useNavigate();
  
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

  // Query wallets only when we have a selected account
  const wallets = useQuery(api.wallets.getWallets, 
    currentAccountId ? { accountId: currentAccountId } : "skip"
  );

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

  // Reset selected wallet when account changes
  useEffect(() => {
    if (currentAccountId && wallets?.length > 0) {
      const defaultWallet = wallets[0];
      console.log('🔄 HomeWidgets Reset:', {
        event: 'Account Switch Reset',
        newAccountId: currentAccountId.toString(),
        defaultWalletId: defaultWallet._id.toString(),
        timestamp: new Date().toISOString()
      });
      setSelectedWalletId(defaultWallet._id.toString());
      externalOnWalletSelect(defaultWallet._id.toString());
    }
  }, [currentAccountId, wallets, setSelectedWalletId, externalOnWalletSelect]);

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

  const handleAddWallet = () => {
    console.log('🎯 Add Wallet:', {
      event: 'Add Wallet Button Clicked',
      currentAccountId: currentAccountId?.toString(),
      selectedAccountId: selectedAccountId?.toString(),
      timestamp: new Date().toISOString()
    });

    try {
      navigate('/add-wallet');
      console.log('✅ Navigation successful:', {
        event: 'Navigation',
        path: '/add-wallet',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Navigation failed:', {
        event: 'Navigation Error',
        error,
        timestamp: new Date().toISOString()
      });
    }
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
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
                onClick={handleAddWallet}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => console.log('Sort by name')}>
                    Sort by Name
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => console.log('Sort by balance')}>
                    Sort by Balance
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => console.log('Hide zero balances')}>
                    Hide Zero Balances
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <Carousel className="w-full">
            <CarouselContent>
              {wallets.map((wallet) => (
                <CarouselItem key={wallet._id.toString()} className="basis-[85%] sm:basis-[45%] md:basis-[35%]">
                  <WalletCard
                    type={wallet.type}
                    name={wallet.name}
                    balance={formatCurrency(wallet.balance || 0, wallet.currency)}
                    lastTransaction={new Date(wallet.lastUpdated).toLocaleDateString()}
                    onClick={() => handleWalletSelect(wallet._id.toString())}
                  />
                </CarouselItem>
              ))}
              <CarouselItem className="basis-[85%] sm:basis-[45%] md:basis-[35%]">
                <WalletCard
                  type="add"
                  onClick={handleAddWallet}
                />
              </CarouselItem>
            </CarouselContent>
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
