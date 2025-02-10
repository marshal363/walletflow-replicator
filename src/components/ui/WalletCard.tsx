import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WalletCardProps {
  type?: 'spending' | 'savings' | 'multisig' | 'add';
  name?: string;
  balance?: string;
  lastTransaction?: string;
  onClick?: () => void;
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
}: WalletCardProps) {
  const isAddCard = type === 'add';
  
  const handleClick = (e: React.MouseEvent) => {
    console.log('🎯 WalletCard Click:', {
      event: 'Wallet Card Clicked',
      type,
      isAddCard,
      name,
      timestamp: new Date().toISOString()
    });

    if (isAddCard) {
      e.stopPropagation(); // Prevent event bubbling for add card
      onClick?.();
    } else {
      onClick?.();
    }
  };
  
  return (
    <div 
      className={cn(
        "relative rounded-xl p-4 min-h-[180px] cursor-pointer transition-all hover:scale-[1.02]",
        gradientStyles[type],
        isAddCard && "hover:border-zinc-700"
      )}
      onClick={handleClick}
    >
      {/* Card Content */}
      <div className="mt-4">
        {isAddCard ? (
          <div className="flex flex-col h-full justify-between">
            <div>
              <h3 className="text-xl font-medium text-white">Add a wallet</h3>
              <p className="text-sm text-white/60 mt-2">
                It's free, and you can create as many as you like.
              </p>
            </div>
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                console.log('🎯 Add Now Button Click:', {
                  event: 'Add Now Button Clicked',
                  timestamp: new Date().toISOString()
                });
                onClick?.();
              }}
              className="mt-6 bg-white hover:bg-white/90 text-black"
            >
              Add now
            </Button>
          </div>
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