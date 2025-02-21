import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { NumPad } from "@/components/NumPad";
import { ActionButton } from "@/components/ActionButton";
import { Avatar } from "@/components/ui/avatar";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useToast } from "@/components/ui/use-toast";

const debug = {
  log: (message: string, data?: Record<string, unknown>) => {
    console.log("[Request Amount View]", `'[Client:Request] ${message}'`, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  },
  error: (message: string, error?: unknown) => {
    console.error("[Request Amount View Error]", `'[Client:Request] ${message}'`, {
      error,
      timestamp: new Date().toISOString(),
    });
  },
  startGroup: (name: string) => {
    console.group("[Request Amount View]", `'[Client:Request] ${name}'`);
    console.log("Started at:", new Date().toISOString());
  },
  endGroup: () => {
    console.log("Ended at:", new Date().toISOString());
    console.groupEnd();
  }
};

const RequestAmount = () => {
  const [amount, setAmount] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { id: recipientId } = useParams();
  const { toast } = useToast();

  // Extract conversation ID from state with validation
  const conversationId = location.state?.conversationId;

  // Log initial mount
  useEffect(() => {
    debug.startGroup("Component Mount");
    debug.log("Initial state", {
      recipientId,
      conversationId,
      navigationSource: location.state?.from,
      hasLocationState: !!location.state
    });
    debug.endGroup();
  }, [recipientId, location.state]);

  // Get current user
  const currentUser = useQuery(api.users.getCurrentUser);

  // Fetch recipient details
  const users = useQuery(api.conversations.searchUsers, { query: "" });
  const selectedUser = users?.find(u => u._id === recipientId);

  // Log when user data changes
  useEffect(() => {
    if (users) {
      debug.log("Users data updated", {
        usersCount: users.length,
        hasSelectedUser: !!selectedUser,
        selectedUserId: recipientId,
        currentUserId: currentUser?._id,
        selectedUserDetails: selectedUser ? {
          fullName: selectedUser.fullName,
          username: selectedUser.username
        } : null
      });
    }
  }, [users, selectedUser, recipientId, currentUser]);

  // Create payment request mutation
  const createRequest = useMutation(api.paymentRequests.createChatPaymentRequest);

  const handleNumberPress = (num: string) => {
    debug.log('Number pressed', {
      digit: num,
      currentAmount: amount,
      newAmount: amount === "0" && num !== "." ? num : amount + num
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
      newAmount: amount.length > 1 ? amount.slice(0, -1) : "0"
    });
    setAmount(prev => prev.length > 1 ? prev.slice(0, -1) : "0");
  };

  const handleRequest = async () => {
    if (!currentUser || !recipientId || !conversationId) {
      debug.error("Request validation failed", {
        hasCurrentUser: !!currentUser,
        hasRecipientId: !!recipientId,
        hasConversationId: !!conversationId,
        amount,
        selectedUser: selectedUser ? {
          id: selectedUser._id,
          fullName: selectedUser.fullName
        } : null
      });
      
      toast({
        title: "Error",
        description: "Missing required information to create request",
        variant: "destructive",
      });
      return;
    }

    debug.startGroup("Request Creation");
    debug.log("Starting request process", {
      currentUserId: currentUser._id,
      recipientId,
      amount,
      conversationId,
      selectedUser: {
        id: selectedUser?._id,
        fullName: selectedUser?.fullName
      }
    });

    setIsLoading(true);
    try {
      const amountInSats = parseFloat(amount);
      if (isNaN(amountInSats) || amountInSats <= 0) {
        throw new Error("Invalid amount");
      }

      debug.log("Creating request", {
        requesterId: currentUser._id,
        recipientId,
        amount: amountInSats,
        type: "lightning",
        description: `Payment request for ${amountInSats} sats`
      });

      const result = await createRequest({
        requesterId: currentUser._id,
        recipientId,
        conversationId,
        amount: amountInSats,
        type: "lightning", // Default to lightning for now
        description: `Payment request for ${amountInSats} sats`
      });

      debug.log("Request created successfully", {
        requestId: result.requestId,
        messageId: result.messageId,
        amount: amountInSats,
        recipientName: selectedUser?.fullName
      });

      toast({
        title: "Request Sent",
        description: `Requested ${amount} sats from ${selectedUser?.fullName}`,
      });

      debug.log("Navigating to conversation", {
        conversationId,
        requestId: result.requestId
      });

      navigate(`/conversation/${conversationId}`);
    } catch (error) {
      debug.error("Request creation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        currentUserId: currentUser._id,
        recipientId,
        amount,
        conversationId,
        context: {
          selectedUser: selectedUser ? {
            id: selectedUser._id,
            fullName: selectedUser.fullName
          } : null,
          navigationSource: location.state?.from
        }
      });
      
      toast({
        title: "Request Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      debug.endGroup();
    }
  };

  // Calculate USD value (this is a placeholder - you should use a real BTC/USD rate)
  const usdAmount = parseFloat(amount) * 0.00043; // Example rate: 1 sat = $0.00043 USD

  const isRequestDisabled = !currentUser || amount === "0" || isLoading || !conversationId || !selectedUser;

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header title="Requesting From" />

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
        <p className="text-sm text-zinc-400">@{selectedUser?.username || "..."}</p>
        
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
            onClick={handleRequest}
            disabled={isRequestDisabled}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-emerald-600/50"
          >
            {isLoading ? "Requesting..." : "Request"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default RequestAmount; 