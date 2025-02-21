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
  const [amount, setAmount] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { id: recipientId } = useParams();
  const { toast } = useToast();

  // Extract conversation ID from state with validation
  const conversationId = location.state?.conversationId;

  // Track if we've shown the conversation ID warning
  const [hasShownWarning, setHasShownWarning] = useState(false);

  debug.log('Amount view mounted/updated', {
    recipientId,
    currentAmount: amount,
    isLoading,
    conversationId,
    hasLocationState: !!location.state,
    navigationSource: location.state?.from
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
      currentAmount: amount,
      isLoading,
      conversationId,
      hasLocationState: !!location.state,
      navigationSource: location.state?.from
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
        navigationSource: location.state?.from
      });
      setHasShownWarning(true);
    }
  }, [conversationId, hasShownWarning, selectedUser, recipientId, location.state]);
  
  // Transfer mutation
  const transfer = useMutation(api.transfers.transferSats);

  const handleNumberPress = (num: string) => {
    debug.log('Number pressed', {
      digit: num,
      currentAmount: amount,
      timestamp: new Date().toISOString()
    });

    if (amount === "0" && num !== ".") {
      setAmount(num);
    } else if (num === "." && amount.includes(".")) {
      debug.log('Decimal point prevented - already exists', {
        currentAmount: amount
      });
      return;
    } else {
      setAmount(prev => prev + num);
    }
  };

  const handleDelete = () => {
    debug.log('Delete pressed', {
      currentAmount: amount,
      newAmount: amount.length > 1 ? amount.slice(0, -1) : "0",
      timestamp: new Date().toISOString()
    });
    setAmount(prev => prev.length > 1 ? prev.slice(0, -1) : "0");
  };

  const handleTransfer = async () => {
    if (!currentUserWallet || !recipientId) {
      debug.error("Transfer validation failed", {
        hasWallet: !!currentUserWallet,
        hasRecipientId: !!recipientId,
        amount,
        conversationId
      });
      return;
    }

    debug.startGroup("Transfer Execution");
    
    debug.log("Starting transfer process", {
      sourceWalletId: currentUserWallet._id,
      destinationUserId: recipientId,
      amount,
      providedConversationId: conversationId,
      hasExistingConversation: !!conversation
    });

    setIsLoading(true);
    try {
      const amountInSats = parseFloat(amount);
      if (isNaN(amountInSats) || amountInSats <= 0) {
        throw new Error("Invalid amount");
      }

      debug.log("Source details", {
        sourceWalletId: currentUserWallet._id,
        sourceBalance: currentUserWallet.balance,
        transferAmount: amountInSats,
        hasConversation: !!conversation
      });

      debug.log("Destination details", {
        destinationUserId: recipientId,
        destinationName: selectedUser?.fullName,
        destinationUsername: selectedUser?.username,
        hasConversation: !!conversation
      });

      debug.startGroup("Conversation Flow");
      debug.log("Starting conversation validation", {
        providedConversationId: conversationId,
        hasExistingConversation: !!conversation,
        participants: {
          source: currentUserWallet._id,
          destination: recipientId
        }
      });

      if (conversation) {
        debug.log("Existing conversation details", {
          conversationId,
          messageCount: conversation.messages?.length,
          lastMessageAt: conversation.messages?.[0]?.timestamp,
          participants: conversation.messages?.[0]?.senderId
        });
      }

      const result = await transfer({
        sourceWalletId: currentUserWallet._id,
        destinationUserId: recipientId,
        amount: amountInSats,
        description: `Transfer to ${selectedUser?.fullName || 'user'}`,
        conversationId
      });

      debug.log("Transfer mutation completed", {
        success: result.success,
        transferId: result.transferId,
        resultConversationId: result.conversationId,
        originalConversationId: result.originalConversationId,
        isExistingConversation: result.isExistingConversation,
        sentMessageId: result.sentMessageId,
        receivedMessageId: result.receivedMessageId
      });

      debug.startGroup("Conversation Resolution");
      debug.log("Conversation status", {
        providedConversationId: conversationId,
        resultConversationId: result.conversationId,
        originalConversationId: result.originalConversationId,
        isNewConversation: !result.isExistingConversation,
        isExistingConversation: result.isExistingConversation,
        validationDetails: {
          hadProvidedId: !!conversationId,
          matchedOriginal: result.conversationId === conversationId,
          isValid: result.success
        }
      });

      if (result.success) {
        const targetConversationId = result.conversationId;
        
        debug.log("Conversation details", {
          targetConversationId,
          originalConversationId: result.originalConversationId,
          isNewConversation: !result.isExistingConversation,
          isExistingConversation: result.isExistingConversation,
          transferDetails: {
            transferId: result.transferId,
            amount: amountInSats,
            recipientName: selectedUser?.fullName
          },
          validationResult: {
            success: true,
            matchesProvided: targetConversationId === conversationId
          }
        });

        debug.log("Message details", {
          conversationId: targetConversationId,
          sentMessageId: result.sentMessageId,
          receivedMessageId: result.receivedMessageId,
          transferId: result.transferId,
          messageFlow: {
            hasValidConversation: !!targetConversationId,
            isExistingConversation: result.isExistingConversation,
            messagesPaired: !!result.sentMessageId && !!result.receivedMessageId
          }
        });

        toast({
          title: "Transfer Successful",
          description: `${amount} sats sent to ${selectedUser?.fullName}`,
        });

        debug.log("Navigation preparation", {
          destination: `/conversation/${targetConversationId}`,
          transferComplete: true,
          amount: amountInSats,
          recipientName: selectedUser?.fullName,
          conversationFlow: {
            providedId: conversationId,
            finalId: targetConversationId,
            isNew: !result.isExistingConversation,
            messageIds: {
              sent: result.sentMessageId,
              received: result.receivedMessageId
            }
          },
          navigationDetails: {
            hasValidTarget: !!targetConversationId,
            matchesOriginal: targetConversationId === conversationId,
            isNewConversation: !result.isExistingConversation
          }
        });

        debug.endGroup(); // End Conversation Resolution
        debug.endGroup(); // End Conversation Flow
        debug.endGroup(); // End Transfer Execution

        navigate(`/conversation/${targetConversationId}`);
      }
    } catch (error) {
      debug.error("Transfer execution failed", {
        phase: "execution",
        error: error instanceof Error ? error.message : "Unknown error",
        context: {
          recipientId,
          amount,
          walletId: currentUserWallet._id,
          conversationId,
          conversationState: {
            hadProvidedId: !!conversationId,
            hadExistingConversation: !!conversation,
            validationFailed: true
          }
        }
      });
      
      toast({
        title: "Transfer Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });

      debug.endGroup(); // End Conversation Flow
      debug.endGroup(); // End Transfer Execution
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