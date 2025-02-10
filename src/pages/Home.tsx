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
    <div className="min-h-screen">
      <main className="pb-20">
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between px-4">
            <div 
              className="flex items-center space-x-2 cursor-pointer"
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
                    <p className="font-medium">{selectedAccount.name}</p>
                    <p className="text-sm text-muted-foreground">
                      @{selectedAccount.identitySettings?.username || 'username'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-muted-foreground">No Account Selected</p>
                    <p className="text-sm text-muted-foreground">Click to set up</p>
                  </>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <Search className="h-5 w-5" />
            </Button>
          </div>

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