import React, { useState, useMemo } from "react";
import { useIsRequester } from "../../hooks/useIsRequester";
import { usePaymentRequestActions } from "../../contexts/PaymentRequestActionsContext";
import { formatRelativeTime, formatCurrency } from "../../utils/formatters";
import { Badge, Button } from "@/components/ui/components";
import { IconCurrencyDollar } from "@tabler/icons-react";
import { toast } from "react-hot-toast";
import { Doc } from "../../../convex/_generated/dataModel";

// Define the props interface with explicit type for payment request status
interface PaymentRequestCardProps {
  request: Doc<"paymentRequests"> & {
    status: "pending" | "approved" | "declined" | "cancelled" | "completed" | "expired";
  };
  showActions?: boolean;
  disableApprove?: boolean;
  onAction?: (action: "approve" | "decline" | "cancel" | "expired") => void;
}

const PaymentRequestCard = ({ 
  request, 
  showActions = true,
  disableApprove = false,
  onAction
}: PaymentRequestCardProps) => {
  const isRequester = useIsRequester(request);
  const { handleRequestAction } = usePaymentRequestActions();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Format the payment request date
  const formattedDate = useMemo(() => {
    return formatRelativeTime(new Date(request._creationTime));
  }, [request._creationTime]);
  
  // Format expiration time if it exists
  const expirationInfo = useMemo(() => {
    if (request.metadata?.expiresAt) {
      const expirationDate = new Date(request.metadata.expiresAt);
      const now = new Date();
      const isExpired = expirationDate < now;
      
      // If status is already expired or the date is in the past
      if (request.status === "expired" || isExpired) {
        return { text: "Expired", className: "text-red-500" };
      }
      
      // Calculate time remaining
      const diffMs = expirationDate.getTime() - now.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHrs > 0) {
        return { 
          text: `Expires in ${diffHrs}h ${diffMins}m`, 
          className: diffHrs < 6 ? "text-amber-500" : "text-zinc-500" 
        };
      } else if (diffMins > 0) {
        return { 
          text: `Expires in ${diffMins}m`, 
          className: "text-amber-500" 
        };
      } else {
        return { 
          text: "Expiring soon", 
          className: "text-red-500 font-medium" 
        };
      }
    }
    return null;
  }, [request.metadata?.expiresAt, request.status]);
  
  // Get the status display text and color
  const statusInfo = useMemo(() => {
    switch (request.status) {
      case "pending":
        return { text: "Pending", color: "text-amber-500" };
      case "approved":
        return { text: "Approved", color: "text-green-500" };
      case "completed":
        return { text: "Completed", color: "text-green-500" };
      case "declined":
        return { text: "Declined", color: "text-red-500" };
      case "cancelled":
        return { text: "Cancelled", color: "text-zinc-500" };
      case "expired":
        return { text: "Expired", color: "text-red-500" };
      default:
        return { text: "Unknown", color: "text-zinc-500" };
    }
  }, [request.status]);
  
  // Handle approve, decline, or cancel actions
  const handleAction = async (action: "approve" | "decline" | "cancel" | "expired") => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      await handleRequestAction({
        requestId: request._id,
        action
      });
      
      if (onAction) {
        onAction(action);
      }
    } catch (error) {
      console.error("Error handling payment request action:", error);
      toast.error(`Failed to ${action} payment request`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Determine if actions should be shown
  const shouldShowActions = useMemo(() => {
    return showActions && 
           request.status === "pending" && 
           !isProcessing;
  }, [showActions, request.status, isProcessing]);
  
  return (
    <div className="w-full rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <IconCurrencyDollar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium">
              {isRequester ? "You requested" : "Request from"}
            </h4>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(request.amount, request.currency)}
            </p>
          </div>
        </div>
        <Badge variant={request.status === "pending" ? "outline" : "secondary"} className={`${statusInfo.color}`}>
          {statusInfo.text}
        </Badge>
      </div>
      
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <div>
          <span>{formattedDate}</span>
          {expirationInfo && (
            <span className={`ml-2 ${expirationInfo.className}`}>
              • {expirationInfo.text}
            </span>
          )}
        </div>
        
        {shouldShowActions && !isRequester && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleAction("decline")} 
              disabled={isProcessing}
            >
              Decline
            </Button>
            <Button 
              size="sm" 
              onClick={() => handleAction("approve")} 
              disabled={isProcessing || disableApprove}
            >
              Approve
            </Button>
          </div>
        )}
        
        {shouldShowActions && isRequester && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleAction("cancel")} 
            disabled={isProcessing}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
};

export default PaymentRequestCard; 