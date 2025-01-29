import React, { useState } from 'react';
import {
  Search,
  Bell,
  Wallet,
  MessageSquare,
  Zap,
  Settings,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  QrCode,
  Send,
  Repeat,
  Lock,
  Users
} from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";

const WalletHomeScreen = () => {
  const [selectedWallet, setSelectedWallet] = useState('spending');
  
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
    },
    {
      id: 'joint',
      type: 'Shared',
      name: 'Family',
      balance: '340,000',
      fiatBalance: '108.80',
      color: 'bg-blue-600',
      accent: 'text-blue-500',
      icon: '👥',
      hasCard: false
    },
    {
      id: 'inheritance',
      type: 'Timelock',
      name: 'Inheritance',
      balance: '2,500,000',
      fiatBalance: '800.00',
      color: 'bg-green-600',
      accent: 'text-green-500',
      icon: '⏰',
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
    ],
    joint: [
      { icon: Send, label: 'Send' },
      { icon: Users, label: 'Members' },
      { icon: Lock, label: 'Policies' },
      { icon: QrCode, label: 'Scan' }
    ],
    inheritance: [
      { icon: ArrowUpRight, label: 'Deposit' },
      { icon: Users, label: 'Heirs' },
      { icon: Lock, label: 'Timelock' },
      { icon: Settings, label: 'Setup' }
    ]
  };

  const currentWallet = wallets.find(w => w.id === selectedWallet);
  const currentActions = quickActions[selectedWallet];

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="w-10 h-10 bg-zinc-800 rounded-full" />
        <div className="flex-1 mx-4">
          <div className="bg-zinc-900 rounded-full px-4 py-2 flex items-center">
            <Search className="h-4 w-4 text-zinc-400 mr-2" />
            <input 
              className="bg-transparent w-full outline-none text-sm"
              placeholder="Search transactions"
            />
          </div>
        </div>
        <Bell className="h-6 w-6" />
      </div>

      {/* Wallet Carousel */}
      <div className="px-4 py-2">
        <div className="pb-2 flex items-center justify-between">
          <h2 className="text-sm text-zinc-400">Your Wallets</h2>
          <button className="text-sm text-pink-500">See All</button>
        </div>
        <Carousel className="w-full" onSelect={(index) => setSelectedWallet(wallets[index].id)}>
          <CarouselContent>
            {wallets.map(wallet => (
              <CarouselItem key={wallet.id}>
                <Card 
                  className={`border-0 ${wallet.color} rounded-xl`}
                  onClick={() => setSelectedWallet(wallet.id)}
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
          <CarouselPrevious className="left-2 bg-zinc-800 border-0 text-white hover:bg-zinc-700" />
          <CarouselNext className="right-2 bg-zinc-800 border-0 text-white hover:bg-zinc-700" />
        </Carousel>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-4 gap-4 px-4 py-6">
        {currentActions.map((action, index) => (
          <button key={index} className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center">
              <action.icon className={`h-5 w-5 ${currentWallet?.accent}`} />
            </div>
            <span className="text-xs">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="flex-1 px-4">
        <div className="flex justify-between items-center py-4">
          <span className="font-medium">Recent Activity</span>
          <button className="text-sm text-pink-500">Filter</button>
        </div>
        <div className="space-y-4">
          {[
            { name: "McDonald's", type: 'Apple Pay', amount: '-21,763', fiat: '-10.19', wallet: 'Spending' },
            { name: 'MAXI', type: 'Montréal, QC', amount: '-128,821', fiat: '-16.00', wallet: 'Spending' }
          ].map((tx, i) => (
            <div key={i} className="flex items-center justify-between bg-zinc-900 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                  {tx.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{tx.name}</p>
                  <p className="text-sm text-zinc-500">{tx.type}</p>
                </div>
              </div>
              <div className="text-right">
                <p>{tx.amount} sats</p>
                <p className="text-sm text-zinc-500">${tx.fiat}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-zinc-800">
        <div className="flex items-center justify-around p-4">
          <button className="text-pink-500">
            <Wallet className="h-6 w-6" />
          </button>

          <button className="text-zinc-500">
            <MessageSquare className="h-6 w-6" />
          </button>

          <button className="bg-pink-500 p-4 rounded-full -mt-8">
            <Zap className="h-6 w-6" />
          </button>

          <button className="text-zinc-500">
            <Bell className="h-6 w-6" />
          </button>

          <button className="text-zinc-500">
            <Settings className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletHomeScreen;