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

  debug.log('Component mounted/updated', {
    searchQuery,
    debouncedSearch,
  });

  // Fetch recent conversations with real-time updates
  const conversations = useQuery(api.messages.getRecentConversations, {
    limit: 50,
  });
  
  // Search users when query exists
  const searchResults = useQuery(
    api.conversations.searchUsers,
    debouncedSearch ? { query: debouncedSearch } : "skip"
  );

  // Get or create conversation mutation
  const getOrCreateConversation = useMutation(api.conversations.getOrCreateConversation);

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
  const handleConversationSelect = useCallback((conversationId: string) => {
    debug.log('Starting conversation selection', { conversationId });
    navigate(`/messages/${conversationId}`);
  }, [navigate]);

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
  const displayItems = debouncedSearch ? searchResults : conversations;
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
            {displayItems?.map((item) => (
              <button
                key={item._id}
                onClick={() => 
                  isSearching 
                    ? handleUserSelect(item._id)
                    : handleConversationSelect(item._id)
                }
                className="w-full p-4 flex items-center space-x-4 hover:bg-zinc-900/50 transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-12 w-12 bg-blue-600 flex items-center justify-center text-lg font-medium">
                    {item.sender?.profileImageUrl ? (
                      <img 
                        src={item.sender.profileImageUrl} 
                        alt={item.sender.fullName}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span>{item.sender?.fullName.charAt(0)}</span>
                    )}
                  </Avatar>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h3 className="font-medium text-white">
                        {isSearching ? item.fullName : item.sender?.fullName}
                      </h3>
                      <p className="text-sm text-zinc-400">
                        @{isSearching ? item.username : item.sender?.username}
                      </p>
                    </div>
                    {!isSearching && item.lastMessage && (
                      <span className="text-xs text-zinc-400 flex-shrink-0">
                        {new Date(item.lastMessage.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>
                  
                  {!isSearching && (
                    <div className="flex justify-between items-end">
                      <p className="text-sm text-zinc-400 truncate pr-4">
                        {item.lastMessage?.content ?? "No messages yet"}
                      </p>
                      {item.unreadCount > 0 && (
                        <div className={cn(
                          "min-w-[20px] h-5 px-1.5 flex items-center justify-center",
                          "bg-blue-500 rounded-full text-xs font-medium"
                        )}>
                          {item.unreadCount}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      <Navigation />
    </div>
  );
};

export default Messages;