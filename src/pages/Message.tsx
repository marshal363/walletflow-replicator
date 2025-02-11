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
  _id: string;
  type: "text" | "payment_request" | "payment_sent" | "payment_received" | "system";
  content: string;
  senderId: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
  metadata?: {
    fiatAmount?: string;
    replyTo?: string;
    attachments?: string[];
    reactions?: Array<{
      userId: string;
      type: string;
    }>;
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
        hasUnread: conversation.messages.some(m => m.status === "delivered"),
        messages: conversation.messages.map(m => ({
          id: m._id,
          type: m.type,
          status: m.status,
          timestamp: m.timestamp,
          senderId: m.senderId
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

  const renderMessage = (msg: Message) => {
    if (msg.type === 'payment_request') {
      return (
        <div className="bg-zinc-900/80 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-zinc-200">Payment Request</span>
          </div>
          <div className="text-xl font-bold mb-1 text-white">
            {msg.content} BTC
          </div>
          <div className="text-xs text-zinc-400 mb-3">
            ≈ ${msg.metadata?.fiatAmount}
          </div>
          <button className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
            Pay Now
          </button>
        </div>
      );
    }

    if (msg.type === 'payment_sent' || msg.type === 'payment_received') {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm">{msg.type === 'payment_sent' ? 'You sent' : 'Received'}</span>
          <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
            {msg.content} BTC
          </span>
        </div>
      );
    }

    return <span className="text-sm">{msg.content}</span>;
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
                      msg.senderId === otherParticipant._id ? "justify-start" : "justify-end"
                    )}
                  >
                    <div className={cn(
                      "max-w-[280px]",
                      msg.type === "payment_request" ? "w-[280px]" : "max-w-[85%]",
                      msg.type === "text" && msg.senderId === otherParticipant._id ? "bg-zinc-800" : "bg-blue-600",
                      msg.type !== "payment_request" && "rounded-2xl px-4 py-2.5"
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

      {/* Fixed bottom input section */}
      <div className="sticky bottom-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/90 to-transparent" />
        <div className="relative z-10 p-4 border-t border-zinc-800/50 bg-black/40 backdrop-blur-md">
          {!showPaymentActions ? (
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setShowPaymentActions(true)}
                className="h-11 w-11 rounded-full bg-zinc-800/80 flex items-center justify-center hover:bg-zinc-700 transition-colors"
              >
                <Zap className="h-5 w-5 text-white" />
              </button>
              <div className="flex-1">
                <MessageInput
                  value={message}
                  onChange={handleMessageChange}
                  onSubmit={handleSend}
                  placeholder={`Message ${otherParticipant.username}`}
                  disabled={isSending}
                />
              </div>
            </div>
          ) : (
            <div className="flex space-x-2">
              <button 
                onClick={() => navigate(`/send/${conversationId}`)} 
                className="flex-1 bg-blue-600 text-white rounded-full py-2.5 px-4 font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Send className="h-5 w-5" />
                <span>Send</span>
              </button>
              <button 
                onClick={() => navigate(`/request/${conversationId}`)} 
                className="flex-1 bg-zinc-800/80 text-white rounded-full py-2.5 px-4 font-medium hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
              >
                <QrCode className="h-5 w-5" />
                <span>Request</span>
              </button>
              <button 
                onClick={() => navigate(`/split/${conversationId}`)} 
                className="flex-1 bg-zinc-800/80 text-white rounded-full py-2.5 px-4 font-medium hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
              >
                <Split className="h-5 w-5" />
                <span>Split</span>
              </button>
              <button 
                onClick={() => setShowPaymentActions(false)}
                className="h-11 w-11 rounded-full bg-zinc-800/80 flex items-center justify-center hover:bg-zinc-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;