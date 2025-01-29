import React, { useState } from 'react';
import { Check, Plus, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

interface Account {
  id: string;
  type: 'PERSONAL' | 'JOINT';
  balance: number;
  isSelected: boolean;
  name: string;
  username: string;
}

interface AccountSwitcherProps {
  accounts: Account[];
  onAccountSelect: (accountId: string) => void;
  onCreateAccount: () => void;
}

const AccountSwitcher: React.FC<AccountSwitcherProps> = ({ 
  accounts, 
  onAccountSelect,
  onCreateAccount 
}) => {
  const sortedAccounts = [...accounts].sort((a, b) => {
    if (a.isSelected === b.isSelected) return 0;
    return a.isSelected ? -1 : 1;
  });

  return (
    <div className="space-y-4">
      <LayoutGroup>
        {sortedAccounts.map((account, index) => (
          <motion.div
            key={account.id}
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
                  layoutId={`avatar-${account.id}`}
                >
                  {account.name.split(' ').map(n => n[0]).join('')}
                </motion.div>
                <motion.h2 
                  className="text-2xl font-bold text-center"
                  layoutId={`name-${account.id}`}
                >
                  {account.name}
                </motion.h2>
                <motion.p 
                  className="text-zinc-400"
                  layoutId={`username-${account.id}`}
                >
                  {account.username}
                </motion.p>
              </motion.div>
            )}

            <motion.button
              layout
              onClick={() => onAccountSelect(account.id)}
              className={`w-full p-4 rounded-lg ${
                account.isSelected ? 'bg-purple-600' : 'bg-zinc-800'
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
                  opacity: account.isSelected ? 1 : 0,
                  scaleX: account.isSelected ? 1 : 0
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
                      rotate: account.isSelected ? 0 : 180,
                      scale: account.isSelected ? 1 : 0.9
                    }}
                    transition={{
                      type: "spring",
                      bounce: 0.3,
                      duration: 0.4
                    }}
                  >
                    {account.isSelected ? (
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
                      {account.type === 'PERSONAL' ? 'PERSONAL' : 'BUSINESS'}
                    </motion.span>
                    {!account.isSelected && (
                      <motion.span
                        className="text-sm text-zinc-400"
                        layout
                      >
                        {account.username}
                      </motion.span>
                    )}
                  </div>
                </div>
                <motion.div 
                  className="text-right"
                  layout
                >
                  <p className="text-sm text-zinc-400">Account balance</p>
                  <p className="font-medium">${account.balance.toFixed(2)}</p>
                </motion.div>
              </div>
            </motion.button>
          </motion.div>
        ))}

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
      </LayoutGroup>
    </div>
  );
};

export default AccountSwitcher;