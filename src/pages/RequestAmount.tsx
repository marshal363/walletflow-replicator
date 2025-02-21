import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { NumPad } from "@/components/NumPad";
import { ActionButton } from "@/components/ActionButton";
import { Avatar } from "@/components/ui/avatar";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useToast } from "@/components/ui/use-toast";
import { NumPadView } from "@/components/NumPadView";

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
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { id: recipientId } = useParams();
  const { toast } = useToast();

  // Extract conversation ID and recipient info from state with validation
  const conversationId = location.state?.conversationId;
  const recipientInfo = location.state?.recipientInfo;
  const navigationSource = location.state?.from || 'standalone';

  // Get current user
  const currentUser = useQuery(api.users.getCurrentUser);

  // Get conversation details if ID exists
  const conversation = useQuery(
    api.messages.getMessages,
    conversationId ? { conversationId, limit: 1 } : "skip"
  );

  // Get other participant details if in conversation context
  const otherParticipant = useQuery(
    api.users.getOtherParticipant,
    conversationId ? { conversationId } : "skip"
  );

  // Determine selected user from various sources
  const selectedUser = recipientInfo ? {
    _id: recipientInfo.id,
    fullName: recipientInfo.fullName,
    username: recipientInfo.username,
    profileImageUrl: recipientInfo.profileImageUrl
  } : otherParticipant;

  // Log when user data changes
  useEffect(() => {
    debug.startGroup("User Data Update");
    debug.log("User context", {
      currentUserId: currentUser?._id,
      recipientId,
      hasSelectedUser: !!selectedUser,
      fromConversation: !!conversationId,
      selectedUserDetails: selectedUser ? {
        fullName: selectedUser.fullName,
        username: selectedUser.username
      } : null,
      source: recipientInfo ? 'navigation_state' : conversationId ? 'conversation' : 'direct'
    });
    debug.endGroup();
  }, [currentUser, selectedUser, recipientId, conversationId, recipientInfo]);

  // Create payment request mutation
  const createRequest = useMutation(api.paymentRequests.createChatPaymentRequest);

  const handleRequest = async (amount: number) => {
    if (!currentUser || !recipientId || !conversationId || !selectedUser) {
      debug.error("Request validation failed", {
        hasCurrentUser: !!currentUser,
        hasRecipientId: !!recipientId,
        hasConversationId: !!conversationId,
        hasSelectedUser: !!selectedUser,
        amount,
        selectedUser: selectedUser ? {
          id: selectedUser._id,
          fullName: selectedUser.fullName
        } : null,
        source: recipientInfo ? 'navigation_state' : conversationId ? 'conversation' : 'direct'
      });
      
      toast({
        title: "Error",
        description: "Missing required information to create request",
        variant: "destructive",
      });
      return;
    }

    debug.startGroup("Request Creation");
    setIsLoading(true);

    try {
      debug.log("Creating request", {
        requesterId: currentUser._id,
        recipientId,
        amount,
        type: "lightning",
        description: `Payment request for ${amount} sats`
      });

      const result = await createRequest({
        requesterId: currentUser._id,
        recipientId,
        conversationId,
        amount,
        type: "lightning",
        description: `Payment request for ${amount} sats`
      });

      debug.log("Request created successfully", {
        requestId: result.requestId,
        messageId: result.messageId,
        amount,
        recipientName: selectedUser.fullName
      });

      toast({
        title: "Request Sent",
        description: `Requested ${amount} sats from ${selectedUser.fullName}`,
      });

      navigate(`/conversation/${conversationId}`);
    } catch (error) {
      debug.error("Request creation failed", error);
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

  if (!selectedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <NumPadView
      title="Requesting From"
      recipient={{
        id: selectedUser._id,
        fullName: selectedUser.fullName,
        username: selectedUser.username,
        profileImageUrl: selectedUser.profileImageUrl
      }}
      onSubmit={handleRequest}
      onCancel={() => navigate(-1)}
      minAmount={1}
      maxAmount={1000000} // 1M sats
      submitLabel={isLoading ? "Requesting..." : "Request"}
      submitButtonClass="bg-emerald-600 hover:bg-emerald-500"
      isLoading={isLoading}
      showAvailableBalance={false}
      navigationContext={{
        from: navigationSource as 'chat' | 'standalone',
        conversationId
      }}
    />
  );
};

export default RequestAmount; 