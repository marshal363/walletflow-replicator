import React, { useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/ui/avatar";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/layout/Navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

// Debug logger
const debug = {
  log: (message: string, data?: Record<string, unknown>) => {
    console.log(`[Messages View] ${message}`, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  },
  error: (message: string, error?: unknown) => {
    console.error(`[Messages View Error] ${message}`, {
      error,
      timestamp: new Date().toISOString(),
    });
  }
};

interface MessagePreview {
  _id: string;
  sender: {
    _id: string;
    fullName: string;
    username: string;
    profileImageUrl?: string;
  };
  lastMessage: {
    content: string;
    timestamp: string;
    status: "sent" | "delivered" | "read";
  } | null;
  unreadCount: number;
}

const Messages = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());

  debug.log('Component mounted/updated', {
    searchQuery,
    debouncedSearch,
  });

  // Fetch recent conversations with real-time updates
  const conversations = useQuery(api.messages.getRecentConversations, {
    limit: 50,
  });
  
  // Sort conversations by unread count and timestamp
  const sortedConversations = React.useMemo(() => {
    if (!conversations) return [];
    
    return [...conversations].sort((a, b) => {
      // First priority: unread count (higher first)
      if (a.unreadCount !== b.unreadCount) {
        return b.unreadCount - a.unreadCount;
      }
      // Second priority: last message timestamp (newer first)
      const aTime = a.lastMessage?.timestamp ?? a._id;
      const bTime = b.lastMessage?.timestamp ?? b._id;
      return bTime.localeCompare(aTime);
    });
  }, [conversations]);

  // Track conversation changes for animation
  React.useEffect(() => {
    if (!conversations) return;
    
    const newUnreadItems = new Set<string>();
    conversations.forEach(conv => {
      if (conv.unreadCount > 0) {
        newUnreadItems.add(conv._id);
      }
    });

    setAnimatingItems(newUnreadItems);
    
    // Clear animation classes after animation completes
    const timer = setTimeout(() => {
      setAnimatingItems(new Set());
    }, 500); // Match this with CSS animation duration

    return () => clearTimeout(timer);
  }, [conversations]);

  // Search users when query exists
  const searchResults = useQuery(
    api.conversations.searchUsers,
    debouncedSearch ? { query: debouncedSearch } : "skip"
  );

  // Get or create conversation mutation
  const getOrCreateConversation = useMutation(api.conversations.getOrCreateConversation);
  const markAsRead = useMutation(api.messages.markMessagesAsRead);
  const markAsDelivered = useMutation(api.messages.markMessagesAsDelivered);

  // Mark messages as delivered when conversations load
  React.useEffect(() => {
    if (conversations) {
      debug.log('Marking messages as delivered for conversations', { 
        count: conversations.length,
        conversationIds: conversations.map(c => c._id)
      });

      conversations.forEach(async (conversation) => {
        try {
          await markAsDelivered({ conversationId: conversation._id });
          debug.log('Marked messages as delivered', { conversationId: conversation._id });
        } catch (error) {
          debug.error('Failed to mark messages as delivered', {
            conversationId: conversation._id,
            error
          });
        }
      });
    }
  }, [conversations, markAsDelivered]);

  // Handle user selection from search
  const handleUserSelect = useCallback(async (userId: string) => {
    try {
      debug.log('Starting user selection flow', { 
        userId,
        currentSearch: searchQuery 
      });
      
      debug.log('Creating/retrieving conversation');
      const conversationId = await getOrCreateConversation({ otherUserId: userId });
      debug.log('Conversation created/retrieved', { conversationId });
      
      // Clear search after selecting a user
      debug.log('Clearing search query');
      setSearchQuery("");
      
      // Navigate to conversation
      debug.log('Navigating to conversation', { 
        conversationId,
        path: `/messages/${conversationId}`
      });
      navigate(`/messages/${conversationId}`);
    } catch (error) {
      debug.error('Failed to create conversation', error);
      // TODO: Show error toast
    }
  }, [getOrCreateConversation, navigate, searchQuery]);

  // Handle conversation selection
  const handleConversationSelect = useCallback(async (conversationId: string) => {
    debug.log('Starting conversation selection', { conversationId });
    
    try {
      // Mark messages as read
      await markAsRead({ conversationId });
      debug.log('Marked messages as read', { conversationId });
      
      // Navigate to conversation
      navigate(`/messages/${conversationId}`);
    } catch (error) {
      debug.error('Error marking messages as read:', error);
      // Still navigate even if marking as read fails
      navigate(`/messages/${conversationId}`);
    }
  }, [navigate, markAsRead]);

  // Handle search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    debug.log('Search input changed', { 
      previousValue: searchQuery,
      newValue: value,
      length: value.length
    });
    setSearchQuery(value);
  }, [searchQuery]);

  // Determine what to display
  const displayItems = debouncedSearch ? searchResults : sortedConversations;
  const isSearching = debouncedSearch.length > 0;

  debug.log('Display state updated', {
    isSearching,
    displayMode: isSearching ? 'search' : 'conversations',
    itemCount: displayItems?.length ?? 0
  });

  // Log when data changes
  React.useEffect(() => {
    if (conversations) {
      debug.log('Conversations loaded', { 
        count: conversations.length,
        conversations: conversations.map(c => ({
          id: c._id,
          sender: c.sender.username,
          lastMessage: c.lastMessage?.content,
          unreadCount: c.unreadCount,
          lastActivity: c.lastMessage?.timestamp
        }))
      });
    }
  }, [conversations]);

  React.useEffect(() => {
    if (searchResults) {
      debug.log('Search results loaded', { 
        query: debouncedSearch,
        count: searchResults.length,
        results: searchResults.map(r => ({
          id: r._id,
          username: r.username,
          fullName: r.fullName
        }))
      });
    }
  }, [searchResults, debouncedSearch]);

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header title="Messages" showBack={false} />
      
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search messages"
            className="pl-10 bg-zinc-900 border-none rounded-full"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {displayItems?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-zinc-400">
            <p className="text-lg font-medium">
              {isSearching ? "No users found" : "No messages yet"}
            </p>
            <p className="text-sm">
              {isSearching 
                ? "Try a different search term"
                : "Search for users to start a conversation"
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {displayItems?.map((item) => {
              const isAnimating = animatingItems.has(item._id);
              
              return (
                <button
                  key={item._id}
                  onClick={() => 
                    isSearching 
                      ? handleUserSelect(item._id)
                      : handleConversationSelect(item._id)
                  }
                  className={cn(
                    "w-full p-4 flex items-start space-x-4 hover:bg-zinc-900/50 transition-all duration-500 ease-in-out",
                    isAnimating && "animate-slide-down bg-zinc-800/30"
                  )}
                >
                  <Avatar className="h-12 w-12 bg-blue-600 flex-shrink-0 flex items-center justify-center text-lg font-medium">
                    {item.sender?.profileImageUrl ? (
                      <img 
                        src={item.sender.profileImageUrl} 
                        alt={item.sender.fullName}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="uppercase">{item.sender?.fullName.charAt(0)}</span>
                    )}
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white">
                            {isSearching ? item.fullName : item.sender?.fullName}
                          </h3>
                          {!isSearching && item.unreadCount > 0 && (
                            <div className="w-2 h-2 rounded-full bg-green-500"/>
                          )}
                        </div>
                        <p className="text-sm text-zinc-400 -mt-0.5">
                          @{isSearching ? item.username : item.sender?.username}
                        </p>
                      </div>
                      {!isSearching && item.lastMessage && (
                        <span className="text-xs text-zinc-500 flex-shrink-0">
                          {new Date(item.lastMessage.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                    
                    {!isSearching && (
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-zinc-400 truncate">
                          {item.lastMessage?.content ?? "No messages yet"}
                        </p>
                        {item.unreadCount > 0 && (
                          <div className="min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-blue-500 rounded-full text-[11px] font-medium text-white flex-shrink-0">
                            {item.unreadCount}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <Navigation />
    </div>
  );
};

export default Messages;