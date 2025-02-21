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
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);

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

  const handleProfileClick = () => {
    setIsProfileExpanded(!isProfileExpanded);
  };

  const handleCopyProfileLink = () => {
    navigator.clipboard.writeText(`https://app.bitchat.com/@${displayUsername}`);
    // Add toast notification here
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50">
      <motion.div 
        className="flex flex-col h-full max-w-md mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-blue-500/10">
          <X
            className="h-6 w-6 cursor-pointer text-zinc-400 hover:text-blue-400 transition-colors"
            onClick={handleCloseClick}
          />
          <button 
            className="px-4 py-1.5 rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors text-sm font-medium"
            onClick={handleUpgradeClick}
          >
            Upgrade
          </button>
        </div>

        <AnimatePresence mode="wait">
          {!showCreateAccount ? (
            <motion.div 
              key="profile"
              className="flex-1 overflow-y-auto"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Expandable Profile Card */}
              <motion.div 
                className={`p-4 border-b border-blue-500/10 ${isProfileExpanded ? 'bg-blue-950/30' : ''}`}
                animate={{ 
                  height: isProfileExpanded ? 'auto' : '80px',
                  backgroundColor: isProfileExpanded ? 'rgba(23, 37, 84, 0.3)' : 'transparent'
                }}
                transition={{ duration: 0.2 }}
              >
                {/* Profile Header - Always Visible */}
                <motion.div 
                  className="flex items-center gap-4 cursor-pointer"
                  onClick={handleProfileClick}
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div 
                    className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center text-lg font-medium text-blue-400"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                  >
                    {displayInitials}
                  </motion.div>
                  <div className="flex-1">
                    <h2 className="text-lg font-medium">@{displayUsername}</h2>
                    <p className="text-sm text-zinc-400">Personal Account</p>
                  </div>
                  <motion.div
                    animate={{ rotate: isProfileExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <svg 
                      className="w-5 h-5 text-zinc-400" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M19 9l-7 7-7-7" 
                      />
                    </svg>
                  </motion.div>
                </motion.div>

                {/* Expandable Content */}
                <AnimatePresence>
                  {isProfileExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-4 space-y-4"
                    >
                      {/* QR Code and Profile Link */}
                      <div className="flex items-start gap-4">
                        <div className="w-32 h-32 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg p-3 backdrop-blur-sm">
                          <div className="w-full h-full border-2 border-blue-500/30 rounded-lg flex items-center justify-center">
                            <div className="w-16 h-16 bg-blue-500/20 rounded-lg animate-pulse" />
                          </div>
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div>
                            <p className="text-sm font-medium text-zinc-200 mb-1">Share Profile</p>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                readOnly
                                value={`https://app.bitchat.com/@${displayUsername}`}
                                className="flex-1 text-xs bg-blue-950/50 rounded-lg px-3 py-2 border border-blue-500/20"
                              />
                              <button 
                                onClick={handleCopyProfileLink}
                                className="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 transition-colors"
                              >
                                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Rest of the content */}
              <motion.div
                animate={{ 
                  y: isProfileExpanded ? 0 : -10,
                  opacity: isProfileExpanded ? 0.8 : 1
                }}
                transition={{ duration: 0.2 }}
              >
                {/* Account Switcher */}
                <div className="p-4">
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">Switch Account</h3>
                  <AccountSwitcher 
                    onCreateAccount={handleCreateAccountClick}
                    hideProfileInfo={true}
                  />
                </div>

                {/* Quick Actions */}
                <div className="p-4 space-y-2">
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">Quick Actions</h3>
                  <button 
                    className="w-full p-3 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 transition-colors flex items-center gap-3"
                    onClick={handleInviteFriendsClick}
                  >
                    <Users className="h-5 w-5 text-blue-400" />
                    <span className="text-sm">Invite friends</span>
                  </button>

                  <button 
                    className="w-full p-3 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 transition-colors flex items-center gap-3"
                    onClick={handleAccountSettingsClick}
                  >
                    <Settings className="h-5 w-5 text-blue-400" />
                    <div className="flex-1 text-left">
                      <p className="text-sm">Account Settings</p>
                      <p className="text-xs text-red-400">Submit missing info</p>
                    </div>
                  </button>

                  <button 
                    className="w-full p-3 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 transition-colors flex items-center gap-3"
                    onClick={handleDocumentsClick}
                  >
                    <MessageSquare className="h-5 w-5 text-blue-400" />
                    <span className="text-sm">Documents & statements</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <CreateAccountForm />
          )}
        </AnimatePresence>
      </motion.div>
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
      className="flex-1 overflow-y-auto"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="p-4 border-b border-blue-500/10">
        <h2 className="text-lg font-medium">Create New Account</h2>
        <p className="text-sm text-zinc-400">Choose your account type and details</p>
      </div>

      <div className="p-4 space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-medium text-zinc-400">Account Type</label>
          <div className="grid grid-cols-2 gap-3">
            {['Personal', 'Business'].map((type) => (
              <button
                key={type}
                className="p-3 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 transition-colors text-sm font-medium"
                onClick={() => handleAccountTypeSelect(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Account Name</label>
          <input
            type="text"
            className="w-full p-3 rounded-lg bg-blue-600/5 border border-blue-500/10 focus:border-blue-500/30 outline-none transition-colors text-sm"
            placeholder="Enter account name"
            onChange={handleNameChange}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Username</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">@</span>
            <input
              type="text"
              className="w-full p-3 pl-8 rounded-lg bg-blue-600/5 border border-blue-500/10 focus:border-blue-500/30 outline-none transition-colors text-sm"
              placeholder="username"
              onChange={handleUsernameChange}
            />
          </div>
        </div>

        <button
          className="w-full p-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Create Account
        </button>
      </div>
    </motion.div>
  );
} 