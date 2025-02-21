import { MoreVertical, Plus, Wallet, Shield, Zap, Clock, Info, Bitcoin, ChevronRight } from "lucide-react";
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

interface WalletCardProps {
  type?: 'spending' | 'savings' | 'multisig' | 'add';
  name?: string;
  balance?: string;
  lastTransaction?: string;
  onClick?: () => void;
  onSettingsClick?: (action: string) => void;
  view?: 'compact' | 'detailed';
}

const gradientStyles = {
  spending: "bg-gradient-to-br from-purple-500 to-purple-900",
  savings: "bg-gradient-to-br from-orange-500 to-orange-900",
  multisig: "bg-gradient-to-br from-blue-500 to-blue-900",
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

export function WalletCard({
  type = 'add',
  name,
  balance,
  lastTransaction,
  onClick,
  onSettingsClick,
  view = 'compact'
}: WalletCardProps) {
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
        "relative rounded-xl p-6 h-[180px] cursor-pointer transition-all hover:scale-[1.02]",
        gradientStyles[type]
      )}
      onClick={onClick}
    >
      <div className="h-full flex flex-col justify-between">
        <h3 className="text-xl font-medium text-white">{name}</h3>
        <div>
          <p className="text-3xl font-semibold text-white">{balance}</p>
          {lastTransaction && (
            <p className="text-sm text-white/60 mt-2">
              Last transaction: {lastTransaction}
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 