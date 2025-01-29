import React, { useState } from "react";
import { Home as HomeIcon, Wallet, Zap, Bell, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/ui/avatar";
import { Search, MessageSquare, Settings, ArrowUpRight, ArrowDownLeft, CreditCard, QrCode, Send, Lock, Users, X } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import AccountSwitcher from "@/components/AccountSwitcher";
import { motion, AnimatePresence } from "framer-motion";
import HomeWidgets from "@/components/widgets/HomeWidgets";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

interface Account {
  id: string;
  type: 'PERSONAL' | 'JOINT';
  balance: number;
  isSelected: boolean;
  name: string;
  username: string;
}

const Home = () => {
  const navigate = useNavigate();
  const [selectedWallet, setSelectedWallet] = useState('spending');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  
  const [accounts, setAccounts] = useState<Account[]>([
    {
      id: 'personal',
      type: 'PERSONAL' as const,
      balance: 219.59,
      isSelected: true,
      name: 'Sergio Andres Ardila Ardila',
      username: '@dominusmendacium'
    },
    {
      id: 'business',
      type: 'JOINT' as const,
      balance: 693.75,
      isSelected: false,
      name: 'Business Account',
      username: '@businessname'
    }
  ]);

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
  const selectedAccount = accounts.find(account => account.isSelected);

  const handleAccountSelect = (accountId: string) => {
    setAccounts(accounts.map(account => ({
      ...account,
      isSelected: account.id === accountId
    })));
    setShowCreateAccount(false);
  };

  const handleCreateAccount = () => {
    setShowCreateAccount(true);
  };

  const ProfileModal = () => (
    <div className="fixed inset-0 bg-black/95 z-50">
      <motion.div 
        className="flex flex-col h-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
      >
        <div className="flex justify-between items-center p-4">
          <X
            className="h-6 w-6 cursor-pointer"
            onClick={() => {
              setShowProfileModal(false);
              setShowCreateAccount(false);
            }}
          />
          <button className="px-4 py-1.5 rounded-full bg-white/10 text-sm">
            Upgrade
          </button>
        </div>

        <AnimatePresence mode="wait">
          {!showCreateAccount ? (
            <motion.div 
              key="profile"
              className="p-4 flex-1 overflow-y-auto"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <AccountSwitcher 
                accounts={accounts}
                onAccountSelect={handleAccountSelect}
                onCreateAccount={handleCreateAccount}
              />

              <div className="mt-6 space-y-4">
                <button 
                  className="w-full p-4 rounded-lg bg-zinc-900 text-left"
                  onClick={() => {
                    // Handle invite friends
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                      <Users className="h-5 w-5" />
                    </div>
                    <span>Invite friends</span>
                  </div>
                </button>

                <button className="w-full p-4 rounded-lg bg-zinc-900 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                      <Settings className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p>Account</p>
                      <p className="text-sm text-red-500">Submit missing info</p>
                    </div>
                  </div>
                </button>

                <button className="w-full p-4 rounded-lg bg-zinc-900 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <span>Documents & statements</span>
                  </div>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="create-account"
              className="p-4 flex-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold mb-6">Create New Account</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Account Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Personal', 'Business'].map((type) => (
                      <button
                        key={type}
                        className="p-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Account Name</label>
                  <input
                    type="text"
                    className="w-full p-3 rounded-lg bg-zinc-800 outline-none"
                    placeholder="Enter account name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Username</label>
                  <input
                    type="text"
                    className="w-full p-3 rounded-lg bg-zinc-800 outline-none"
                    placeholder="@username"
                  />
                </div>

                <button className="w-full p-4 rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors mt-6">
                  Create Account
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <SignedOut>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-4xl font-bold mb-8">Welcome to WalletFlow</h1>
          <p className="text-lg text-gray-400 mb-8 text-center">
            Sign in to access your wallets and manage your transactions
          </p>
          <SignInButton mode="modal">
            <Button variant="default" size="lg">
              Sign In
            </Button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="flex flex-col h-screen">
          <header className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3" onClick={() => setShowProfileModal(true)}>
              <UserButton />
              <div>
                <p className="font-medium">{selectedAccount?.name}</p>
                <p className="text-sm text-zinc-400">{selectedAccount?.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Bell className="h-6 w-6" />
              <Mail className="h-6 w-6" onClick={() => navigate('/messages')} />
            </div>
          </header>

          {/* Widgets Section */}
          <div className="flex-1 overflow-y-auto">
            <HomeWidgets
              wallets={wallets}
              selectedWalletId={selectedWallet}
              onWalletSelect={setSelectedWallet}
              quickActions={quickActions}
              currentWallet={currentWallet}
            />
          </div>

          {/* Bottom Navigation Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-black pb-6 pt-2 px-8 border-t border-gray-800">
            <div className="flex justify-between items-center w-full max-w-md mx-auto relative">
              <div className="flex justify-between w-full">
                <button className="flex flex-col items-center text-white w-12">
                  <HomeIcon className="h-6 w-6" />
                </button>
                <button 
                  onClick={() => navigate("/wallet")}
                  className="flex flex-col items-center text-gray-500 w-12"
                >
                  <Wallet className="h-6 w-6" />
                </button>
                <div className="w-12"></div> {/* Spacer for center button */}
                <button className="flex flex-col items-center text-gray-500 w-12">
                  <Mail className="h-6 w-6" />
                </button>
                <button className="flex flex-col items-center text-gray-500 w-12">
                  <Bell className="h-6 w-6" />
                </button>
              </div>
              
              {/* Center prominent button */}
              <button 
                onClick={() => navigate("/lightning")}
                className="absolute left-1/2 -translate-x-1/2 -translate-y-6 h-14 w-14 rounded-full bg-white flex items-center justify-center"
              >
                <Zap className="h-7 w-7 text-black" />
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showProfileModal && <ProfileModal />}
        </AnimatePresence>
      </SignedIn>
    </div>
  );
};

export default Home;