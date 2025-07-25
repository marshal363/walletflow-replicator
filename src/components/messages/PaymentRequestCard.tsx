import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Loader2, Clock, Check, X, ArrowDownLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@clerk/clerk-react";

const debug = {
  log: (message: string, data?: Record<string, unknown>) => {
    console.log("[PaymentRequestCard] [LOG]", message, {
      ...data,
      timestamp: new Date().toISOString()
    });
  },
  error: (message: string, error?: unknown) => {
    console.error("[PaymentRequestCard] [ERROR]", message, {
      error,
      timestamp: new Date().toISOString()
    });
  }
};

interface PaymentRequestCardProps {
  messageId: Id<"messages">;
  onAction?: (action: string) => void;
}

export function PaymentRequestCard({
  messageId,
  onAction
}: PaymentRequestCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [localIsExpired, setLocalIsExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useUser();

  // Get message details
  const message = useQuery(api.messages.getMessage, {
    messageId
  });

  // Get current user's spending wallet
  const currentUserWallet = useQuery(api.wallets.getCurrentUserSpendingWallet);

  // Get current user's Convex ID
  const currentUser = useQuery(api.users.getCurrentUser);

  // Mutations
  const handleRequestAction = useMutation(api.paymentRequests.handleRequestAction);
  const transfer = useMutation(api.transfers.transferSats);
  const manualExpireRequest = useMutation(api.paymentRequests.manualExpireRequest);

  // Get request details with error handling
  const requestId = message?.metadata?.requestId;
  const requestDetails = useQuery(
    api.paymentRequests.getRequestDetails, 
    requestId ? { requestId } : "skip"
  );

  // Add debug logging for component state
  useEffect(() => {
    debug.log("PaymentRequestCard state", {
      messageId,
      requestId,
      currentUserId: currentUser?._id,
      status: message?.metadata?.requestStatus,
      isLoading,
      hasWallet: !!currentUserWallet,
      requestDetails: requestDetails?.request ? {
        status: requestDetails.request.status,
        amount: requestDetails.request.amount,
        type: requestDetails.request.type
      } : null
    });
  }, [messageId, requestId, currentUser?._id, message?.metadata?.requestStatus, isLoading, currentUserWallet, requestDetails]);

  // Add debug logging for component updates
  useEffect(() => {
    debug.log("PaymentRequestCard updated", {
      messageId,
      status: message?.metadata?.requestStatus,
      timestamp: new Date().toISOString()
    });
  });

  // Effect for handling expiration updates
  useEffect(() => {
    if (!requestDetails?.request?.metadata?.expiresAt || requestDetails?.request?.status !== "pending") {
      debug.log("Skipping expiration update - request not pending or no expiration", {
        status: requestDetails?.request?.status,
        expiresAt: requestDetails?.request?.metadata?.expiresAt
      });
      return;
    }

    const expirationDate = new Date(requestDetails.request.metadata.expiresAt);
    const updateExpiration = () => {
      const now = new Date();
      const isExpired = expirationDate < now;
      const diffMs = expirationDate.getTime() - now.getTime();
      
      debug.log("Updating expiration state", {
        requestId: requestDetails.request._id,
        currentStatus: requestDetails.request?.status,
        messageStatus: message?.metadata?.requestStatus,
        isExpired,
        diffMs,
        expirationDate: expirationDate.toISOString(),
        now: now.toISOString(),
        expirationTimeDiff: Math.floor(diffMs / 1000),
        localIsExpired
      });
      
      setLocalIsExpired(isExpired);
      
      if (!isExpired && diffMs > 0) {
        const seconds = Math.floor(diffMs / 1000);
        if (seconds <= 60) {
          setTimeLeft(`${seconds}s`);
        } else {
          setTimeLeft(formatDistanceToNow(expirationDate, { addSuffix: true }));
        }
      } else {
        setTimeLeft(null);
      }
    };

    // Initial update
    updateExpiration();

    // Update every second
    const interval = setInterval(updateExpiration, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [requestDetails?.request?.metadata?.expiresAt, requestDetails?.request?.status, message?.metadata?.requestStatus, localIsExpired]);

  // Add this effect to update the database when a request expires
  useEffect(() => {
    if (!requestDetails?.request?.metadata?.expiresAt || 
        requestDetails?.request?.status !== "pending" || 
        !requestId || 
        !messageId) {
      return;
    }

    const expirationDate = new Date(requestDetails.request.metadata.expiresAt);
    const now = new Date();
    const isExpired = expirationDate < now;
    const diffMs = expirationDate.getTime() - now.getTime();

    // Log more detailed information about expiration state
    debug.log("Database expiration status check", {
      requestId,
      status: requestDetails.request.status,
      localIsExpired,
      isExpired,
      expirationDiffSeconds: Math.floor(diffMs / 1000),
      expirationDate: expirationDate.toISOString(),
      now: now.toISOString(),
      shouldUpdateDatabase: isExpired && requestDetails.request.status === "pending"
    });

    // If the request is expired but still has "pending" status in the database, update it
    if (isExpired && requestDetails.request.status === "pending") {
      debug.log("Request is expired but still pending in database, updating", {
        requestId,
        messageId,
        expirationDate: expirationDate.toISOString(),
        now: now.toISOString()
      });

      // Call the handleRequestAction with "expired" action
      handleRequestAction({
        requestId,
        messageId,
        action: "expired"
      })
      .then(() => {
        debug.log("Successfully updated expired status in database", {
          requestId,
          messageId
        });
        onAction?.("expired");
      })
      .catch((error) => {
        debug.error("Failed to update expired status in database", {
          error,
          requestId,
          messageId
        });
      });
    }
  }, [requestDetails, requestId, messageId, handleRequestAction, onAction]);

  useEffect(() => {
    if (message && currentUser) {
      debug.log("Message and user loaded", {
        messageId: message._id,
        senderId: message.metadata.senderId,
        recipientId: message.metadata.recipientId,
        currentUserId: currentUser._id,
        clerkId: user?.id,
        status: message.metadata.requestStatus,
        amount: message.metadata.amount,
        requestId: message.metadata.requestId,
        hasRequestDetails: !!requestDetails?.request,
        expiresAt: requestDetails?.request?.metadata?.expiresAt
      });
    }
  }, [message, currentUser, user?.id, requestDetails]);

  // Early return if no message or user data
  if (!message || !user || !currentUser) {
    debug.log("Missing required data", {
      hasMessage: !!message,
      hasUser: !!user,
      hasCurrentUser: !!currentUser
    });
    return null;
  }

  // Get expiration from request details
  const expiresAt = requestDetails?.request?.metadata?.expiresAt;
  const isExpired = requestDetails?.request?.status !== "pending" ? false : 
                    (localIsExpired || (expiresAt ? new Date(expiresAt) < new Date() : false));

  debug.log("Final request state calculation", {
    requestStatus: requestDetails?.request?.status,
    messageStatus: message?.metadata?.requestStatus,
    localIsExpired,
    expiresAt,
    isExpired,
    timeLeft
  });

  // Check if the request exists
  if (requestId && (!requestDetails?.request || requestDetails instanceof Error)) {
    debug.error("Request not found or error", { 
      requestId,
      messageId: message._id,
      currentUserId: currentUser._id,
      error: requestDetails instanceof Error ? requestDetails : undefined
    });
    return (
      <div className="rounded-xl p-4 space-y-3 bg-[#2b1d1d] border border-[#472d2d]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-400">
            <X className="h-4 w-4" />
            <span className="text-sm font-medium">Invalid Request</span>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          This payment request no longer exists or has been deleted.
        </div>
      </div>
    );
  }

  // Compare against Convex user ID instead of Clerk ID
  const isRequester = message.metadata.senderId === currentUser._id;
  const isRecipient = message.metadata.recipientId === currentUser._id;
  const status = message.metadata.requestStatus;
  const amount = message.metadata.amount;
  const usdAmount = (amount * 0.00043).toFixed(2);
  
  debug.log("Request state", {
    isRequester,
    isRecipient,
    currentUserId: currentUser._id,
    senderId: message.metadata.senderId,
    recipientId: message.metadata.recipientId,
    status,
    amount,
    isExpired,
    timeLeft,
    hasWallet: !!currentUserWallet,
    requestId,
    hasRequestDetails: !!requestDetails?.request
  });

  const handleApprove = async () => {
    if (!currentUserWallet) {
      toast({
        title: "No Wallet Found",
        description: "Please set up your wallet first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      debug.log("Approving request", {
        messageId,
        requestId: message?.metadata?.requestId,
        amount: message?.metadata?.amount,
        currentStatus: status
      });

      // First update the request status
      await handleRequestAction({
        requestId: message?.metadata?.requestId,
        messageId,
        action: "approved"
      });

      debug.log("Request approved, initiating transfer", {
        messageId,
        requestId: message?.metadata?.requestId,
        newStatus: "approved"
      });

      // Then initiate the transfer
      const result = await transfer({
        sourceWalletId: currentUserWallet._id,
        destinationUserId: message?.metadata?.senderId,
        amount: message?.metadata?.amount,
        description: message?.content,
        messageId,
        conversationId: message?.conversationId
      });

      if (result.success) {
        debug.log("Payment successful", {
          messageId,
          amount: message?.metadata?.amount,
          transferResult: result,
          finalStatus: "approved"
        });

        toast({
          title: "Payment Sent",
          description: `${message?.metadata?.amount} sats sent successfully`,
        });
        onAction?.("approve");
      }
    } catch (error) {
      debug.error("Payment failed", error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });

      // Revert request status
      try {
        await handleRequestAction({
          requestId: message?.metadata?.requestId,
          messageId,
          action: "declined",
          note: "Payment failed"
        });
      } catch (revertError) {
        debug.error("Failed to revert status", revertError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    setIsLoading(true);
    try {
      debug.log("Declining request", {
        messageId,
        requestId: message?.metadata?.requestId,
        currentStatus: status
      });

      await handleRequestAction({
        requestId: message?.metadata?.requestId,
        messageId,
        action: "declined"
      });

      debug.log("Request declined successfully", {
        messageId,
        requestId: message?.metadata?.requestId,
        newStatus: "declined"
      });

      toast({
        title: "Request Declined",
        description: "The payment request has been declined",
      });
      onAction?.("decline");
    } catch (error) {
      debug.error("Failed to decline", error);
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
    if (!isRequester) {
      debug.error("Permission denied - only requester can cancel", {
        userId: user.id,
        requesterId: message.metadata.senderId
      });
      toast({
        title: "Error",
        description: "You don't have permission to cancel this request",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      debug.log("Cancelling request", {
        messageId,
        requestId: message.metadata.requestId,
        currentStatus: status,
        timestamp: new Date().toISOString()
      });

      // Update both request and message status
      await handleRequestAction({
        requestId: message.metadata.requestId,
        messageId, // Add messageId to ensure message status is updated
        action: "cancelled"
      });

      debug.log("Request cancelled successfully", {
        messageId,
        requestId: message.metadata.requestId,
        newStatus: "cancelled",
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Request Cancelled",
        description: "The payment request has been cancelled",
      });
      onAction?.("cancel");
    } catch (error) {
      debug.error("Failed to cancel", {
        error,
        messageId,
        requestId: message.metadata.requestId,
        timestamp: new Date().toISOString()
      });
      toast({
        title: "Error",
        description: "Failed to cancel the request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualExpire = async () => {
    if (!requestId) return;
    
    setIsLoading(true);
    try {
      debug.log("Manually expiring request", {
        requestId,
        currentStatus: status
      });
      
      const result = await manualExpireRequest({
        requestId
      });
      
      debug.log("Manual expire result", result);
      
      toast({
        title: "Request Expired",
        description: "The payment request has been manually expired",
      });
      onAction?.("expire");
    } catch (error) {
      debug.error("Failed to manually expire", error);
      toast({
        title: "Error",
        description: "Failed to expire the request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (isExpired) return <Clock className="h-4 w-4 text-red-400" />;
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
    if (isExpired) return cn(baseStyles, "bg-[#2b1d1d] border-[#472d2d] text-red-400");
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

  // Update the expiration check in both views
  const renderExpirationInfo = () => {
    if (!expiresAt || status !== "pending") return null;
    
    if (isExpired) {
      return <span className="text-red-400">Expired</span>;
    }
    
    return timeLeft ? (
      <span className="text-blue-400">
        Expires in {timeLeft}
      </span>
    ) : null;
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
        {renderExpirationInfo()}
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
        {renderExpirationInfo()}
      </div>
    </div>
  );

  return isRequester ? renderRequesterView() : renderRecipientView();
} 