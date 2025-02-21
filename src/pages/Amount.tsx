import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { NumPad } from "@/components/NumPad";
import { ActionButton } from "@/components/ActionButton";
import { Avatar } from "@/components/ui/avatar";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useToast } from "@/components/ui/use-toast";
import { NumPadView } from "@/components/NumPadView";

const debug = {
  log: (message: string, data?: Record<string, unknown>) => {
    console.log("[Amount View]", `'[Client:Transfer] ${message}'`, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  },
  error: (message: string, error?: unknown) => {
    console.error("[Amount View Error]", `'[Client:Transfer] ${message}'`, {
      error,
      timestamp: new Date().toISOString(),
    });
  },
  startGroup: (message: string) => {
    console.log("[Amount View]", `'[Client:Transfer] [GROUP_START] ${message}'`, {
      timestamp: new Date().toISOString(),
    });
  },
  endGroup: () => {
    console.log("[Amount View]", `'[Client:Transfer] [GROUP_END]'`, {
      timestamp: new Date().toISOString(),
    });
  }
};

const Amount = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { id: recipientId } = useParams();
  const { toast } = useToast();

  // Extract conversation ID from state with validation
  const conversationId = location.state?.conversationId;
  const navigationSource = location.state?.from || 'standalone';

  // Track if we've shown the conversation ID warning
  const [hasShownWarning, setHasShownWarning] = useState(false);

  debug.log('Amount view mounted/updated', {
    recipientId,
    navigationSource,
    conversationId,
    hasLocationState: !!location.state
  });

  // Fetch user details directly using ID
  const user = useQuery(api.conversations.searchUsers, recipientId ? { query: "" } : "skip");
  const selectedUser = user?.find(u => u._id === recipientId);
  
  // Get current user's spending wallet
  const currentUserWallet = useQuery(api.wallets.getCurrentUserSpendingWallet);

  // Verify conversation exists if ID is provided
  const conversation = useQuery(
    api.messages.getMessages,
    conversationId ? { conversationId, limit: 1 } : "skip"
  );

  // Log initial mount with conversation context
  useEffect(() => {
    debug.startGroup("Transfer Setup");
    debug.log("Transfer view initialized", {
      recipientId,
      navigationSource,
      conversationId,
      hasLocationState: !!location.state
    });
    debug.endGroup();
  }, []);

  // Enhanced logging for user and wallet data
  useEffect(() => {
    if (selectedUser && currentUserWallet) {
      debug.startGroup("Transfer Prerequisites");
      debug.log("Source wallet validated", {
        walletId: currentUserWallet._id,
        walletBalance: currentUserWallet.balance,
        hasConversation: !!conversation
      });

      debug.log("Recipient details validated", {
        recipientId,
        recipientName: selectedUser.fullName,
        recipientUsername: selectedUser.username,
        conversationId
      });

      if (conversation) {
        debug.log("Existing conversation found", {
          conversationId,
          messageCount: conversation.messages?.length,
          lastMessageAt: conversation.messages?.[0]?.timestamp
        });
      }
      debug.endGroup();
    }
  }, [selectedUser, currentUserWallet, conversation]);

  // Show warning if conversation ID is missing
  useEffect(() => {
    if (!hasShownWarning && !conversationId && selectedUser) {
      debug.log('No conversation ID provided', {
        recipientId,
        recipientName: selectedUser.fullName,
        navigationSource
      });
      setHasShownWarning(true);
    }
  }, [conversationId, hasShownWarning, selectedUser, recipientId, navigationSource]);
  
  // Transfer mutation
  const transfer = useMutation(api.transfers.transferSats);

  const handleTransfer = async (amount: number) => {
    if (!currentUserWallet || !recipientId || !selectedUser) {
      debug.error("Transfer validation failed", {
        hasWallet: !!currentUserWallet,
        hasRecipientId: !!recipientId,
        amount,
        conversationId
      });
      return;
    }

    debug.startGroup("Transfer Execution");
    setIsLoading(true);

    try {
      debug.log("Starting transfer process", {
        sourceWalletId: currentUserWallet._id,
        destinationUserId: recipientId,
        amount,
        providedConversationId: conversationId
      });

      const result = await transfer({
        sourceWalletId: currentUserWallet._id,
        destinationUserId: recipientId,
        amount,
        description: `Transfer to ${selectedUser.fullName}`,
        conversationId
      });

      if (result.success) {
        toast({
          title: "Transfer Successful",
          description: `${amount} sats sent to ${selectedUser.fullName}`,
        });

        // Navigate back to conversation or messages list
        if (result.conversationId) {
          navigate(`/conversation/${result.conversationId}`);
        } else {
          navigate("/messages");
        }
      }
    } catch (error) {
      debug.error("Transfer execution failed", error);
      toast({
        title: "Transfer Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      debug.endGroup();
    }
  };

  if (!selectedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <NumPadView
      title="Sending To"
      recipient={{
        id: selectedUser._id,
        fullName: selectedUser.fullName,
        username: selectedUser.username,
        profileImageUrl: selectedUser.profileImageUrl
      }}
      onSubmit={handleTransfer}
      onCancel={() => navigate(-1)}
      minAmount={1}
      maxAmount={1000000} // 1M sats
      submitLabel={isLoading ? "Sending..." : "Send"}
      submitButtonClass="bg-[#0066FF] hover:bg-[#0052CC]"
      isLoading={isLoading}
      showAvailableBalance={true}
      availableBalance={currentUserWallet?.balance}
      navigationContext={{
        from: navigationSource as 'chat' | 'standalone',
        conversationId
      }}
    />
  );
};

export default Amount;