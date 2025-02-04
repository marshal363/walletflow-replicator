import React from 'react';
import { Check, Plus, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useUserAccountsAndWallets } from "../hooks/useUserAccountsAndWallets";
import { useUser } from "@clerk/clerk-react";
import { Id } from "../../convex/_generated/dataModel";

interface Account {
  _id: Id<"accounts">;
  type: "personal" | "business";
  name: string;
  status: "active" | "inactive" | "suspended";
  identitySettings?: {
    username: string;
  };
  businessDetails?: {
    companyName: string;
  };
  wallets: {
    _id: Id<"wallets">;
    type: "spending" | "savings" | "multisig";
    name: string;
    balance: number;
    currency: string;
    lastUpdated: string;
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
}

function AccountSwitcher({ onCreateAccount }: AccountSwitcherProps) {
  const { user } = useUser();
  const {
    accounts,
    isLoading,
    error,
    selectedAccountId,
    setSelectedAccountId,
  } = useUserAccountsAndWallets(user?.id ?? "");

  if (isLoading) {
    return <div>Loading accounts...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  const selectedAccount = accounts.find(
    (account) => account._id === selectedAccountId
  );

  const handleAccountChange = (value: string) => {
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
            {index === 0 && (
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
                {account.identitySettings && (
                  <motion.p 
                    className="text-zinc-400"
                    layoutId={`username-${account._id}`}
                  >
                    @{account.identitySettings.username}
                  </motion.p>
                )}
              </motion.div>
            )}

            <motion.button
              layout
              onClick={() => handleAccountChange(account._id.toString())}
              className={`w-full p-4 rounded-lg ${
                account._id === selectedAccountId ? 'bg-purple-600' : 'bg-zinc-800'
              } relative overflow-hidden group`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{
                layout: { type: "spring", bounce: 0.2, duration: 0.6 }
              }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-purple-400/10 to-purple-600/20"
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
                    {account.businessDetails && (
                      <motion.span
                        className="text-sm text-zinc-400"
                        layout
                      >
                        {account.businessDetails.companyName}
                      </motion.span>
                    )}
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