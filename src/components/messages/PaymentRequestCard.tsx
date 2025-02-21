import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Loader2, Clock, Check, X, Zap, ArrowDownLeft } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@clerk/clerk-react";

interface PaymentRequestCardProps {
  messageId: Id<"messages">;
  onAction?: (action: string) => void;
}

export function PaymentRequestCard({
  messageId,
  onAction
}: PaymentRequestCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();

  // Get message details
  const message = useQuery(api.messages.getMessage, {
    messageId
  });

  // Get current user's spending wallet
  const currentUserWallet = useQuery(api.wallets.getCurrentUserSpendingWallet);

  // Mutations
  const updateStatus = useMutation(api.messages.updatePaymentRequestStatus);
  const transfer = useMutation(api.transfers.transferSats);

  if (!message || !user) return null;

  const isRequester = message.metadata.senderId === user.id;
  const isRecipient = message.metadata.recipientId === user.id;
  const status = message.metadata.requestStatus;
  const amount = message.metadata.amount;
  const usdAmount = (amount * 0.00043).toFixed(2);
  const isExpired = message.metadata.expiresAt && new Date(message.metadata.expiresAt) < new Date();

  const handleApprove = async () => {
    if (!currentUserWallet) {
      toast({
        title: "Error",
        description: "No wallet found",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // First update the request status
      await updateStatus({
        messageId,
        newStatus: "approved"
      });

      // Then initiate the transfer
      const result = await transfer({
        sourceWalletId: currentUserWallet._id,
        destinationUserId: message.metadata.senderId,
        amount: message.metadata.amount,
        description: message.content,
        messageId,
        conversationId: message.conversationId
      });

      if (result.success) {
        toast({
          title: "Payment Sent",
          description: `${amount} sats sent successfully`,
        });
        onAction?.("approve");
      }
    } catch (error) {
      console.error("Payment failed:", error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });

      // Revert request status
      await updateStatus({
        messageId,
        newStatus: "declined"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    setIsLoading(true);
    try {
      await updateStatus({
        messageId,
        newStatus: "declined"
      });
      
      toast({
        title: "Request Declined",
        description: "The payment request has been declined",
      });
      onAction?.("decline");
    } catch (error) {
      console.error("Failed to decline:", error);
      toast({
        title: "Error",
        description: "Failed to decline the request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      await updateStatus({
        messageId,
        newStatus: "cancelled"
      });
      
      toast({
        title: "Request Cancelled",
        description: "The payment request has been cancelled",
      });
      onAction?.("cancel");
    } catch (error) {
      console.error("Failed to cancel:", error);
      toast({
        title: "Error",
        description: "Failed to cancel the request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "approved":
        return <Check className="h-5 w-5 text-emerald-500" />;
      case "declined":
        return <X className="h-5 w-5 text-red-500" />;
      case "cancelled":
        return <X className="h-5 w-5 text-zinc-500" />;
      default:
        return <Clock className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "approved":
        return "text-emerald-500";
      case "declined":
        return "text-red-500";
      case "cancelled":
        return "text-zinc-500";
      default:
        return "text-blue-500";
    }
  };

  const getStatusText = () => {
    if (isExpired) return "Expired";
    switch (status) {
      case "approved":
        return "Approved";
      case "declined":
        return "Declined";
      case "cancelled":
        return "Cancelled";
      default:
        return "Pending";
    }
  };

  // Render different views based on user role
  const renderRequesterView = () => (
    <div className={cn(
      "rounded-lg p-4 max-w-[280px] space-y-3",
      status === "pending" ? "bg-zinc-900/80" : "bg-zinc-900/50"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowUpRight className="h-5 w-5 text-orange-500" />
          <span className="text-lg font-medium text-white">Your Request</span>
        </div>
        {getStatusIcon()}
      </div>

      <div>
        <div className="text-2xl font-bold text-white">
          {amount} sats
        </div>
        <div className="text-zinc-400 text-sm">
          ≈ ${usdAmount} USD
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className={cn(
          "text-sm font-medium px-2 py-1 rounded-full",
          status === "pending" ? "bg-blue-500/20 text-blue-400" :
          status === "approved" ? "bg-emerald-500/20 text-emerald-400" :
          status === "declined" ? "bg-red-500/20 text-red-400" :
          "bg-zinc-500/20 text-zinc-400"
        )}>
          {getStatusText()}
        </div>
        {status === "pending" && !isExpired && (
          <div className="text-xs text-zinc-500">
            Waiting for payment...
          </div>
        )}
      </div>

      {status === "pending" && !isExpired && (
        <Button
          variant="ghost"
          className="w-full text-zinc-400 hover:text-white hover:bg-zinc-800"
          onClick={handleCancel}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Cancel Request"
          )}
        </Button>
      )}

      {isExpired && (
        <div className="text-zinc-500 text-sm">
          This request has expired
        </div>
      )}

      <div className="flex items-center justify-between text-zinc-500 text-xs">
        <span>
          {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
        </span>
        {status === "pending" && !isExpired && message.metadata.expiresAt && (
          <span>
            Expires {formatDistanceToNow(new Date(message.metadata.expiresAt), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  );

  const renderRecipientView = () => (
    <div className={cn(
      "rounded-lg p-4 max-w-[280px] space-y-3",
      status === "pending" ? "bg-[#1a1c2b]" : "bg-zinc-900/50"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowDownLeft className="h-5 w-5 text-blue-500" />
          <span className="text-lg font-medium text-white">Payment Request</span>
        </div>
        {getStatusIcon()}
      </div>

      <div>
        <div className="text-2xl font-bold text-white">
          {amount} sats
        </div>
        <div className="text-zinc-400 text-sm">
          ≈ ${usdAmount} USD
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className={cn(
          "text-sm font-medium px-2 py-1 rounded-full",
          status === "pending" ? "bg-blue-500/20 text-blue-400" :
          status === "approved" ? "bg-emerald-500/20 text-emerald-400" :
          status === "declined" ? "bg-red-500/20 text-red-400" :
          "bg-zinc-500/20 text-zinc-400"
        )}>
          {getStatusText()}
        </div>
      </div>

      {status === "pending" && !isExpired && (
        <div className="flex flex-col gap-2">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-500 text-white"
            onClick={handleApprove}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Pay Now"
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-zinc-400 hover:text-white hover:bg-zinc-800"
            onClick={handleDecline}
            disabled={isLoading}
          >
            Decline
          </Button>
        </div>
      )}

      {isExpired && (
        <div className="text-zinc-500 text-sm">
          This request has expired
        </div>
      )}

      <div className="flex items-center justify-between text-zinc-500 text-xs">
        <span>
          {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
        </span>
        {status === "pending" && !isExpired && message.metadata.expiresAt && (
          <span>
            Expires {formatDistanceToNow(new Date(message.metadata.expiresAt), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  );

  return isRequester ? renderRequesterView() : renderRecipientView();
} 