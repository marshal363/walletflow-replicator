import React, { useState } from "react";
import { Search } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { Account } from "@/types/account";
import HomeWidgets from "@/components/widgets/HomeWidgets";
import { Navigation } from "@/components/layout/Navigation";

export default function Home() {
  const [selectedWallet, setSelectedWallet] = useState('spending');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  
  const [accounts, setAccounts] = useState<Account[]>([
    {
      id: 'personal',
      type: 'PERSONAL',
      balance: 219.59,
      isSelected: true,
      name: 'Sergio Andres Ardila Ardila',
      username: '@dominusmendacium'
    },
    {
      id: 'business',
      type: 'JOINT',
      balance: 693.75,
      isSelected: false,
      name: 'Business Account',
      username: '@businessname'
    }
  ]);

  const handleAccountSelect = (accountId: string) => {
    setAccounts(accounts.map(account => ({
      ...account,
      isSelected: account.id === accountId
    })));
    setShowCreateAccount(false);
  };

  const selectedAccount = accounts.find(account => account.isSelected);

  return (
    <div className="min-h-screen">
      <main className="pb-20">
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => setShowProfileModal(true)}
            >
              <UserButton />
              <div>
                <p className="font-medium">{selectedAccount?.name}</p>
                <p className="text-sm text-muted-foreground">{selectedAccount?.username}</p>
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
            accounts={accounts}
            onAccountSelect={handleAccountSelect}
            showCreateAccount={showCreateAccount}
            setShowCreateAccount={setShowCreateAccount}
          />
        )}
      </main>
      <Navigation />
    </div>
  );
}