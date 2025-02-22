import { MoreVertical, Plus, Wallet, Shield, Zap, Clock, Info, Bitcoin, ChevronRight, ChevronDown, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Balance {
  sats: string;
  btc: string;
  fiat?: {
    amount: string;
    currency: string;
  };
}

interface WalletCardProps {
  type?: 'spending' | 'savings' | 'multisig' | 'add';
  name?: string;
  balance?: Balance;
  lastTransaction?: string;
  onClick?: () => void;
  onSettingsClick?: (action: string) => void;
  view?: 'compact' | 'detailed';
}

const gradientStyles = {
  spending: "bg-gradient-to-br from-purple-500/90 via-purple-600 to-purple-800",
  savings: "bg-gradient-to-br from-orange-500/90 via-orange-600 to-orange-800",
  multisig: "bg-gradient-to-br from-blue-500/90 via-blue-600 to-blue-800",
  add: "bg-zinc-900 border border-zinc-800",
};

const walletTypes = [
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    description: 'Simple and powerful Bitcoin wallet',
    setupTime: '2 min',
    icon: Bitcoin,
    color: 'bg-blue-600',
    features: ['Self-custody', 'Basic security', 'Easy to use'],
    securityLevel: 'Standard',
    bestFor: 'Getting started'
  },
  {
    id: 'lightning',
    name: 'Lightning Wallet',
    description: 'Fast, low-fee transactions',
    setupTime: '2 min',
    icon: Zap,
    color: 'bg-purple-600',
    features: ['Instant payments', 'Low fees', 'Card support'],
    securityLevel: 'Standard',
    bestFor: 'Daily transactions'
  },
  {
    id: 'multisig',
    name: 'Multisig Vault',
    description: 'Best security for large amounts',
    setupTime: '5 min',
    icon: Shield,
    color: 'bg-orange-600',
    features: ['Multi-signature', 'Time-locks', 'Enhanced security'],
    securityLevel: 'Maximum',
    bestFor: 'Large amounts'
  }
];

const walletIcons = {
  bitcoin: Bitcoin,
  spending: Zap,
  lightning: Zap,
  savings: Bitcoin,
  multisig: Shield,
  add: Plus
} as const;

const iconColors = {
  bitcoin: "text-blue-500",
  spending: "text-purple-500",
  lightning: "text-purple-500",
  savings: "text-orange-500",
  multisig: "text-blue-500",
  add: "text-zinc-500"
} as const;

export function WalletCard({
  type = 'add',
  name,
  balance,
  lastTransaction,
  onClick,
  onSettingsClick,
  view = 'compact'
}: WalletCardProps) {
  const [showBTC, setShowBTC] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const isAddCard = type === 'add';
  
  const toggleBalance = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowBTC(!showBTC);
  };

  const toggleBalanceVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBalanceVisible(!isBalanceVisible);
  };

  const WalletIcon = walletIcons[type];
  const iconColor = iconColors[type];
  
  if (type === 'add') {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative h-[180px] rounded-xl bg-zinc-900 p-6 overflow-hidden cursor-pointer group"
        onClick={onClick}
      >
        <div className="h-full flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Add a wallet
            </h3>
            <p className="text-sm text-zinc-400">
              Choose from multiple wallet types for different needs
            </p>
          </div>

          <div className="flex items-center justify-between w-full">
            <div className="flex -space-x-2">
              {walletTypes.slice(0, 3).map((wallet) => (
                <div 
                  key={wallet.id}
                  className={cn("w-10 h-10 rounded-xl flex items-center justify-center", wallet.color)}
                >
                  <wallet.icon className="w-5 h-5 text-white" />
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-white text-black hover:bg-white/90"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Regular wallet card rendering
  return (
    <div 
      className={cn(
        "relative rounded-xl p-5 min-h-[180px] cursor-pointer transition-all hover:scale-[1.02]",
        gradientStyles[type],
        isAddCard && "hover:border-zinc-700"
      )}
      onClick={onClick}
    >
      {/* Top Actions */}
      <div className="absolute top-3 right-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl text-white/90 hover:text-white hover:bg-white/10"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => onSettingsClick?.('currency')}>
              Change Currency
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSettingsClick?.('rename')}>
              Rename Wallet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSettingsClick?.('export')}>
              Export Data
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSettingsClick?.('visibility')}>
              Toggle Balance
            </DropdownMenuItem>
            {!isAddCard && (
              <DropdownMenuItem 
                onClick={() => onSettingsClick?.('delete')}
                className="text-red-500"
              >
                Delete Wallet
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Card Content */}
      <div className="h-full flex flex-col pt-2">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-11 h-11 rounded-xl bg-black/20",
              "flex items-center justify-center"
            )}>
              <WalletIcon className="h-[22px] w-[22px] text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">{type}</p>
              <h3 className="text-xl font-semibold text-white">{name}</h3>
            </div>
          </div>
        </div>
        
        <div className="mt-auto relative">
          {balance && (
            <div className="space-y-1">
              <div className={cn(
                "transition-all",
                !isBalanceVisible && "blur-sm select-none"
              )}>
                <div className="flex items-baseline gap-2">
                  <span className="text-[28px] font-bold text-white tracking-tight">
                    {showBTC ? `₿${balance.btc}` : balance.sats}
                  </span>
                  <span className="text-sm font-medium text-white/90">
                    {showBTC ? 'BTC' : 'sats'}
                  </span>
                </div>
                {balance.fiat && (
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-sm text-zinc-400">≈</span>
                    <span className="text-sm text-zinc-400">
                      ${balance.fiat.amount} {balance.fiat.currency}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          {lastTransaction && (
            <p className="text-sm font-medium text-white/80 mt-2">
              Last active: {lastTransaction}
            </p>
          )}
          
          {/* Balance visibility toggle */}
          <button
            onClick={toggleBalanceVisibility}
            className="absolute bottom-0 right-0 w-11 h-11 rounded-xl bg-black/20 flex items-center justify-center hover:bg-black/30 transition-colors"
          >
            {isBalanceVisible ? (
              <Eye className="h-[22px] w-[22px] text-white" />
            ) : (
              <EyeOff className="h-[22px] w-[22px] text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 