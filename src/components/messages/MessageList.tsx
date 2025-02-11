import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/EmptyState";
import { formatDistanceToNow } from 'date-fns';

// Debug logger
const debug = {
  log: (message: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MessageList] ${message}`, data || '');
    }
  },
  error: (message: string, error?: unknown) => {
    console.error(`[MessageList Error] ${message}`, error || '');
  }
};

interface MessageListProps {
  items: Array<{
    _id: string;
    fullName: string;
    username: string;
    profileImageUrl?: string;
    lastMessage?: string;
    timestamp?: string;
    unread?: boolean;
    isOnline?: boolean;
  }>;
  isSearchResults?: boolean;
}

export const MessageList = ({ items, isSearchResults }: MessageListProps) => {
  const navigate = useNavigate();

  const handleNavigateToMessage = (item: MessageListProps['items'][0]) => {
    debug.log('User selected', { 
      id: item._id,
      username: item.username,
      type: isSearchResults ? 'search' : 'conversation',
      hasExistingChat: !!item.lastMessage
    });

    // Navigate to the message view
    navigate(`/messages/${item._id}`);
  };

  React.useEffect(() => {
    debug.log('MessageList mounted/updated', {
      itemCount: items.length,
      isSearchResults,
      hasUnreadMessages: items.some(item => item.unread)
    });
  }, [items, isSearchResults]);

  if (!items?.length) {
    debug.log('Rendering empty state', { 
      isSearchResults,
      reason: 'No items found'
    });
    return (
      <EmptyState 
        title={isSearchResults ? "No users found" : "No messages yet"}
        description={isSearchResults 
          ? "Try searching with a different term" 
          : "Start a conversation by searching for users above"}
        icon={isSearchResults ? "search" : "messages"}
      />
    );
  }

  debug.log('Rendering message list', { 
    itemCount: items.length,
    isSearchResults,
    hasUnreadItems: items.some(item => item.unread)
  });

  return (
    <ScrollArea className="flex-1">
      <div className="divide-y divide-zinc-800/50">
        {items.map((item) => {
          debug.log('Rendering list item', {
            id: item._id,
            type: isSearchResults ? 'search' : 'conversation',
            hasUnread: item.unread,
            hasLastMessage: !!item.lastMessage,
            username: item.username
          });

          const formattedTime = item.timestamp 
            ? formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })
            : '';

          return (
            <button
              key={item._id}
              onClick={() => handleNavigateToMessage(item)}
              className="w-full p-4 flex items-center space-x-4 hover:bg-zinc-900/50 transition-colors"
              aria-label={`Chat with ${item.fullName}`}
            >
              <div className="relative">
                <Avatar 
                  className="h-12 w-12 bg-blue-600 flex items-center justify-center text-lg font-medium"
                >
                  {item.profileImageUrl ? (
                    <img 
                      src={item.profileImageUrl} 
                      alt={item.fullName}
                      onError={(e) => {
                        debug.error('Failed to load avatar image', {
                          userId: item._id,
                          username: item.username,
                          src: item.profileImageUrl
                        });
                        e.currentTarget.src = ''; // Clear the src to show initials
                      }}
                    />
                  ) : (
                    item.fullName?.substring(0, 2).toUpperCase()
                  )}
                </Avatar>
                {item.isOnline && (
                  <div 
                    className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"
                    aria-label="Online"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-medium text-white">{item.fullName}</h3>
                    <p className="text-sm text-zinc-400">@{item.username}</p>
                  </div>
                  {item.lastMessage && formattedTime && (
                    <span className="text-xs text-zinc-400 flex-shrink-0">
                      {formattedTime}
                    </span>
                  )}
                </div>
                {item.lastMessage && (
                  <div className="flex justify-between items-end">
                    <p className="text-sm text-zinc-400 truncate pr-4">
                      {item.lastMessage}
                    </p>
                    {item.unread && (
                      <div 
                        className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"
                        aria-label="Unread message"
                      />
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}; 