import React, { useRef, useEffect } from 'react';
import { Check, Plus, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useUserAccountsAndWallets } from "../hooks/useUserAccountsAndWallets";
import { Id } from "../../convex/_generated/dataModel";

interface Account {
  _id: Id<"accounts">;
  userId: Id<"users">;
  type: "personal" | "business";
  name: string;
  status: "active" | "inactive" | "suspended";
  identitySettings?: {
    username: string;
    domain: string;
    customDomain?: string;
    prefix?: string;
    suffix?: string;
  };
  businessDetails?: {
    companyName: string;
    registrationNumber: string;
    type: string;
  };
  wallets: {
    _id: Id<"wallets">;
    accountId: Id<"accounts">;
    type: "spending" | "savings" | "multisig";
    name: string;
    balance: number;
    currency: string;
    lastUpdated: string;
    networkIdentities: {
      type: "spending";
      lightning: string;
      nostr: string;
    } | {
      type: "savings";
      bitcoinAddress: string;
      derivationPath: string;
    } | {
      type: "multisig";
      addresses: {
        address: string;
        signers: {
          pubKey: string;
          weight: number;
        }[];
        requiredSignatures: number;
      }[];
      scriptType: "p2sh" | "p2wsh" | "p2tr";
    };
  }[];
}

// Utility function for formatting currency
function formatCurrency(amount: number, currency: string): string {
  if (currency.toLowerCase() === 'sats') {
    return `${amount.toLocaleString()} sats`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(amount);
}

interface AccountSwitcherProps {
  onCreateAccount?: () => void;
  hideProfileInfo?: boolean;
}

function AccountSwitcher({ onCreateAccount, hideProfileInfo = false }: AccountSwitcherProps) {
  const {
    accounts,
    isLoading,
    error,
    selectedAccountId,
    setSelectedAccountId,
  } = useUserAccountsAndWallets();

  // Track account switch timing
  const switchStartTimeRef = useRef<number | null>(null);
  const previousSelectionRef = useRef<string | null>(null);

  useEffect(() => {
    console.log('🔀 AccountSwitcher Mount:', {
      event: 'Component Mount',
      hasAccounts: !!accounts?.length,
      selectedAccountId: selectedAccountId?.toString() || 'none',
      isLoading,
      timestamp: new Date().toISOString()
    });

    return () => {
      console.log('🔀 AccountSwitcher Unmount:', {
        event: 'Component Unmount',
        finalAccountId: selectedAccountId?.toString() || 'none',
        switchInProgress: !!switchStartTimeRef.current,
        timestamp: new Date().toISOString()
      });
    };
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      const currentId = selectedAccountId.toString();
      const prevId = previousSelectionRef.current;

      if (prevId && prevId !== currentId) {
        const switchDuration = switchStartTimeRef.current ? 
          Date.now() - switchStartTimeRef.current : 
          null;

        console.log('🔀 AccountSwitcher State:', {
          event: 'Switch Complete',
          from: prevId,
          to: currentId,
          duration: switchDuration,
          timestamp: new Date().toISOString()
        });

        // Reset switch timing
        switchStartTimeRef.current = null;
      }

      previousSelectionRef.current = currentId;
    }
  }, [selectedAccountId]);

  const selectedAccount = accounts?.find(
    (account) => account._id === selectedAccountId
  );

  // Log current account state
  useEffect(() => {
    if (selectedAccount) {
      console.log('🔀 AccountSwitcher State:', {
        event: 'Current Account',
        id: selectedAccount._id.toString(),
        type: selectedAccount.type,
        walletsCount: selectedAccount.wallets?.length || 0,
        hasIdentity: !!selectedAccount.identitySettings,
        timestamp: new Date().toISOString()
      });
    }
  }, [selectedAccount]);

  if (isLoading) {
    console.log('🔀 AccountSwitcher State:', {
      event: 'Loading',
      timestamp: new Date().toISOString()
    });
    return <div>Loading accounts...</div>;
  }

  if (error) {
    console.log('🔀 AccountSwitcher Error:', {
      event: 'Error State',
      error: error.message,
      timestamp: new Date().toISOString()
    });
    return <div>Error: {error.message}</div>;
  }

  const handleAccountChange = (value: string) => {
    // Start timing the switch
    switchStartTimeRef.current = Date.now();

    console.log('🔀 AccountSwitcher Action:', {
      event: 'Switch Initiated',
      from: selectedAccountId?.toString() || 'none',
      to: value,
      timestamp: new Date().toISOString()
    });

    setSelectedAccountId(value as Id<"accounts">);
  };

  const sortedAccounts = [...accounts].sort((a, b) => {
    if (a._id === selectedAccountId) return -1;
    if (b._id === selectedAccountId) return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <LayoutGroup>
        {sortedAccounts.map((account, index) => (
          <motion.div
            key={account._id.toString()}
            layout
            className="relative"
            initial={false}
          >
            {index === 0 && !hideProfileInfo && (
              <motion.div
                layout
                className="flex flex-col items-center mb-6"
                initial={false}
              >
                <motion.div
                  className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center text-2xl mb-2"
                  layoutId={`avatar-${account._id}`}
                >
                  {account.name.split(' ').map(n => n[0]).join('')}
                </motion.div>
                <motion.h2
                  className="text-2xl font-bold text-center"
                  layoutId={`name-${account._id}`}
                >
                  {account.name}
                </motion.h2>
              </motion.div>
            )}

            <motion.button
              layout
              onClick={() => handleAccountChange(account._id.toString())}
              className={`w-full p-4 rounded-lg ${
                account._id === selectedAccountId ? 'bg-[#0066FF]' : 'bg-black/40 backdrop-blur-md border border-[#0066FF]/20'
              } relative overflow-hidden group hover:bg-[#0066FF]/10 transition-colors`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{
                layout: { type: "spring", bounce: 0.2, duration: 0.6 }
              }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-[#0066FF]/20 via-[#0066FF]/10 to-[#0066FF]/20"
                initial={false}
                animate={{
                  opacity: account._id === selectedAccountId ? 1 : 0,
                  scaleX: account._id === selectedAccountId ? 1 : 0
                }}
                transition={{
                  type: "spring",
                  bounce: 0.2,
                  duration: 0.4
                }}
                style={{ originX: 0 }}
              />

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{
                      rotate: account._id === selectedAccountId ? 0 : 180,
                      scale: account._id === selectedAccountId ? 1 : 0.9
                    }}
                    transition={{
                      type: "spring",
                      bounce: 0.3,
                      duration: 0.4
                    }}
                  >
                    {account._id === selectedAccountId ? (
                      <Check className="h-5 w-5 text-white" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-zinc-400 group-hover:text-white transition-colors" />
                    )}
                  </motion.div>
                  <div className="flex flex-col">
                    <motion.span
                      className="font-medium"
                      layout
                    >
                      {account.type === 'personal' ? 'Personal' : 'Business'}
                    </motion.span>
                  </div>
                </div>
              </div>
            </motion.button>
          </motion.div>
        ))}

        {onCreateAccount && (
          <motion.button
            layout
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onCreateAccount}
            className="w-full p-4 rounded-lg bg-zinc-800/50 border border-zinc-700 border-dashed 
                     hover:bg-zinc-800 transition-all duration-300 mt-4"
            transition={{
              layout: { type: "spring", bounce: 0.2, duration: 0.6 }
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <Plus className="h-5 w-5 text-zinc-400" />
              <span className="text-zinc-400">Create New Account</span>
            </div>
          </motion.button>
        )}
      </LayoutGroup>
    </div>
  );
}

// Export both named and default
export { AccountSwitcher };
export default AccountSwitcher;