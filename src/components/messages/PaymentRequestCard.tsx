import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Loader2, Clock, Check, X, ArrowDownLeft } from "lucide-react";
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
        return <Check className="h-4 w-4 text-emerald-400" />;
      case "declined":
        return <X className="h-4 w-4 text-red-400" />;
      case "cancelled":
        return <X className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-blue-400" />;
    }
  };

  const getStatusBadgeStyles = () => {
    const baseStyles = "px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 border";
    switch (status) {
      case "approved":
        return cn(baseStyles, "bg-[#1a2b1d] border-[#2d4731] text-emerald-400");
      case "declined":
        return cn(baseStyles, "bg-[#2b1d1d] border-[#472d2d] text-red-400");
      case "cancelled":
        return cn(baseStyles, "bg-[#1d1d1d] border-[#2d2d2d] text-gray-400");
      default:
        return cn(baseStyles, "bg-[#1d2333] border-[#2d3548] text-blue-400");
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
      "rounded-xl p-4 space-y-3 transition-colors",
      status === "pending" ? "bg-[#1d2333] hover:bg-[#252a3d]" : "bg-[#1d1d1d]"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-300">
          <ArrowUpRight className="h-4 w-4" />
          <span className="text-sm font-medium">Payment Request</span>
        </div>
        <Clock className="h-4 w-4 text-gray-500" />
      </div>

      <div>
        <div className="text-xl font-bold text-white flex items-baseline gap-2">
          {amount.toLocaleString()} <span className="text-sm font-normal">sats</span>
        </div>
        <div className="text-sm text-gray-500">
          ≈ ${usdAmount} USD
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className={getStatusBadgeStyles()}>
          {getStatusIcon()}
          {getStatusText()}
        </div>
      </div>

      {status === "pending" && !isExpired && (
        <Button
          variant="ghost"
          className="w-full bg-[#2d3548] hover:bg-[#3d4663] text-gray-300 h-9"
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
        <div className="text-sm text-gray-500">
          This request has expired
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
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
      "rounded-xl p-4 space-y-3 transition-colors",
      status === "pending" ? "bg-[#1d2333] hover:bg-[#252a3d]" : "bg-[#1d1d1d]"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-300">
          <ArrowDownLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Payment Request</span>
        </div>
        <Clock className="h-4 w-4 text-gray-500" />
      </div>

      <div>
        <div className="text-xl font-bold text-white flex items-baseline gap-2">
          {amount.toLocaleString()} <span className="text-sm font-normal">sats</span>
        </div>
        <div className="text-sm text-gray-500">
          ≈ ${usdAmount} USD
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className={getStatusBadgeStyles()}>
          {getStatusIcon()}
          {getStatusText()}
        </div>
      </div>

      {status === "pending" && !isExpired && (
        <div className="flex flex-col gap-2">
          <Button
            className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white h-9"
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
            className="w-full bg-[#2d3548] hover:bg-[#3d4663] text-gray-300 h-9"
            onClick={handleDecline}
            disabled={isLoading}
          >
            Decline
          </Button>
        </div>
      )}

      {isExpired && (
        <div className="text-sm text-gray-500">
          This request has expired
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
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