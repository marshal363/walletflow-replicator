import { X, Users, Settings, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import AccountSwitcher from "@/components/AccountSwitcher";
import { useUserAccountsAndWallets } from "@/hooks/useUserAccountsAndWallets";
import { useEffect, useRef, useState } from 'react';
import { Id } from "../../convex/_generated/dataModel";

interface ProfileModalProps {
  onClose: () => void;
  showCreateAccount: boolean;
  setShowCreateAccount: (show: boolean) => void;
}

export function ProfileModal({
  onClose,
  showCreateAccount,
  setShowCreateAccount,
}: ProfileModalProps) {
  const { 
    accounts, 
    isLoading, 
    selectedAccountId, 
    setSelectedAccountId,
    isAccountSwitching 
  } = useUserAccountsAndWallets();

  // State for UI updates
  const [displayUsername, setDisplayUsername] = useState<string>('username');
  const [displayInitials, setDisplayInitials] = useState<string>('');
  const previousAccountIdRef = useRef<string | null>(null);
  const mountTimeRef = useRef<number>(Date.now());

  // Log component lifecycle and state changes
  useEffect(() => {
    console.log('🎭 ProfileModal Lifecycle:', {
      event: 'Mount',
      mountTime: new Date(mountTimeRef.current).toISOString(),
      showCreateAccount,
      hasAccounts: !!accounts?.length,
      selectedAccountId: selectedAccountId?.toString() || 'none',
      isLoading,
      isAccountSwitching,
      displayUsername,
      displayInitials
    });

    return () => {
      console.log('🎭 ProfileModal Lifecycle:', {
        event: 'Unmount',
        mountDuration: Date.now() - mountTimeRef.current,
        finalAccountId: selectedAccountId?.toString() || 'none',
        isAccountSwitching
      });
    };
  }, []);

  // Effect to update display info when accounts or selectedAccountId changes
  useEffect(() => {
    if (!accounts || !selectedAccountId) {
      console.log('⚠️ ProfileModal State:', {
        event: 'Missing Data',
        hasAccounts: !!accounts,
        selectedAccountId: selectedAccountId?.toString() || 'none',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const selectedAccount = accounts.find(account => account._id === selectedAccountId);
    if (!selectedAccount) {
      console.log('⚠️ ProfileModal State:', {
        event: 'Account Not Found',
        searchedId: selectedAccountId.toString(),
        availableAccounts: accounts.map(a => a._id.toString()),
        timestamp: new Date().toISOString()
      });
      return;
    }

    const username = selectedAccount.identitySettings?.username || 'username';
    const initials = username.slice(0, 2).toUpperCase();

    console.log('👤 ProfileModal State Update:', {
      event: 'Profile Info Change',
      accountId: selectedAccountId.toString(),
      previousAccountId: previousAccountIdRef.current,
      username,
      initials,
      accountType: selectedAccount.type,
      walletsCount: selectedAccount.wallets?.length || 0,
      timestamp: new Date().toISOString()
    });

    setDisplayUsername(username);
    setDisplayInitials(initials);

    // Log account switch without auto-closing
    if (previousAccountIdRef.current && 
        previousAccountIdRef.current !== selectedAccountId.toString()) {
      console.log('🔄 ProfileModal Account Switch:', {
        event: 'Switch Detected',
        from: previousAccountIdRef.current,
        to: selectedAccountId.toString(),
        timestamp: new Date().toISOString()
      });
    }

    previousAccountIdRef.current = selectedAccountId.toString();
  }, [accounts, selectedAccountId]);

  const handleCloseClick = () => {
    console.log('❌ Close Button Clicked');
    onClose();
  };

  const handleUpgradeClick = () => {
    console.log('⭐ Upgrade Button Clicked');
    // Add upgrade logic here
  };

  const handleCreateAccountClick = () => {
    console.log('➕ Create Account Button Clicked');
    setShowCreateAccount(true);
  };

  const handleInviteFriendsClick = () => {
    console.log('👥 Invite Friends Button Clicked');
    // Add invite friends logic here
  };

  const handleAccountSettingsClick = () => {
    console.log('⚙️ Account Settings Button Clicked');
    // Add account settings logic here
  };

  const handleDocumentsClick = () => {
    console.log('📄 Documents Button Clicked');
    // Add documents logic here
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50">
      <motion.div 
        className="flex flex-col h-full profile-modal-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        style={{
          transition: 'opacity 0.3s ease-out'
        }}
      >
        <div className="flex justify-between items-center p-4">
          <X
            className="h-6 w-6 cursor-pointer hover:text-blue-400 transition-colors"
            onClick={handleCloseClick}
          />
          <button 
            className="px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors text-sm"
            onClick={handleUpgradeClick}
          >
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
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <>
                  {/* QR Code with User Info */}
                  <motion.div 
                    key={`profile-${selectedAccountId}`}
                    className="flex flex-col items-center mb-8"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="relative w-48 h-48 mb-4">
                      {/* QR Code Background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg p-4">
                        <div className="w-full h-full border-2 border-blue-500/30 rounded-lg"></div>
                      </div>
                      {/* Center User Photo */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div 
                          key={`avatar-${displayUsername}`}
                          className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-xl"
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", bounce: 0.5 }}
                        >
                          {displayInitials}
                        </motion.div>
                      </div>
                    </div>
                    {/* Username Display */}
                    <motion.h2 
                      key={`username-${displayUsername}`}
                      className="text-2xl font-bold mb-1"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      @{displayUsername}
                    </motion.h2>
                    <p className="text-zinc-400 text-sm mb-6">Scan to add as contact</p>
                  </motion.div>

                  <AccountSwitcher 
                    onCreateAccount={handleCreateAccountClick}
                    hideProfileInfo={true}
                  />

                  <div className="mt-6 space-y-4">
                    <button 
                      className="w-full p-4 rounded-lg bg-black/40 backdrop-blur-md border border-blue-500/20 hover:bg-blue-600/10 transition-colors text-left"
                      onClick={handleInviteFriendsClick}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-400" />
                        </div>
                        <span>Invite friends</span>
                      </div>
                    </button>

                    <button 
                      className="w-full p-4 rounded-lg bg-black/40 backdrop-blur-md border border-blue-500/20 hover:bg-blue-600/10 transition-colors text-left"
                      onClick={handleAccountSettingsClick}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                          <Settings className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p>Account</p>
                          <p className="text-sm text-red-500">Submit missing info</p>
                        </div>
                      </div>
                    </button>

                    <button 
                      className="w-full p-4 rounded-lg bg-black/40 backdrop-blur-md border border-blue-500/20 hover:bg-blue-600/10 transition-colors text-left"
                      onClick={handleDocumentsClick}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                          <MessageSquare className="h-5 w-5 text-blue-400" />
                        </div>
                        <span>Documents & statements</span>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <CreateAccountForm />
          )}
        </AnimatePresence>
      </motion.div>
      <style>
        {`
          .profile-modal-content.fade-out {
            opacity: 0;
          }
        `}
      </style>
    </div>
  );
}

function CreateAccountForm() {
  useEffect(() => {
    console.log('📝 CreateAccountForm Mounted');
    return () => {
      console.log('📝 CreateAccountForm Unmounted');
    };
  }, []);

  const handleAccountTypeSelect = (type: string) => {
    console.log('📋 Account Type Selected:', { type });
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('✏️ Account Name Changed:', {
      value: event.target.value
    });
  };

  const handleUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('✏️ Username Changed:', {
      value: event.target.value
    });
  };

  return (
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
                className="p-4 rounded-lg bg-black/40 backdrop-blur-md border border-blue-500/20 hover:bg-blue-600/10 transition-colors"
                onClick={() => handleAccountTypeSelect(type)}
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
            className="w-full p-3 rounded-lg bg-black/40 backdrop-blur-md border border-blue-500/20 focus:border-blue-500 outline-none transition-colors"
            placeholder="Enter account name"
            onChange={handleNameChange}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-zinc-400">Username</label>
          <input
            type="text"
            className="w-full p-3 rounded-lg bg-black/40 backdrop-blur-md border border-blue-500/20 focus:border-blue-500 outline-none transition-colors"
            placeholder="@username"
            onChange={handleUsernameChange}
          />
        </div>
      </div>
    </motion.div>
  );
} 