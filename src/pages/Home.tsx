import React, { useState, useEffect } from "react";
import { Search } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { ProfileModal } from "@/components/profile/ProfileModal";
import HomeWidgets from "@/components/widgets/HomeWidgets";
import { Navigation } from "@/components/layout/Navigation";
import { useUserAccountsAndWallets, useAccountStore } from "@/hooks/useUserAccountsAndWallets";
import { AnimatePresence, motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

// Modal states as an enum for better type safety
enum ModalState {
  CLOSED,
  PROFILE,
  CREATE_ACCOUNT
}

export default function Home() {
  const [selectedWallet, setSelectedWallet] = useState(() => {
    // Persist wallet selection
    return localStorage.getItem('selectedWallet') || 'spending';
  });
  const [modalState, setModalState] = useState<ModalState>(ModalState.CLOSED);
  
  // Connect to global state
  const { currentAccountId } = useAccountStore();
  const {
    accounts,
    isLoading,
    selectedAccountId,
    isAccountSwitching,
    error
  } = useUserAccountsAndWallets();

  // Persist wallet selection
  useEffect(() => {
    localStorage.setItem('selectedWallet', selectedWallet);
  }, [selectedWallet]);

  const selectedAccount = accounts?.find(account => account._id === currentAccountId);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-black/90 to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 bg-black/40 backdrop-blur-md">
            <button
              className="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-zinc-800/30 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              onClick={() => setModalState(ModalState.PROFILE)}
              aria-label="Open profile settings"
              role="button"
            >
              <UserButton />
              {isLoading || isAccountSwitching ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 bg-zinc-800" />
                  <Skeleton className="h-3 w-24 bg-zinc-800" />
                </div>
              ) : selectedAccount ? (
                <div className="text-left">
                  <p className="font-semibold text-white">{selectedAccount.name}</p>
                  <p className="text-sm text-zinc-400">
                    @{selectedAccount.identitySettings?.username || 'username'}
                  </p>
                </div>
              ) : (
                <div className="text-left">
                  <p className="font-semibold text-zinc-400">Get Started</p>
                  <p className="text-sm text-zinc-500">Click to create an account</p>
                </div>
              )}
            </button>
            
            <Button 
              variant="ghost" 
              size="icon"
              className="hover:bg-zinc-800/50 active:bg-zinc-800/70 transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <main className="pb-20">
        {error ? (
          <div className="p-4 text-center text-red-400">
            <p>Failed to load account data. Please try again.</p>
            <Button 
              variant="outline"
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <HomeWidgets
              selectedWalletId={selectedWallet}
              onWalletSelect={setSelectedWallet}
              isLoading={isLoading}
            />
          </div>
        )}

        <AnimatePresence>
          {modalState !== ModalState.CLOSED && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ProfileModal
                onClose={() => setModalState(ModalState.CLOSED)}
                showCreateAccount={modalState === ModalState.CREATE_ACCOUNT}
                setShowCreateAccount={(show) => 
                  setModalState(show ? ModalState.CREATE_ACCOUNT : ModalState.PROFILE)
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Navigation />
    </div>
  );
}