import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from 'recharts';
import WalletSelector from '../WalletSelector';
import { ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';

interface SpendingCategory {
  id: string;
  name: string;
  amount: number;
  budget?: number;
  icon: string;
  color: string;
}

interface SpendingData {
  month: string;
  amount: number;
  isCurrentMonth: boolean;
}

interface SpendingTrendWidgetProps {
  wallets: {
    id: string;
    name: string;
    icon: string;
    color: string;
  }[];
  selectedWalletId: string;
  onWalletSelect: (walletId: string) => void;
}

const SpendingTrendWidget: React.FC<SpendingTrendWidgetProps> = ({
  wallets,
  selectedWalletId,
  onWalletSelect,
}) => {
  const [view, setView] = useState<'monthly' | 'weekly'>('monthly');
  const [showCategories, setShowCategories] = useState(false);

  // Mock data - Replace with real data later
  const monthlyData: SpendingData[] = [
    { month: 'May', amount: 1200, isCurrentMonth: false },
    { month: 'Jun', amount: 1500, isCurrentMonth: false },
    { month: 'Jul', amount: 1100, isCurrentMonth: false },
    { month: 'Aug', amount: 900, isCurrentMonth: false },
    { month: 'Sep', amount: 1300, isCurrentMonth: false },
    { month: 'Oct', amount: 1000, isCurrentMonth: false },
    { month: 'Nov', amount: 1600, isCurrentMonth: false },
    { month: 'Dec', amount: 1100, isCurrentMonth: false },
    { month: 'Jan', amount: 1518.84, isCurrentMonth: true },
  ];

  const categories: SpendingCategory[] = [
    { id: '1', name: 'Bills and Services', amount: 510.00, budget: 80.00, icon: '📄', color: 'rgb(239, 68, 68)' },
    { id: '2', name: 'Expenses', amount: 361.04, icon: '💰', color: 'rgb(34, 197, 94)' },
    { id: '3', name: 'Eating and Drinking', amount: 198.64, budget: 50.00, icon: '🍽️', color: 'rgb(168, 85, 247)' },
    { id: '4', name: 'Transportation', amount: 167.94, budget: 75.00, icon: '🚗', color: 'rgb(99, 102, 241)' },
    { id: '5', name: 'Retail', amount: 51.41, icon: '🛍️', color: 'rgb(236, 72, 153)' },
    { id: '6', name: 'Health', amount: 32.00, icon: '❤️', color: 'rgb(249, 115, 22)' },
  ];

  const averageSpending = monthlyData.reduce((acc, curr) => acc + curr.amount, 0) / monthlyData.length;
  const currentSpending = monthlyData[monthlyData.length - 1].amount;
  const spendingTrend = currentSpending > averageSpending;
  const trendPercentage = Math.abs(((currentSpending - averageSpending) / averageSpending) * 100).toFixed(1);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Spending Trends</h3>
        <WalletSelector
          wallets={wallets}
          selectedWalletId={selectedWalletId}
          onWalletSelect={onWalletSelect}
        />
      </div>

      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-zinc-400">Your average spending is</p>
          <p className="text-2xl font-bold">${currentSpending.toFixed(2)}</p>
          <div className="flex items-center gap-1 mt-1">
            {spendingTrend ? (
              <>
                <TrendingUp className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-500">{trendPercentage}% above average</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-500">{trendPercentage}% below average</span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('weekly')}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              view === 'weekly' ? 'bg-purple-600 text-white' : 'text-zinc-400'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setView('monthly')}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              view === 'monthly' ? 'bg-purple-600 text-white' : 'text-zinc-400'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="h-48 -mx-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a', fontSize: 12 }}
            />
            <Bar dataKey="amount" radius={[4, 4, 4, 4]}>
              {monthlyData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.isCurrentMonth ? '#a855f7' : '#3f3f46'}
                  className="transition-colors duration-300 hover:opacity-80"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <motion.div
        animate={{ height: showCategories ? 'auto' : 0 }}
        className="overflow-hidden"
      >
        <div className="pt-4 space-y-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: category.color + '20' }}
                >
                  {category.icon}
                </div>
                <div>
                  <p className="font-medium">{category.name}</p>
                  <p className="text-sm text-zinc-400">${category.amount.toFixed(2)}</p>
                </div>
              </div>
              {category.budget && (
                <div className="text-right">
                  <p className="text-sm text-zinc-400">Budget</p>
                  <p className="font-medium">${category.budget.toFixed(2)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      <button
        onClick={() => setShowCategories(!showCategories)}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
      >
        <span>{showCategories ? 'Hide' : 'Show'} Categories</span>
        <motion.div
          animate={{ rotate: showCategories ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="h-4 w-4" />
        </motion.div>
      </button>
    </div>
  );
};

export default SpendingTrendWidget; 