import { MoreVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface WalletCardProps {
  type?: 'spending' | 'savings' | 'multisig' | 'add';
  name?: string;
  balance?: string;
  lastTransaction?: string;
  onClick?: () => void;
  onSettingsClick?: (action: string) => void;
}

const gradientStyles = {
  spending: "bg-gradient-to-br from-purple-500 to-purple-900",
  savings: "bg-gradient-to-br from-orange-500 to-orange-900",
  multisig: "bg-gradient-to-br from-blue-500 to-blue-900",
  add: "bg-zinc-900 border border-zinc-800",
};

export function WalletCard({ 
  type = 'add',
  name,
  balance,
  lastTransaction,
  onClick,
  onSettingsClick 
}: WalletCardProps) {
  const isAddCard = type === 'add';
  
  return (
    <div 
      className={cn(
        "relative rounded-xl p-4 min-h-[180px] cursor-pointer transition-all hover:scale-[1.02]",
        gradientStyles[type],
        isAddCard && "hover:border-zinc-700"
      )}
      onClick={onClick}
    >
      {/* Top Actions */}
      <div className="absolute top-2 right-2 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
      <div className="mt-8">
        {isAddCard ? (
          <>
            <h3 className="text-xl font-medium text-white">Add a wallet</h3>
            <p className="text-sm text-white/60 mt-2">
              It's free, and you can create as many as you like.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-xl font-medium text-white">{name}</h3>
            <div className="mt-4">
              <p className="text-3xl font-semibold text-white">{balance}</p>
              {lastTransaction && (
                <p className="text-sm text-white/60 mt-2">
                  Last transaction: {lastTransaction}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 