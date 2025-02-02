import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, ArrowUpRight, ArrowDownLeft, CreditCard, QrCode, Lock } from 'lucide-react';
import TransactionList from './TransactionList';
import SpendingTrendWidget from './SpendingTrendWidget';
import SuggestedActionsWidget from './SuggestedActionsWidget';
import { useInView } from 'react-intersection-observer';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from 'lucide-react';

// Mock data - Replace with real data later
const mockTransactions = [
  { id: '1', name: "McDonald's", type: 'Apple Pay', amount: '-21,763', fiat: '-10.19', wallet: 'Spending', timestamp: '2024-01-20T10:30:00Z' },
  { id: '2', name: 'MAXI', type: 'Montréal, QC', amount: '-128,821', fiat: '-16.00', wallet: 'Spending', timestamp: '2024-01-20T09:15:00Z' },
  { id: '3', name: 'Starbucks', type: 'Apple Pay', amount: '-15,000', fiat: '-5.25', wallet: 'Spending', timestamp: '2024-01-20T08:45:00Z' },
  { id: '4', name: 'Amazon', type: 'Online Purchase', amount: '-250,000', fiat: '-87.50', wallet: 'Spending', timestamp: '2024-01-19T22:30:00Z' }
];

const wallets = [
  {
    id: 'spending',
    type: 'Lightning',
    name: 'Spending',
    balance: '165,362',
    fiatBalance: '52.92',
    color: 'bg-purple-600',
    accent: 'text-purple-500',
    icon: '⚡️',
    hasCard: true,
    cardNumber: '0077'
  },
  {
    id: 'savings',
    type: 'Multisig',
    name: 'Savings',
    balance: '1,205,362',
    fiatBalance: '385.72',
    color: 'bg-orange-600',
    accent: 'text-orange-500',
    icon: '🔒',
    hasCard: false
  }
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
  ]
};

interface HomeWidgetsProps {
  selectedWalletId: string;
  onWalletSelect: (id: string) => void;
}

export default function HomeWidgets({
  selectedWalletId,
  onWalletSelect,
}: HomeWidgetsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [ref, inView] = useInView({
    threshold: 0.5,
    triggerOnce: false
  });

  const currentWallet = wallets.find(w => w.id === selectedWalletId);
  const currentActions = quickActions[selectedWalletId as keyof typeof quickActions] || [];

  const loadMoreWidgets = () => {
    setIsLoading(true);
    // Simulate loading more widgets
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  useEffect(() => {
    if (inView && !isLoading) {
      loadMoreWidgets();
    }
  }, [inView]);

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
            <h2 className="text-sm text-zinc-400">Your Wallets</h2>
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
              {wallets.map((wallet) => (
                <CarouselItem key={wallet.id} className="pl-4 basis-[85%] md:basis-[85%]">
                  <Card 
                    className={`border-0 ${wallet.color} rounded-xl`}
                    onClick={() => onWalletSelect(wallet.id)}
                  >
                    <CardContent className="p-6 h-48 relative">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs text-white/80">{wallet.type}</span>
                          <p className="font-medium text-white">{wallet.name}</p>
                        </div>
                        <span className="text-2xl">{wallet.icon}</span>
                      </div>
                      
                      <div className="absolute bottom-6 left-6">
                        <div className="space-y-1">
                          <p className="text-2xl font-bold text-white">
                            {wallet.balance} <span className="text-sm">sats</span>
                          </p>
                          <p className="text-sm text-white/80">${wallet.fiatBalance}</p>
                        </div>
                        {wallet.hasCard && (
                          <p className="text-xs mt-2 text-white/80">Card •••• {wallet.cardNumber}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-center gap-2 mt-4">
              {wallets.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index === wallets.findIndex(w => w.id === selectedWalletId)
                      ? 'w-4 bg-white'
                      : 'w-1.5 bg-zinc-600'
                  }`}
                />
              ))}
            </div>
          </Carousel>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-4 gap-4 px-4">
          {currentActions.map((action, index) => (
            <button key={index} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center">
                <action.icon className={`h-5 w-5 ${currentWallet?.accent}`} />
              </div>
              <span className="text-xs">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4"
      >
        <TransactionList
          transactions={mockTransactions}
          wallets={wallets}
          selectedWalletId={selectedWalletId}
          onWalletSelect={onWalletSelect}
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
          wallets={wallets}
          selectedWalletId={selectedWalletId}
          onWalletSelect={onWalletSelect}
        />
      </motion.div>

      {/* BoltCards Active Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-4 bg-zinc-900 rounded-lg mx-4"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Active BoltCards</h3>
          <span className="text-sm text-zinc-400">3 Cards</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((card) => (
            <div key={card} className="p-4 bg-zinc-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-lg"></div>
                <div>
                  <p className="font-medium">Card {card}</p>
                  <p className="text-sm text-zinc-500">Last used 2h ago</p>
                </div>
              </div>
              <div className="text-right">
                <p>Active</p>
                <p className="text-sm text-zinc-500">Limit: 50k sats</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Loading indicator */}
      <div ref={ref} className="flex justify-center py-4">
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-6 h-6 border-2 border-zinc-500 border-t-white rounded-full animate-spin"
          />
        )}
      </div>
    </div>
  );
} 
