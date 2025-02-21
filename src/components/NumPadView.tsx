import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { NumPad } from "@/components/NumPad";
import { ActionButton } from "@/components/ActionButton";
import { Avatar } from "@/components/ui/avatar";
import { ArrowLeft, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface NumPadViewProps {
  title: string;
  recipient: {
    id: string;
    fullName: string;
    username: string;
    profileImageUrl?: string;
    isOnline?: boolean;
  };
  onSubmit: (amount: number) => void;
  onCancel: () => void;
  maxAmount?: number;
  minAmount?: number;
  submitLabel?: string;
  submitButtonClass?: string;
  isLoading?: boolean;
  showAvailableBalance?: boolean;
  availableBalance?: number;
  navigationContext?: {
    from: 'chat' | 'standalone';
    conversationId?: string;
  };
}

export function NumPadView({
  title,
  recipient,
  onSubmit,
  onCancel,
  maxAmount,
  minAmount = 1,
  submitLabel = "Next",
  submitButtonClass = "bg-[#0066FF] hover:bg-[#0052CC]",
  isLoading,
  showAvailableBalance,
  availableBalance,
  navigationContext
}: NumPadViewProps) {
  const [amount, setAmount] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastPressed, setLastPressed] = useState<string | null>(null);

  // Format amount with thousand separators
  const formattedAmount = parseFloat(amount).toLocaleString();
  const usdAmount = parseFloat(amount) * 0.00043;
  const numericAmount = parseFloat(amount);

  // Enhanced validation with specific error messages
  useEffect(() => {
    if (numericAmount === 0) {
      setError("Enter an amount");
    } else if (minAmount && numericAmount < minAmount) {
      setError(`Minimum amount is ${minAmount.toLocaleString()} sats`);
    } else if (maxAmount && numericAmount > maxAmount) {
      setError(`Maximum amount is ${maxAmount.toLocaleString()} sats`);
    } else if (showAvailableBalance && availableBalance !== undefined && numericAmount > availableBalance) {
      setError(`Insufficient balance (${availableBalance.toLocaleString()} sats available)`);
    } else {
      setError(null);
    }

    // Show confirmation for large amounts
    setShowConfirm(numericAmount >= 100000);
  }, [amount, minAmount, maxAmount, showAvailableBalance, availableBalance]);

  const handleNumberPress = (num: string) => {
    setLastPressed(num);
    setTimeout(() => setLastPressed(null), 150);

    if (amount === "0" && num !== ".") {
      setAmount(num);
    } else {
      const newAmount = amount + num;
      // Prevent more than 8 digits
      if (newAmount.replace(".", "").length <= 8) {
        setAmount(newAmount);
      }
    }
  };

  const handleDelete = () => {
    setAmount(prev => prev.length > 1 ? prev.slice(0, -1) : "0");
  };

  const handleSubmit = () => {
    if (!error && numericAmount > 0) {
      if (showConfirm) {
        setShowConfirm(true);
      } else {
        onSubmit(numericAmount);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {/* Responsive Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-b from-black to-transparent">
        <div className="flex items-center p-3 sm:p-4 gap-2 sm:gap-3 max-w-lg mx-auto w-full">
          <button 
            onClick={onCancel}
            className="p-1.5 sm:p-2 hover:bg-zinc-800/50 rounded-full transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-105 transition-transform" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 overflow-hidden">
              <h1 className="text-base sm:text-lg font-semibold truncate">{title}</h1>
              {navigationContext?.from === 'chat' && (
                <Badge variant="secondary" className="text-xs shrink-0">From Chat</Badge>
              )}
            </div>
            {navigationContext?.from === 'chat' && (
              <p className="text-xs text-zinc-400 truncate">Back to chat</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable if needed */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="flex flex-col items-center px-4 py-4 sm:py-6 max-w-lg mx-auto w-full">
          {/* Responsive Recipient Info */}
          <div className="relative">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 ring-2 ring-offset-2 ring-offset-black ring-zinc-800">
              {recipient.profileImageUrl ? (
                <img 
                  src={recipient.profileImageUrl} 
                  alt={recipient.fullName}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-xl sm:text-2xl font-semibold">{recipient.fullName.charAt(0)}</span>
                </div>
              )}
            </Avatar>
            {recipient.isOnline && (
              <div className="absolute bottom-1 right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full ring-2 ring-black" />
            )}
          </div>
          
          <div className="mt-3 sm:mt-4 text-center w-full">
            <h2 className="text-lg sm:text-xl font-semibold truncate">{recipient.fullName}</h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <p className="text-sm text-zinc-400 truncate">@{recipient.username}</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="h-5 shrink-0">✓</Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Verified User</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          {/* Responsive Amount Display */}
          <div className="text-center mt-6 sm:mt-8 mb-4 sm:mb-6 w-full">
            <div className="flex items-baseline justify-center gap-2 px-2">
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tighter transition-all">
                {formattedAmount}
              </h1>
              <span className="text-lg sm:text-xl text-zinc-400">sats</span>
            </div>
            
            <div className="mt-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-zinc-900/50 rounded-full inline-block">
              <p className="text-xs sm:text-sm text-zinc-300">≈ ${usdAmount.toFixed(2)} USD</p>
            </div>
            
            {/* Available Balance */}
            {showAvailableBalance && availableBalance !== undefined && (
              <div className="mt-3 sm:mt-4 flex items-center justify-center gap-2">
                <p className="text-xs sm:text-sm">
                  Available: <span className="font-medium text-zinc-300">{availableBalance.toLocaleString()} sats</span>
                </p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-3 sm:mt-4 flex items-center justify-center gap-2 text-red-500">
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <p className="text-xs sm:text-sm font-medium">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* NumPad Section - Fixed at bottom */}
        <div className="w-full max-w-lg mx-auto px-3 sm:px-4 mt-auto">
          <NumPad 
            onNumberPress={handleNumberPress} 
            onDelete={handleDelete}
            className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4"
            buttonClassName="h-14 sm:h-16 rounded-xl sm:rounded-2xl text-lg sm:text-xl font-medium 
                           transition-all transform bg-zinc-800/80 hover:bg-zinc-700 
                           active:bg-zinc-600 backdrop-blur-sm backdrop-filter"
          />

          {/* Action Buttons */}
          <div className="space-y-2 sm:space-y-3 pb-4 sm:pb-6">
            <ActionButton
              variant="secondary"
              onClick={onCancel}
              className="w-full bg-zinc-800/80 hover:bg-zinc-700 text-white h-12 sm:h-14 
                       rounded-xl sm:rounded-2xl transition-all transform active:scale-98"
            >
              Cancel
            </ActionButton>
            
            <ActionButton
              onClick={handleSubmit}
              disabled={!!error || isLoading}
              className={cn(
                "w-full text-white h-12 sm:h-14 rounded-xl sm:rounded-2xl transition-all transform",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2",
                submitButtonClass
              )}
            >
              <span>{isLoading ? "Processing..." : submitLabel}</span>
              {!isLoading && <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />}
            </ActionButton>
          </div>
        </div>
      </div>

      {/* Responsive Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-sm w-full space-y-3 sm:space-y-4 m-auto">
            <h3 className="text-lg sm:text-xl font-semibold text-center">Confirm Large Amount</h3>
            <p className="text-center text-zinc-400 text-sm sm:text-base">
              You're about to {title.toLowerCase()} <span className="text-white font-medium">{formattedAmount} sats</span>
              {" "}(${usdAmount.toFixed(2)} USD)
            </p>
            <div className="flex flex-col gap-2">
              <ActionButton
                onClick={() => {
                  setShowConfirm(false);
                  onSubmit(numericAmount);
                }}
                className={cn(
                  "w-full h-11 sm:h-12 rounded-xl",
                  submitButtonClass
                )}
              >
                Confirm
              </ActionButton>
              <ActionButton
                variant="secondary"
                onClick={() => setShowConfirm(false)}
                className="w-full h-11 sm:h-12 rounded-xl bg-zinc-800"
              >
                Cancel
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 