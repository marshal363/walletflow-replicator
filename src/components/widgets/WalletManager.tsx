import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowUpRight, ArrowDownLeft, CreditCard, QrCode, Lock, Plus, ChevronLeft } from 'lucide-react';
import TransactionList from './TransactionList';
import SpendingTrendWidget from './SpendingTrendWidget';
import SuggestedActionsWidget from './SuggestedActionsWidget';
import { useInView } from 'react-intersection-observer';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem 
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import AddWalletDialog from '../wallet/AddWalletDialog';

interface Wallet {
  id: string;
  type: 'Lightning' | 'Multisig';
  name: string;
  balance: string;
  fiatBalance: string;
  color: string;
  accent: string;
  icon: string;
  hasCard: boolean;
  cardNumber?: string;
}

// Mock data - Replace with real data later
const mockTransactions = [
  { id: '1', name: "McDonald's", type: 'Apple Pay', amount: '-21,763', fiat: '-10.19', wallet: 'Spending', timestamp: '2024-01-20T10:30:00Z' },
  { id: '2', name: 'MAXI', type: 'Montréal, QC', amount: '-128,821', fiat: '-16.00', wallet: 'Spending', timestamp: '2024-01-20T09:15:00Z' },
  { id: '3', name: 'Starbucks', type: 'Apple Pay', amount: '-15,000', fiat: '-5.25', wallet: 'Spending', timestamp: '2024-01-20T08:45:00Z' },
  { id: '4', name: 'Amazon', type: 'Online Purchase', amount: '-250,000', fiat: '-87.50', wallet: 'Spending', timestamp: '2024-01-19T22:30:00Z' }
];

const quickActions = {
  Lightning: [
    { icon: Send, label: 'Send' },
    { icon: ArrowDownLeft, label: 'Receive' },
    { icon: CreditCard, label: 'Card' },
    { icon: QrCode, label: 'Scan' }
  ],
  Multisig: [
    { icon: ArrowUpRight, label: 'Deposit' },
    { icon: ArrowDownLeft, label: 'Withdraw' },
    { icon: Lock, label: 'Keys' },
    { icon: QrCode, label: 'Scan' }
  ]
};

interface WalletManagerProps {
  selectedWalletId: string;
  onWalletSelect: (id: string) => void;
}

type FlowStep = 'idle' | 'add-wallet';

export default function WalletManager({
  selectedWalletId,
  onWalletSelect,
}: WalletManagerProps) {
  const [flowStep, setFlowStep] = useState<FlowStep>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([
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
  ]);
  const [ref, inView] = useInView({
    threshold: 0.5,
    triggerOnce: false
  });

  const currentWallet = wallets.find(w => w.id === selectedWalletId);
  const currentActions = currentWallet ? quickActions[currentWallet.type] : [];

  const resetFlow = () => {
    setFlowStep('idle');
  };

  const handleWalletComplete = (type: 'Lightning' | 'Multisig', name: string, vaultKeys?: string[]) => {
    const newWallet: Wallet = {
      id: `wallet-${Date.now()}`,
      type,
      name,
      balance: '0',
      fiatBalance: '0.00',
      color: type === 'Lightning' ? 'bg-blue-600' : 'bg-orange-600',
      accent: type === 'Lightning' ? 'text-blue-500' : 'text-orange-500',
      icon: type === 'Lightning' ? '⚡️' : '🔒',
      hasCard: false
    };

    setWallets(prev => [...prev, newWallet]);
    setTimeout(() => onWalletSelect(newWallet.id), 300);
    setFlowStep('idle');
  };

  const loadMoreWidgets = () => {
    setIsLoading(true);
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
            <button 
              onClick={() => setFlowStep('add-wallet')}
              className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <Carousel 
            className="w-full"
            opts={{
              align: "start",
              loop: true
            }}
          >
            <CarouselContent className="-ml-4">
              <AnimatePresence>
                {wallets.map((wallet) => (
                  <CarouselItem key={wallet.id} className="pl-4 basis-[85%] md:basis-[85%]">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
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
                    </motion.div>
                  </CarouselItem>
                ))}
              </AnimatePresence>
              <CarouselItem className="pl-4 basis-[85%] md:basis-[85%]">
                <Card 
                  className="border-2 border-dashed border-zinc-800 rounded-xl bg-transparent cursor-pointer hover:border-zinc-700 transition-colors"
                  onClick={() => setFlowStep('add-wallet')}
                >
                  <CardContent className="p-6 h-48 flex items-center justify-center flex-col gap-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center">
                      <Plus className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Add a wallet</p>
                      <p className="text-sm text-zinc-500">It's free, and you can create as many as you like.</p>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            </CarouselContent>
            <div className="flex justify-center gap-2 mt-4">
              {[...wallets, { id: 'add' }].map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index === [...wallets, { id: 'add' }].findIndex(w => w.id === selectedWalletId)
                      ? 'w-4 bg-white'
                      : 'w-1.5 bg-zinc-600'
                  }`}
                />
              ))}
            </div>
          </Carousel>
        </div>

        {/* Quick Actions Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedWalletId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-4 gap-4 px-4"
          >
            {currentActions.map((action, index) => (
              <button key={index} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center">
                  <action.icon className={`h-5 w-5 ${currentWallet?.accent}`} />
                </div>
                <span className="text-xs">{action.label}</span>
              </button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Only keep the AddWalletDialog */}
      <AddWalletDialog
        isOpen={flowStep === 'add-wallet'}
        onClose={() => setFlowStep('idle')}
        onComplete={handleWalletComplete}
      />

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