import { Header } from "@/components/Header";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, List, QrCode, Keyboard } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useDebounce } from "@/hooks/useDebounce";
import { useState, useCallback, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

// Debug logger
const debug = {
  log: (message: string, data?: Record<string, unknown>) => {
    console.log(`[Send View] ${message}`, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  },
  error: (message: string, error?: unknown) => {
    console.error(`[Send View Error] ${message}`, {
      error,
      timestamp: new Date().toISOString(),
    });
  },
  startGroup: (name: string) => {
    console.group(`[Send View] ${name}`);
    console.log("Started at:", new Date().toISOString());
  },
  endGroup: () => {
    console.log("Ended at:", new Date().toISOString());
    console.groupEnd();
  }
};

interface User {
  _id: string;
  fullName: string;
  username: string;
  profileImageUrl?: string;
  email?: string;
}

const Send = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: recipientId } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Extract recipient info from location state
  const recipientInfo = location.state?.recipientInfo;

  debug.startGroup("Component Mount");
  debug.log("Initial state", {
    recipientId,
    hasLocationState: !!location.state,
    navigationSource: location.state?.from,
    hasRecipientInfo: !!recipientInfo,
    recipientInfo
  });
  debug.endGroup();

  // Get conversation details if ID exists
  const conversation = useQuery(
    api.messages.getMessages,
    location.state?.conversationId ? { conversationId: location.state.conversationId, limit: 1 } : "skip"
  );

  // Get other participant details if in conversation context
  const otherParticipant = useQuery(
    api.users.getOtherParticipant,
    location.state?.conversationId ? { conversationId: location.state.conversationId } : "skip"
  );

  // Search users when query exists and not in conversation context
  const searchResults = useQuery(
    api.conversations.searchUsers,
    !location.state?.conversationId && debouncedSearch ? { query: debouncedSearch } : "skip"
  );

  // Effect to handle pre-selected recipient
  useEffect(() => {
    if (recipientInfo && recipientId === recipientInfo.id) {
      debug.log("Using recipient info from navigation state", {
        recipientId,
        recipientInfo,
        from: location.state?.from
      });

      navigate(`/amount/${recipientId}`, {
        state: { 
          conversationId: location.state?.conversationId,
          from: location.state?.from || 'send',
          recipientInfo
        }
      });
    } else if (location.state?.conversationId && otherParticipant) {
      debug.log("Using recipient from conversation", {
        conversationId: location.state.conversationId,
        recipientId: otherParticipant._id,
        recipientName: otherParticipant.fullName
      });

      navigate(`/amount/${otherParticipant._id}`, {
        state: { 
          conversationId: location.state.conversationId,
          from: location.state?.from || 'send',
          recipientInfo: {
            id: otherParticipant._id,
            fullName: otherParticipant.fullName,
            username: otherParticipant.username,
            profileImageUrl: otherParticipant.profileImageUrl
          }
        }
      });
    }
  }, [recipientInfo, recipientId, location.state, otherParticipant, navigate]);

  // Log when conversation data changes
  useEffect(() => {
    if (conversation) {
      debug.log("Conversation context loaded", {
        conversationId: location.state?.conversationId,
        hasMessages: conversation.messages?.length > 0,
        lastMessage: conversation.messages?.[0]
      });
    }
  }, [conversation, location.state?.conversationId]);

  // Log when participant data changes
  useEffect(() => {
    if (otherParticipant) {
      debug.log("Other participant loaded", {
        conversationId: location.state?.conversationId,
        participantId: otherParticipant._id,
        username: otherParticipant.username,
        fullName: otherParticipant.fullName
      });
    }
  }, [otherParticipant, location.state?.conversationId]);

  // Handle search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    debug.log("Search input changed", {
      previousValue: searchQuery,
      newValue: value,
      length: value.length
    });
    setSearchQuery(value);
  }, [searchQuery]);

  // Handle user selection
  const handleUserSelect = useCallback((user: User) => {
    debug.log("User selected for payment", {
      userId: user._id,
      username: user.username,
      fromConversation: !!location.state?.conversationId
    });

    navigate(`/amount/${user._id}`, {
      state: { 
        conversationId: location.state?.conversationId,
        from: 'search',
        recipientInfo: {
          id: user._id,
          fullName: user.fullName,
          username: user.username,
          profileImageUrl: user.profileImageUrl
        }
      }
    });
  }, [navigate, location.state?.conversationId]);

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header title="Send Sats" />
      
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search users"
            className="pl-10 bg-zinc-900 border-none rounded-full"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {!searchResults || searchResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-zinc-400">
            <p className="text-lg font-medium">
              {debouncedSearch ? "No users found" : "Search for users"}
            </p>
            <p className="text-sm">
              {debouncedSearch 
                ? "Try a different search term"
                : "Enter a name or username to find someone"
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {searchResults.map((user) => (
              <button
                key={user._id}
                onClick={() => handleUserSelect(user)}
                className="w-full p-4 flex items-start space-x-4 hover:bg-zinc-900/50 transition-all"
              >
                <Avatar className="h-12 w-12 bg-blue-600 flex-shrink-0 flex items-center justify-center text-lg font-medium">
                  {user.profileImageUrl ? (
                    <img 
                      src={user.profileImageUrl} 
                      alt={user.fullName}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="uppercase">{user.fullName.charAt(0)}</span>
                  )}
                </Avatar>

                <div className="flex-1 min-w-0 text-left">
                  <h3 className="font-medium text-white">{user.fullName}</h3>
                  <p className="text-sm text-zinc-400">@{user.username}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Bottom Navigation Icons */}
      <div className="fixed bottom-0 left-0 right-0 pb-8 pt-2 bg-background border-t border-border">
        <div className="flex justify-center space-x-16">
          <button className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-white">
            <List className="h-6 w-6 text-black" />
          </button>
          <button className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-zinc-800">
            <QrCode className="h-6 w-6" />
          </button>
          <button className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-zinc-800">
            <Keyboard className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Send;