import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Loader2, Clock, Check, X } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";

interface PaymentRequestCardProps {
  requestId: Id<"paymentRequests">;
  messageId: Id<"messages">;
  onAction?: (action: string) => void;
}

export function PaymentRequestCard({
  requestId,
  messageId,
  onAction
}: PaymentRequestCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Get request details
  const details = useQuery(api.paymentRequests.getRequestDetails, {
    requestId
  });

  // Get request history
  const history = useQuery(api.paymentRequests.getRequestHistory, {
    requestId
  });

  // Mutations
  const handleAction = useMutation(api.paymentRequests.handleRequestAction);
  const transfer = useMutation(api.transfers.transferSats);

  // Get current user's spending wallet
  const currentUserWallet = useQuery(api.wallets.getCurrentUserSpendingWallet);

  if (!details || !history) return null;

  const { request, message, requester, recipient, isExpired } = details;

  // Calculate USD value (this should come from your price service)
  const usdAmount = (request.amount * 0.00043).toFixed(2); // Example rate

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
      await handleAction({
        requestId,
        messageId,
        action: "approve"
      });

      // Then initiate the transfer
      const result = await transfer({
        sourceWalletId: currentUserWallet._id,
        destinationUserId: request.requesterId,
        amount: request.amount,
        description: request.metadata.description,
        messageId,
        conversationId: message.conversationId
      });

      if (result.success) {
        toast({
          title: "Payment Sent",
          description: `${request.amount} sats sent to ${requester.fullName}`,
        });

        // Update request status to completed
        await handleAction({
          requestId,
          messageId,
          action: "approve"
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
      await handleAction({
        requestId,
        messageId,
        action: "decline",
        note: "Payment failed"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    setIsLoading(true);
    try {
      await handleAction({
        requestId,
        messageId,
        action: "decline"
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
      await handleAction({
        requestId,
        messageId,
        action: "cancel"
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

  const handleRemind = async () => {
    setIsLoading(true);
    try {
      await handleAction({
        requestId,
        messageId,
        action: "remind"
      });
      
      toast({
        title: "Reminder Sent",
        description: "A reminder has been sent to the recipient",
      });

      onAction?.("remind");
    } catch (error) {
      console.error("Failed to send reminder:", error);
      toast({
        title: "Error",
        description: "Failed to send reminder",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (request.status) {
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
    switch (request.status) {
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
    switch (request.status) {
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

  return (
    <div className="bg-zinc-900 rounded-lg p-4 max-w-[280px] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowUpRight className="h-5 w-5 text-emerald-500" />
          <span className="text-lg font-medium text-white">Payment Request</span>
        </div>
        {getStatusIcon()}
      </div>

      <div>
        <div className="text-2xl font-bold text-white">
          {request.amount} sats
        </div>
        <div className="text-zinc-400 text-sm">
          ≈ ${usdAmount} USD
        </div>
      </div>

      <div className={cn("text-sm font-medium", getStatusColor())}>
        {getStatusText()}
      </div>

      {request.status === "pending" && !isExpired && (
        <div className="flex flex-col gap-2">
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
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

      {request.status === "pending" && isExpired && (
        <div className="text-zinc-500 text-sm">
          This request has expired
        </div>
      )}

      {request.metadata.declineReason && (
        <div className="text-zinc-500 text-sm">
          Reason: {request.metadata.declineReason}
        </div>
      )}

      {request.metadata.cancelReason && (
        <div className="text-zinc-500 text-sm">
          Reason: {request.metadata.cancelReason}
        </div>
      )}

      <div className="flex items-center justify-between text-zinc-500 text-xs">
        <span>
          {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
        </span>
        {request.status === "pending" && !isExpired && (
          <span>
            Expires {formatDistanceToNow(new Date(request.metadata.expiresAt), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  );
} 