import { 
  X, Users, Settings, MessageSquare, ChevronDown, Copy, 
  QrCode, Crown, ExternalLink, Share2, Wallet, Bell,
  Shield, CreditCard, Zap, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import AccountSwitcher from "@/components/AccountSwitcher";
import { useUserAccountsAndWallets } from "@/hooks/useUserAccountsAndWallets";
import { useEffect, useRef, useState } from 'react';
import { Id } from "../../convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Add new state
  const [activeTab, setActiveTab] = useState<'accounts' | 'security' | 'payments'>('accounts');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showQRView, setShowQRView] = useState(false);

  // Profile card variants for animation
  const profileCardVariants = {
    collapsed: {
      height: "80px",
      backgroundColor: "rgba(0, 0, 0, 0)",
    },
    expanded: {
      height: "auto",
      backgroundColor: "rgba(23, 37, 84, 0.3)",
    }
  };

  // Modal backdrop variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  // Modal content variants
  const contentVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    exit: { 
      opacity: 0, 
      y: 20, 
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  // Add new animation variants
  const tabVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  };

  const statsData = [
    { label: 'Total Balance', value: '$1,234.56', icon: Wallet, trend: '+12.3%' },
    { label: 'Active Wallets', value: '3', icon: CreditCard },
    { label: 'Pending Requests', value: '5', icon: Bell, highlight: true }
  ];

  const quickLinks = [
    { label: 'Security', icon: Shield, badge: 'New' },
    { label: 'Payments', icon: CreditCard },
    { label: 'Activity', icon: Zap }
  ];

  // Log component lifecycle and state changes
  useEffect(() => {
    // Set body attribute to hide navbar icons
    document.body.setAttribute('data-modal-open', 'true');
    
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
      // Remove body attribute when modal is closed
      document.body.removeAttribute('data-modal-open');
      
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

  const handleCopyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://app.bitchat.com/@${displayUsername}`);
      setCopiedToClipboard(true);
      toast.success("Profile link copied to clipboard");
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (error) {
      toast.error("Failed to copy profile link");
    }
  };

  return (
    <TooltipProvider>
      <motion.div 
        className="fixed inset-0 bg-[#000000] z-[100]"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        <LayoutGroup>
          <motion.div 
            className="flex flex-col h-full max-w-md mx-auto"
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <motion.div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 hover:bg-[#1a1b1e]/40 rounded-full transition-colors"
                  onClick={onClose}
                >
                  <X className="h-5 w-5 text-white/80" />
                </motion.button>
                
              </div>
              <motion.button 
                className="px-4 py-2 rounded-full bg-[#0066FF] text-white text-sm font-medium flex items-center gap-2 shadow-[0_0_20px_rgba(0,102,255,0.25)]"
                whileHover={{ scale: 1.02, backgroundColor: '#0052CC' }}
                whileTap={{ scale: 0.98 }}
              >
                <Crown className="h-4 w-4" />
                Upgrade to Pro
                <ArrowUpRight className="h-4 w-4" />
              </motion.button>
            </motion.div>

            {/* Main Content */}
            <AnimatePresence mode="wait">
              {!showCreateAccount ? (
                <motion.div 
                  key="profile"
                  className="flex-1 overflow-y-auto"
                  variants={tabVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {/* Profile Section */}
                  <div className="px-4 mt-4 space-y-6">
                    {/* User Info + Share Profile Combined */}
                    <div className="bg-[#1a1b1e]/60 backdrop-blur-sm rounded-xl p-4 border border-white/[0.08]">
                      <div className="flex flex-col items-center text-center mb-6">
                        <motion.div 
                          className="w-16 h-16 bg-[#0066FF] rounded-full flex items-center justify-center text-2xl font-semibold text-white mb-3"
                          whileHover={{ scale: 1.05 }}
                        >
                          {displayInitials}
                        </motion.div>
                        <div className="space-y-1">
                          <h2 className="text-lg font-medium text-white">@{displayUsername}</h2>
                          <div className="flex items-center justify-center gap-2 text-sm">
                            
                          </div>
                        
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Public Key</span>
                          <motion.button
                            className="flex items-center gap-1 text-[#0066FF] text-sm"
                            whileHover={{ scale: 1.05 }}
                          >
                            <Share2 className="h-4 w-4" />
                            Share
                          </motion.button>
                        </div>

                        <div className="flex justify-center">
                          <div className="bg-white rounded-xl p-4">
                            <QrCode className="w-48 h-48 text-[#0066FF]" />
                          </div>
                        </div>

                        <div>
                          <span className="text-xs font-medium text-white/50 block mb-2">LIGHTNING ADDRESS</span>
                          <div className="flex items-center gap-2 bg-[#1a1b1e]/60 rounded-xl p-2.5">
                            <input
                              type="text"
                              readOnly
                              value="npub10aegv5czq...kajgg3n7e0"
                              className="flex-1 bg-transparent text-white/70 text-sm font-medium border-none outline-none px-2"
                            />
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <motion.button
                                    onClick={handleCopyProfileLink}
                                    className="p-2 rounded-lg hover:bg-white/5"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Copy className={`w-4 h-4 ${copiedToClipboard ? 'text-[#00ff00]' : 'text-[#0066FF]'}`} />
                                  </motion.button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{copiedToClipboard ? 'Copied!' : 'Copy address'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Account Switcher */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-white/70">Your Accounts</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/50">2 of 5 accounts</span>
                          <Badge variant="outline" className="text-xs bg-[#1a1b1e]/60 text-[#0066FF] border-[#0066FF]/20">Pro</Badge>
                        </div>
                      </div>
                      <AccountSwitcher 
                        onCreateAccount={() => setShowCreateAccount(true)}
                        hideProfileInfo={true}
                      />
                    </div>

                    {/* Stats Grid - Moved to bottom */}
                    <div className="px-4 py-3 grid grid-cols-3 gap-2">
                      <div className="bg-[#1a1b1e]/60 backdrop-blur-sm rounded-xl p-3 border border-white/[0.08]">
                        <div className="flex items-center gap-2 mb-1">
                          <Wallet className="h-4 w-4 text-[#0066FF]" />
                          <span className="text-xs text-white/50">Total Balance</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-semibold text-white">$1,234.56</span>
                          <span className="text-xs text-[#00ff00]">+12.3%</span>
                        </div>
                      </div>
                      <div className="bg-[#1a1b1e]/60 backdrop-blur-sm rounded-xl p-3 border border-white/[0.08]">
                        <div className="flex items-center gap-2 mb-1">
                          <CreditCard className="h-4 w-4 text-[#0066FF]" />
                          <span className="text-xs text-white/50">Active Wallets</span>
                        </div>
                        <span className="text-lg font-semibold text-white">3</span>
                      </div>
                      <div className="bg-[#1a1b1e]/60 backdrop-blur-sm rounded-xl p-3 border border-white/[0.08]">
                        <div className="flex items-center gap-2 mb-1">
                          <Bell className="h-4 w-4 text-[#0066FF]" />
                          <span className="text-xs text-white/50">Pending Requests</span>
                        </div>
                        <span className="text-lg font-semibold text-white">5</span>
                      </div>
                    </div>

                    {/* Quick Actions - Moved to bottom */}
                    <div className="px-4 py-2 grid grid-cols-3 gap-2">
                      {quickLinks.map((link, index) => (
                        <motion.button
                          key={link.label}
                          className="flex-1 bg-[#1a1b1e]/60 backdrop-blur-sm rounded-xl p-3 flex flex-col items-center gap-2 relative group border border-white/[0.08]"
                          whileHover={{ scale: 1.02, backgroundColor: 'rgba(26,27,30,0.8)' }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <link.icon className="h-5 w-5 text-[#0066FF]" />
                          <span className="text-sm text-white/70">{link.label}</span>
                          {link.badge && (
                            <span className="absolute -top-1.5 -right-1.5 bg-[#0066FF] text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                              {link.badge}
                            </span>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <CreateAccountForm />
              )}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      </motion.div>
    </TooltipProvider>
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