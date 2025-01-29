import React from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Wallet {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface WalletSelectorProps {
  wallets: Wallet[];
  selectedWalletId: string;
  onWalletSelect: (walletId: string) => void;
}

const WalletSelector: React.FC<WalletSelectorProps> = ({
  wallets,
  selectedWalletId,
  onWalletSelect
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const selectedWallet = wallets.find(w => w.id === selectedWalletId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        <span className="text-xl">{selectedWallet?.icon}</span>
        <span>{selectedWallet?.name}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-48 rounded-lg bg-zinc-800 shadow-lg py-1 z-10"
          >
            {wallets.map((wallet) => (
              <button
                key={wallet.id}
                className={`w-full px-4 py-2 text-left flex items-center gap-2 ${
                  wallet.id === selectedWalletId
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:bg-zinc-700/50 hover:text-white'
                } transition-colors`}
                onClick={() => {
                  onWalletSelect(wallet.id);
                  setIsOpen(false);
                }}
              >
                <span className="text-xl">{wallet.icon}</span>
                <span className="text-sm">{wallet.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WalletSelector; 