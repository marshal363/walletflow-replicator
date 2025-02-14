import { useState } from "react";
import { Header } from "@/components/Header";
import { NumPad } from "@/components/NumPad";
import { ActionButton } from "@/components/ActionButton";
import { Avatar } from "@/components/ui/avatar";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useToast } from "@/components/ui/use-toast";

const Amount = () => {
  const [amount, setAmount] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  // Fetch user details directly using ID
  const user = useQuery(api.conversations.searchUsers, id ? { query: "" } : "skip");
  const selectedUser = user?.find(u => u._id === id);
  
  // Get current user's spending wallet
  const currentUserWallet = useQuery(api.wallets.getCurrentUserSpendingWallet);
  
  // Transfer mutation
  const transfer = useMutation(api.transfers.transferSats);

  const handleNumberPress = (num: string) => {
    if (amount === "0" && num !== ".") {
      setAmount(num);
    } else if (num === "." && amount.includes(".")) {
      return; // Prevent multiple decimal points
    } else {
      setAmount(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setAmount(prev => prev.length > 1 ? prev.slice(0, -1) : "0");
  };

  const handleTransfer = async () => {
    if (!currentUserWallet || !id) return;

    setIsLoading(true);
    try {
      // Convert amount to number and validate
      const amountInSats = parseFloat(amount);
      if (isNaN(amountInSats) || amountInSats <= 0) {
        throw new Error("Invalid amount");
      }

      // Perform the transfer
      const result = await transfer({
        sourceWalletId: currentUserWallet._id,
        destinationUserId: id as Id<"users">,
        amount: amountInSats,
        description: `Transfer to ${selectedUser?.fullName || 'user'}`,
      });

      if (result.success) {
        toast({
          title: "Transfer Successful",
          description: `${amount} sats sent to ${selectedUser?.fullName}`,
        });
        // Navigate to message view after successful transfer
        navigate(`/message/${id}`);
      }
    } catch (error) {
      toast({
        title: "Transfer Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate USD value (this is a placeholder - you should use a real BTC/USD rate)
  const usdAmount = parseFloat(amount) * 0.00043; // Example rate: 1 sat = $0.00043 USD

  const isTransferDisabled = !currentUserWallet || amount === "0" || isLoading;

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header title="Sending To" />

      <div className="flex-1 flex flex-col items-center pt-8 pb-4 space-y-2">
        <Avatar className="h-16 w-16 bg-blue-600 flex items-center justify-center text-xl font-medium">
          {selectedUser?.profileImageUrl ? (
            <img 
              src={selectedUser.profileImageUrl} 
              alt={selectedUser.fullName}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <span className="uppercase">{selectedUser?.fullName?.charAt(0) || "?"}</span>
          )}
        </Avatar>
        <h2 className="text-lg font-medium">{selectedUser?.fullName || "Loading..."}</h2>
        <p className="text-sm text-zinc-400">@{selectedUser?.username}</p>
        
        <div className="text-center mt-4 mb-6">
          <h1 className="text-6xl font-bold tracking-tighter">{amount}</h1>
          <p className="text-base text-zinc-400 mt-1">sats</p>
          <p className="text-sm text-zinc-500">${usdAmount.toFixed(2)} USD</p>
        </div>
      </div>

      <div className="w-full max-w-md mx-auto px-4">
        <NumPad 
          onNumberPress={handleNumberPress} 
          onDelete={handleDelete}
          className="grid grid-cols-3 gap-3 mb-4"
          buttonClassName="h-14 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xl font-medium"
        />

        <div className="space-y-3 pb-6">
          <ActionButton
            variant="secondary"
            onClick={() => navigate(-1)}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white"
          >
            Cancel
          </ActionButton>
          <ActionButton
            onClick={handleTransfer}
            disabled={isTransferDisabled}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white disabled:bg-blue-600/50"
          >
            {isLoading ? "Sending..." : "Next"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default Amount;