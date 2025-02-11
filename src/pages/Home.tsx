import React, { useState, useEffect } from "react";
import { Search } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { ProfileModal } from "@/components/profile/ProfileModal";
import HomeWidgets from "@/components/widgets/HomeWidgets";
import { Navigation } from "@/components/layout/Navigation";
import { useUserAccountsAndWallets, useAccountStore } from "@/hooks/useUserAccountsAndWallets";

export default function Home() {
  const [selectedWallet, setSelectedWallet] = useState('spending');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  
  // Connect to global state
  const { currentAccountId } = useAccountStore();
  const {
    accounts,
    isLoading,
    selectedAccountId,
    isAccountSwitching
  } = useUserAccountsAndWallets();

  // Track header updates
  useEffect(() => {
    console.log('🏠 Home Header:', {
      event: 'State Update',
      globalAccountId: currentAccountId?.toString() || 'none',
      localAccountId: selectedAccountId?.toString() || 'none',
      hasAccounts: !!accounts?.length,
      isLoading,
      isAccountSwitching,
      timestamp: new Date().toISOString()
    });
  }, [currentAccountId, selectedAccountId, accounts, isLoading, isAccountSwitching]);

  const selectedAccount = accounts?.find(account => account._id === currentAccountId);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-black/90 to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 bg-black/40 backdrop-blur-md">
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setShowProfileModal(true)}
            >
              <UserButton />
              <div>
                {isLoading || isAccountSwitching ? (
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-zinc-800 animate-pulse rounded"></div>
                    <div className="h-3 w-24 bg-zinc-800 animate-pulse rounded"></div>
                  </div>
                ) : selectedAccount ? (
                  <>
                    <p className="font-semibold text-white">{selectedAccount.name}</p>
                    <p className="text-sm text-zinc-400">
                      @{selectedAccount.identitySettings?.username || 'username'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-zinc-400">No Account Selected</p>
                    <p className="text-sm text-zinc-500">Click to set up</p>
                  </>
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="hover:bg-zinc-800/50 transition-colors"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <main className="pb-20">
        <div className="space-y-6 py-4">
          <HomeWidgets
            selectedWalletId={selectedWallet}
            onWalletSelect={setSelectedWallet}
          />
        </div>

        {showProfileModal && (
          <ProfileModal
            onClose={() => {
              setShowProfileModal(false);
              setShowCreateAccount(false);
            }}
            showCreateAccount={showCreateAccount}
            setShowCreateAccount={setShowCreateAccount}
          />
        )}
      </main>
      <Navigation />
    </div>
  );
}