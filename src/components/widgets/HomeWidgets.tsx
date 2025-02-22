import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, ArrowUpRight, ArrowDownLeft, CreditCard, QrCode, Lock, Plus, MoreVertical, Zap } from 'lucide-react';
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
    { icon: Send, label: 'Send', description: 'Send funds to another wallet' },
    { icon: ArrowDownLeft, label: 'Receive', description: 'Receive funds from others' },
    { icon: CreditCard, label: 'Card', description: 'Manage your card settings' },
    { icon: QrCode, label: 'Scan', description: 'Scan QR code to pay' }
  ],
  savings: [
    { icon: ArrowUpRight, label: 'Deposit', description: 'Add funds to savings' },
    { icon: ArrowDownLeft, label: 'Withdraw', description: 'Withdraw from savings' },
    { icon: Lock, label: 'Keys', description: 'Manage security keys' },
    { icon: QrCode, label: 'Scan', description: 'Scan QR code to pay' }
  ],
  multisig: [
    { icon: ArrowUpRight, label: 'Deposit', description: 'Add funds to multisig' },
    { icon: ArrowDownLeft, label: 'Withdraw', description: 'Withdraw from multisig' },
    { icon: Lock, label: 'Keys', description: 'Manage multisig keys' },
    { icon: QrCode, label: 'Scan', description: 'Scan QR code to pay' }
  ]
};

const walletColors = {
  spending: {
    color: 'bg-[#8B5CF6]',
    accent: 'text-[#A78BFA]',
    icon: '💳'
  },
  savings: {
    color: 'bg-[#F97316]',
    accent: 'text-[#FB923C]',
    icon: '🏦'
  },
  multisig: {
    color: 'bg-[#3B82F6]',
    accent: 'text-[#60A5FA]',
    icon: '🔐'
  }
};

interface HomeWidgetsProps {
  selectedWalletId: string;
  onWalletSelect: (id: string) => void;
  isLoading?: boolean;
}

export default function HomeWidgets({
  selectedWalletId: externalSelectedWalletId,
  onWalletSelect: externalOnWalletSelect,
  isLoading: externalIsLoading = false,
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

  // Enhanced empty state component
  const TransactionEmptyState: React.FC<{ onDeposit: () => void }> = ({ onDeposit }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex flex-col items-center justify-center py-8 px-4 text-center"
  >
    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        📊
      </motion.div>
    </div>
    <h3 className="text-lg font-medium mb-2">No Activity Yet</h3>
    <p className="text-sm text-zinc-500 mb-4">Start by making your first transaction</p>
    <Button 
      variant="outline"
      className="gap-2"
      onClick={onDeposit}
    >
      <ArrowUpRight className="h-4 w-4" />
      Make First Deposit
    </Button>
  </motion.div>
);

// Enhanced quick action button component
interface QuickActionProps {
  action: {
    icon: React.FC<{ className?: string }>;
    label: string;
    description: string;
  };
  walletType: keyof typeof walletColors;
  onClick: () => void;
}

const QuickActionButton: React.FC<QuickActionProps> = ({ action, walletType, onClick }) => (
  <button 
    className="flex flex-col items-center justify-center gap-1 relative"
    onClick={onClick}
    aria-label={action.label}
  >
    <div className="w-[52px] h-[52px] bg-zinc-900 rounded-[14px] flex items-center justify-center">
      <action.icon className={`h-[22px] w-[22px] ${walletColors[walletType].accent}`} />
    </div>
    <span className="text-[13px] text-zinc-300">{action.label}</span>
  </button>
);

// Helper functions
const formatLastTransaction = (date: string): string => {
  const txDate = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return txDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatBalance = (balance: number, currency: string): { sats: string, btc: string } => {
  if (balance === 0) return { sats: '0', btc: '0.00000000' };
  return {
    sats: balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "),
    btc: (balance / 100000000).toFixed(8)
  };
};

  return (
    <div className="space-y-7">
      {/* Suggested Actions Widget */}
      <div className="pt-2 pb-1">
        <h2 className="text-lg text-zinc-400 px-4 mb-3">Suggested Actions</h2>
        <SuggestedActionsWidget onActionClick={handleActionClick} />
      </div>

      {/* Wallet Section */}
      <div className="space-y-6">
        {/* Wallet Header */}
        <div className="px-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg text-zinc-400">Personal Wallets</h2>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
                onClick={handleAddWallet}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Wallet Cards */}
        <div className="px-4">
          <Carousel className="w-full">
            <CarouselContent>
              {wallets.map((wallet) => {
                const balanceDisplay = formatBalance(wallet.balance || 0, wallet.currency);
                return (
                  <CarouselItem key={wallet._id.toString()} className="basis-[85%] sm:basis-[45%] md:basis-[35%]">
                    <WalletCard
                      type={wallet.type}
                      name={wallet.name}
                      balance={balanceDisplay}
                      lastTransaction={formatLastTransaction(wallet.lastUpdated)}
                      onClick={() => handleWalletSelect(wallet._id.toString())}
                    />
                  </CarouselItem>
                );
              })}
              <CarouselItem className="basis-[85%] sm:basis-[45%] md:basis-[35%]">
                <WalletCard
                  type="add"
                  onClick={() => handleAddWallet()}
                />
              </CarouselItem>
            </CarouselContent>
          </Carousel>
        </div>

        {/* Quick Actions */}
        {currentWallet && (
          <div className="px-4">
            <div className="flex justify-between items-center">
              {currentActions.map((action, index) => (
                <QuickActionButton
                  key={index}
                  action={action}
                  walletType={currentWallet.type}
                  onClick={() => handleActionClick(action.label.toLowerCase())}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="px-4 pt-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg">Recent Activity</h2>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                  <Zap className="w-3 h-3 text-black" />
                </div>
                <span className="text-sm text-zinc-400">Lightning Wallet</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-sm text-zinc-400">
              View All
            </Button>
          </div>
          <TransactionList
            wallets={formattedWallets}
            selectedWalletId={internalSelectedWalletId}
            onWalletSelect={handleWalletSelect}
            onViewAll={() => navigate('/transactions')}
          />
        </div>
      </div>
    </div>
  );
} 
