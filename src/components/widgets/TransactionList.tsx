import React from 'react';
import { motion } from 'framer-motion';
import WalletSelector from '../WalletSelector';

interface Transaction {
  id: string;
  name: string;
  type: string;
  amount: string;
  fiat: string;
  wallet: string;
  timestamp: string;
  icon?: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  wallets: {
    id: string;
    name: string;
    icon: string;
    color: string;
  }[];
  selectedWalletId: string;
  onWalletSelect: (walletId: string) => void;
  onViewAll?: () => void;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  wallets,
  selectedWalletId,
  onWalletSelect,
  onViewAll
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="font-medium">Recent Activity</span>
        <WalletSelector
          wallets={wallets}
          selectedWalletId={selectedWalletId}
          onWalletSelect={onWalletSelect}
        />
      </div>

      <motion.div 
        className="space-y-3"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {transactions.slice(0, 4).map((tx) => (
          <motion.div
            key={tx.id}
            variants={itemVariants}
            className="flex items-center justify-between bg-zinc-900 p-4 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-xl">
                {tx.icon || tx.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium">{tx.name}</p>
                <p className="text-sm text-zinc-500">{tx.type}</p>
              </div>
            </div>
            <div className="text-right">
              <p>{tx.amount} sats</p>
              <p className="text-sm text-zinc-500">${tx.fiat}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {transactions.length > 4 && (
        <motion.button
          onClick={onViewAll}
          className="w-full p-3 rounded-lg bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors text-sm"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          View All Transactions
        </motion.button>
      )}
    </div>
  );
};

export default TransactionList; 