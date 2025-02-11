import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/ui/avatar";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { MessageInput } from "@/components/messages/MessageInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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

const Message = () => {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
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
      <Header 
        title={otherParticipant.fullName}
        subtitle={`@${otherParticipant.username}`}
        showBack={true}
      >
        {otherParticipant.status === "active" && (
          <div className="w-2 h-2 bg-green-500 rounded-full ml-2" />
        )}
      </Header>

      <ScrollArea className="flex-1 p-4">
        {!conversation?.messages?.length ? (
          <div className="flex items-center justify-center h-full text-zinc-500">
            No messages yet. Start a conversation!
          </div>
        ) : (
          <div className="space-y-4">
            {conversation.messages.map((msg) => (
              <div 
                key={msg._id}
                className={cn(
                  "flex",
                  msg.senderId === otherParticipant._id ? "justify-start" : "justify-end"
                )}
              >
                <div className={cn(
                  "max-w-[80%] p-3 rounded-lg",
                  msg.type === "payment_request" && "bg-purple-900/50 border border-purple-500/50",
                  msg.type === "payment_sent" && "bg-green-900/50 border border-green-500/50",
                  msg.type === "payment_received" && "bg-blue-900/50 border border-blue-500/50",
                  msg.type === "text" && msg.senderId === otherParticipant._id ? "bg-zinc-800" : "bg-blue-600"
                )}>
                  <p className="text-sm">{msg.content}</p>
                  <span className="text-xs text-zinc-400">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <div className="p-4 space-y-4">
        <MessageInput
          value={message}
          onChange={handleMessageChange}
          onSubmit={handleSend}
          placeholder={`Message ${otherParticipant.username}`}
          disabled={isSending}
        />
      </div>
    </div>
  );
};

export default Message;