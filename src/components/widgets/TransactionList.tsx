import React from 'react';
import { motion } from 'framer-motion';
import WalletSelector from '../WalletSelector';
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAccountStore } from "../../hooks/useUserAccountsAndWallets";
import { Bitcoin, Zap } from 'lucide-react';

interface Transaction {
  _id: Id<"transactions">;
  walletId: Id<"wallets">;
  type: 'payment' | 'receive';
  amount: number;
  fee: number;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  description: string;
  recipient?: {
    name: string;
    address: string;
  };
  sender?: {
    name: string;
    address: string;
  };
  metadata: {
    lightning: boolean;
    memo?: string;
    tags: string[];
  };
}

interface TransactionListProps {
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

// Add this constant at the top level for consistent color usage
const NETWORK_ICON_COLOR = "text-blue-500"; // Same blue as messages view

function groupTransactionsByDate(transactions: Transaction[]) {
  return transactions.reduce((groups, transaction) => {
    const date = new Date(transaction.timestamp);
    const dateStr = date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric'
    });
    
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>);
}

const TransactionList: React.FC<TransactionListProps> = ({
  wallets,
  selectedWalletId,
  onWalletSelect,
  onViewAll
}) => {
  // Get current account from global state
  const { currentAccountId, isAccountSwitching } = useAccountStore();

  // Fetch transactions for the selected wallet
  const transactions = useQuery(api.transactions.getTransactions, 
    selectedWalletId && currentAccountId && !isAccountSwitching
      ? { walletId: selectedWalletId as Id<"wallets"> } 
      : "skip"
  );

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

  // Common header component
  const Header = () => (
    <div className="flex justify-between items-center">
      <span className="font-medium">Recent Activity</span>
      <WalletSelector
        wallets={wallets}
        selectedWalletId={selectedWalletId}
        onWalletSelect={onWalletSelect}
      />
    </div>
  );

  // Show loading state while fetching transactions or during account switch
  if (!transactions || isAccountSwitching) {
    return (
      <div className="space-y-4">
        <Header />
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-zinc-500 border-t-white rounded-full animate-spin mb-4" />
          <p className="text-sm text-zinc-500">
            {isAccountSwitching ? 'Switching account...' : 'Loading transactions...'}
          </p>
        </div>
      </div>
    );
  }

  // If no transactions, show empty state
  if (transactions.length === 0) {
    return (
      <div className="space-y-4">
        <Header />
        <div className="flex flex-col items-center justify-center h-64 space-y-2 text-center">
          <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-2">
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-zinc-300">No transactions yet</p>
          <p className="text-sm text-zinc-500 max-w-[200px]">
            Your recent transactions will appear here once you start using this wallet
          </p>
        </div>
      </div>
    );
  }

  // Get only the last 5 transactions
  const recentTransactions = transactions ? transactions.slice(0, 5) : [];
  const groupedTransactions = groupTransactionsByDate(recentTransactions);

  return (
    <div className="space-y-4">
      <Header />

      <motion.div 
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {Object.entries(groupedTransactions).map(([date, dateTransactions]) => (
          <motion.div key={date} className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-500">{date}</h3>
            {dateTransactions.map((tx) => (
              <motion.div
                key={tx._id}
                variants={itemVariants}
                className="flex items-center justify-between bg-zinc-900 p-4 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-xl">
                    {tx.type === 'receive' ? '↓' : '↑'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {tx.type === 'receive' 
                          ? tx.sender?.name || 'Unknown Sender'
                          : tx.recipient?.name || 'Unknown Recipient'
                        }
                      </p>
                      {tx.status === 'pending' && (
                        <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">Pending</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      {tx.metadata.lightning ? (
                        <Zap className={`h-3.5 w-3.5 ${NETWORK_ICON_COLOR}`} />
                      ) : (
                        <Bitcoin className={`h-3.5 w-3.5 ${NETWORK_ICON_COLOR}`} />
                      )}
                      <span>{tx.description}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className={cn(
                    tx.type === 'receive' ? 'text-[#0066FF]' : '',
                    "font-medium leading-snug"
                  )}>
                    {tx.type === 'receive' ? '+' : '-'}{tx.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-500">sats</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ))}
      </motion.div>

      {transactions && transactions.length > 5 && (
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