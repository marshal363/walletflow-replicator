import { X, Users, Settings, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import AccountSwitcher from "@/components/AccountSwitcher";
import { Account } from "@/types/account";

interface ProfileModalProps {
  onClose: () => void;
  accounts: Account[];
  onAccountSelect: (accountId: string) => void;
  showCreateAccount: boolean;
  setShowCreateAccount: (show: boolean) => void;
}

export function ProfileModal({
  onClose,
  accounts,
  onAccountSelect,
  showCreateAccount,
  setShowCreateAccount,
}: ProfileModalProps) {
  return (
    <div className="fixed inset-0 bg-black/95 z-50">
      <motion.div 
        className="flex flex-col h-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
      >
        <div className="flex justify-between items-center p-4">
          <X
            className="h-6 w-6 cursor-pointer"
            onClick={onClose}
          />
          <button className="px-4 py-1.5 rounded-full bg-white/10 text-sm">
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
              <AccountSwitcher 
                accounts={accounts}
                onAccountSelect={onAccountSelect}
                onCreateAccount={() => setShowCreateAccount(true)}
              />

              <div className="mt-6 space-y-4">
                <button 
                  className="w-full p-4 rounded-lg bg-zinc-900 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                      <Users className="h-5 w-5" />
                    </div>
                    <span>Invite friends</span>
                  </div>
                </button>

                <button className="w-full p-4 rounded-lg bg-zinc-900 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                      <Settings className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p>Account</p>
                      <p className="text-sm text-red-500">Submit missing info</p>
                    </div>
                  </div>
                </button>

                <button className="w-full p-4 rounded-lg bg-zinc-900 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <span>Documents & statements</span>
                  </div>
                </button>
              </div>
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
                className="p-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
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
            className="w-full p-3 rounded-lg bg-zinc-800 outline-none"
            placeholder="Enter account name"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-zinc-400">Username</label>
          <input
            type="text"
            className="w-full p-3 rounded-lg bg-zinc-800 outline-none"
            placeholder="@username"
          />
        </div>
      </div>
    </motion.div>
  );
} 