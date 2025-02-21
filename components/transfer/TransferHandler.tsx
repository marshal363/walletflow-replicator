import React from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useMutation } from "convex/react";
import { Button } from "../../src/components/ui/button";
import { Id } from "../../convex/_generated/dataModel";

interface TransferHandlerProps {
  amount: number;
  recipientId: Id<"users">;
  sourceWalletId: Id<"wallets">;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function TransferHandler({ amount, recipientId, sourceWalletId, onSuccess, onError }: TransferHandlerProps) {
  console.log("[TransferHandler] Component rendered with props:", {
    amount,
    recipientId,
    sourceWalletId,
    hasSuccessCallback: !!onSuccess,
    hasErrorCallback: !!onError
  });

  const { user } = useUser();
  console.log("[TransferHandler] Current user:", { userId: user?.id });

  const navigate = useNavigate();
  const transferSats = useMutation(api.transfers.transferSats);

  const handleTransfer = async () => {
    console.log("[TransferHandler] Starting transfer...", {
      amount,
      recipientId,
      sourceWalletId,
      currentUserId: user?.id
    });

    try {
      console.log("[TransferHandler] Calling transferSats mutation...");
      const result = await transferSats({ 
        amount, 
        destinationUserId: recipientId,
        sourceWalletId,
        description: `Transfer of ${amount.toLocaleString()} sats`,
      });
      console.log("[TransferHandler] Transfer mutation result:", result);

      if (result.success) {
        console.log("[TransferHandler] Transfer successful, calling onSuccess callback");
        onSuccess?.();
        
        // Determine which conversation to navigate to based on user role
        const conversationId = user?.id === recipientId 
          ? result.destinationConversationId 
          : result.sourceConversationId;

        const messageId = user?.id === recipientId
          ? result.receivedMessageId
          : result.sentMessageId;

        console.log("[TransferHandler] Determined navigation targets:", {
          isRecipient: user?.id === recipientId,
          conversationId,
          messageId,
          allResults: {
            sourceConversationId: result.sourceConversationId,
            destinationConversationId: result.destinationConversationId,
            sentMessageId: result.sentMessageId,
            receivedMessageId: result.receivedMessageId
          }
        });
        
        const navigationPath = `/messages/${conversationId}?highlight=${messageId}`;
        console.log("[TransferHandler] Navigating to:", navigationPath);
        navigate(navigationPath);
      } else {
        console.warn("[TransferHandler] Transfer result indicated no success");
      }
    } catch (error) {
      console.error("[TransferHandler] Transfer failed:", error);
      onError?.(error as Error);
    }
  };

  return (
    <Button 
      onClick={() => {
        console.log("[TransferHandler] Transfer button clicked");
        handleTransfer();
      }} 
      variant="default"
    >
      Transfer {amount.toLocaleString()} sats
    </Button>
  );
} 