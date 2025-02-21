import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/ui/avatar";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { MessageInput } from "@/components/messages/MessageInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Send, Zap, QrCode, Split, ArrowLeft } from "lucide-react";
import { PaymentRequestCard } from "@/components/messages/PaymentRequestCard";
import { useUser } from "@clerk/clerk-react";
import { Id } from "@convex/_generated/dataModel";
import { ActionBar } from "@/components/messages/ActionBar";

// Debug logger
const debug = {
  log: (message: string, data?: Record<string, unknown>) => {
    console.log(`[Message View] ${message}`, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  },
  error: (message: string, error?: unknown) => {
    console.error(`[Message View Error] ${message}`, {
      error,
      timestamp: new Date().toISOString(),
    });
  }
};

interface Message {
  _id: Id<"messages">;
  type: "text" | "payment_request" | "payment" | "payment_sent" | "payment_received" | "system";
  content: string;
  senderId: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
  metadata?: {
    fiatAmount?: number;
    amount?: number;
    recipientId?: string;
    senderId?: string;
    transferId?: string;
    replyTo?: string;
    attachments?: string[];
    reactions?: Array<{
      userId: string;
      type: string;
    }>;
    requestStatus?: "pending" | "approved" | "declined" | "cancelled";
    expiresAt?: string;
  };
}

const Message = () => {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showPaymentActions, setShowPaymentActions] = useState(false);
  const navigate = useNavigate();
  const { id: conversationId } = useParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  debug.log('Component mounted/updated', { 
    conversationId,
    messageInputLength: message.length,
    isSending
  });

  // Fetch conversation details
  const conversation = useQuery(
    api.messages.getMessages,
    conversationId ? { conversationId, limit: 50 } : "skip"
  );

  // Get other participant's details
  const otherParticipant = useQuery(
    api.users.getOtherParticipant,
    conversationId ? { conversationId } : "skip"
  );

  // Send message mutation
  const sendMessage = useMutation(api.messages.sendMessage);

  // Mark messages as read mutation
  const markAsRead = useMutation(api.messages.markMessagesAsRead);

  // Log when conversation data changes
  useEffect(() => {
    if (conversation?.messages) {
      debug.log('Messages loaded', { 
        conversationId,
        messageCount: conversation.messages.length,
        messages: conversation.messages.map(m => ({
          id: m._id,
          type: m.type,
          content: m.content,
          metadata: m.metadata,
          senderId: m.senderId,
          timestamp: m.timestamp
        }))
      });
    }
  }, [conversation?.messages, conversationId]);

  // Log when participant data changes
  useEffect(() => {
    if (otherParticipant) {
      debug.log('Other participant loaded', {
        conversationId,
        participantId: otherParticipant._id,
        username: otherParticipant.username,
        fullName: otherParticipant.fullName,
        status: otherParticipant.status
      });
    }
  }, [otherParticipant, conversationId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      debug.log('Scrolling to bottom', { 
        conversationId,
        messageCount: conversation?.messages?.length,
        scrollBehavior: "smooth"
      });
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation?.messages, conversationId]);

  // Mark messages as read when they become visible
  useEffect(() => {
    if (conversation?.messages) {
      const unreadMessages = conversation.messages
        .filter((msg) => msg.status === "delivered")
        .map((msg) => msg._id);

      if (unreadMessages.length > 0) {
        debug.log('Starting to mark messages as read', { 
          conversationId,
          messageIds: unreadMessages,
          count: unreadMessages.length
        });
        markAsRead({ messageIds: unreadMessages }).catch((error) => {
          debug.error('Failed to mark messages as read', error);
        });
      }
    }
  }, [conversation?.messages, markAsRead, conversationId]);

  const handleMessageChange = useCallback((value: string) => {
    debug.log('Message input changed', { 
      conversationId,
      previousLength: message.length,
      newLength: value.length,
      isEmpty: !value.trim(),
      isMultiline: value.includes('\n')
    });
    setMessage(value);
  }, [conversationId, message.length]);

  const handleSend = useCallback(async () => {
    if (!conversationId || !message.trim() || isSending) {
      debug.log('Send prevented', { 
        conversationId,
        hasMessage: !!message.trim(),
        messageLength: message.length,
        isSending,
        reason: !conversationId ? "no conversation" : !message.trim() ? "empty message" : "already sending"
      });
      return;
    }

    try {
      debug.log('Starting to send message', { 
        conversationId,
        content: message,
        type: "text",
        timestamp: new Date().toISOString()
      });
      
      setIsSending(true);
      const messageId = await sendMessage({
        conversationId,
        content: message.trim(),
        type: "text",
      });
      
      debug.log('Message sent successfully', {
        conversationId,
        messageId,
        timestamp: new Date().toISOString()
      });
      setMessage("");
    } catch (error) {
      debug.error('Failed to send message', error);
      // TODO: Show error toast
    } finally {
      setIsSending(false);
    }
  }, [conversationId, message, isSending, sendMessage]);

  // Log when payment actions are toggled
  const handlePaymentActionsToggle = (show: boolean) => {
    debug.log('Payment actions visibility toggled', {
      conversationId,
      showPaymentActions: show,
      otherParticipantId: otherParticipant?._id,
      timestamp: new Date().toISOString()
    });
    setShowPaymentActions(show);
  };

  // Log when send action is clicked
  const handleSendClick = () => {
    if (!otherParticipant) {
      debug.error('Cannot send payment - recipient not found', {
        conversationId,
        hasOtherParticipant: false
      });
      return;
    }

    debug.log('Send payment action clicked', {
      conversationId,
      recipientId: otherParticipant._id,
      recipientName: otherParticipant.fullName,
      timestamp: new Date().toISOString()
    });

    navigate(`/amount/${otherParticipant._id}`, {
      state: { 
        conversationId,
        from: 'chat',
        recipientInfo: {
          id: otherParticipant._id,
          fullName: otherParticipant.fullName,
          username: otherParticipant.username,
          profileImageUrl: otherParticipant.profileImageUrl
        }
      }
    });
  };

  const handleRequestClick = () => {
    if (!otherParticipant) {
      debug.error('Cannot request payment - recipient not found', {
        conversationId,
        hasOtherParticipant: false
      });
      return;
    }

    debug.log('Request payment action clicked', {
      conversationId,
      recipientId: otherParticipant._id,
      recipientName: otherParticipant.fullName,
      timestamp: new Date().toISOString()
    });

    navigate(`/request/${otherParticipant._id}`, {
      state: { 
        conversationId,
        from: 'chat',
        recipientInfo: {
          id: otherParticipant._id,
          fullName: otherParticipant.fullName,
          username: otherParticipant.username,
          profileImageUrl: otherParticipant.profileImageUrl
        }
      }
    });
  };

  const renderMessage = (msg: Message) => {
    debug.log('Rendering message', {
      messageId: msg._id,
      type: msg.type,
      senderId: msg.senderId,
      timestamp: msg.timestamp
    });

    if (msg.type === 'payment_sent') {
      return (
        <div className="flex items-center gap-2 bg-blue-500/10 rounded-xl p-3">
          <Zap className="h-4 w-4 text-blue-500" />
          <div className="flex flex-col">
            <span className="text-sm text-zinc-300">{msg.content}</span>
            {msg.metadata?.amount && (
              <span className="text-xs text-zinc-400">
                Amount: {msg.metadata.amount.toLocaleString()} sats
              </span>
            )}
          </div>
        </div>
      );
    }

    if (msg.type === 'payment_received') {
      return (
        <div className="flex items-center gap-2 bg-green-500/10 rounded-xl p-3">
          <Zap className="h-4 w-4 text-green-500" />
          <div className="flex flex-col">
            <span className="text-sm text-zinc-300">{msg.content}</span>
            {msg.metadata?.amount && (
              <span className="text-xs text-zinc-400">
                Amount: {msg.metadata.amount.toLocaleString()} sats
              </span>
            )}
          </div>
        </div>
      );
    }

    if (msg.type === 'payment_request') {
      return (
        <div className="w-[280px]">
          <PaymentRequestCard
            messageId={msg._id}
            onAction={(action) => {
              debug.log('Payment request action handled', {
                action,
                messageId: msg._id,
                timestamp: new Date().toISOString()
              });
            }}
          />
        </div>
      );
    }

    return <span className="text-base">{msg.content}</span>;
  };

  if (!conversationId) {
    debug.log('No conversation ID, redirecting to messages');
    navigate("/messages");
    return null;
  }

  if (!otherParticipant) {
    debug.log('Loading participant details');
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <div className="sticky top-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-black/90 to-transparent" />
        <div className="relative z-10">
          {/* Back button and profile section */}
          <div className="flex items-center p-4 gap-3 border-b border-zinc-800/50 bg-black/40 backdrop-blur-md">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-zinc-800/50 rounded-full transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <Avatar className="h-10 w-10 bg-blue-500 flex items-center justify-center text-xl font-semibold">
              <span className="uppercase">
                {otherParticipant.username?.charAt(0) || otherParticipant.fullName.charAt(0)}
              </span>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{otherParticipant.fullName}</h2>
                {otherParticipant.status === "active" && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                )}
              </div>
              <p className="text-sm text-zinc-400">@{otherParticipant.username}</p>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        {!conversation?.messages?.length ? (
          <div className="flex items-center justify-center h-full text-zinc-500">
            No messages yet. Start a conversation!
          </div>
        ) : (
          <div className="space-y-2 py-4">
            {conversation.messages.map((msg, index) => {
              const showTimestamp = index === 0 || 
                new Date(msg.timestamp).getTime() - new Date(conversation.messages[index - 1].timestamp).getTime() > 300000;

              return (
                <div key={msg._id}>
                  {showTimestamp && (
                    <div className="text-center my-4">
                      <span className="text-xs text-zinc-500">
                        {new Date(msg.timestamp).toLocaleString('en-US', {
                          weekday: 'short',
                          hour: 'numeric',
                          minute: 'numeric',
                          hour12: true
                        })}
                      </span>
                    </div>
                  )}
                  <div 
                    className={cn(
                      "flex",
                      msg.senderId === otherParticipant._id ? "justify-start" : "justify-end",
                      "mb-4"
                    )}
                  >
                    <div className={cn(
                      msg.type === "payment_request" ? "w-[280px]" : "max-w-[85%]",
                      msg.type === "text" && msg.senderId === otherParticipant._id ? "bg-zinc-800" : msg.type === "text" ? "bg-blue-600" : "bg-transparent",
                      msg.type === "text" && "rounded-2xl px-5 py-3"
                    )}>
                      {renderMessage(msg as Message)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Replace the old action bar with the new one */}
      <div className="sticky bottom-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/90 to-transparent" />
        <div className="relative z-10">
          <ActionBar
            onSend={handleSend}
            onSendClick={handleSendClick}
            onRequestClick={handleRequestClick}
            onSplitClick={() => navigate(`/split/${conversationId}`)}
            isSending={isSending}
            messageValue={message}
            onMessageChange={handleMessageChange}
            recipientUsername={otherParticipant?.username}
          />
        </div>
      </div>
    </div>
  );
};

export default Message;