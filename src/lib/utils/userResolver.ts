import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface User {
  _id: Id<"users">;
  clerkId: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  profileImageUrl?: string;
}

interface CachedUser {
  user: User;
  timestamp: number;
}

// Cache for resolved users
const userCache = new Map<Id<"users">, CachedUser>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useUserResolver() {
  const getUser = useQuery(api.users.getUser);

  const resolveUser = async (userId: Id<"users">): Promise<User | null> => {
    const now = Date.now();
    const cached = userCache.get(userId);

    // Return cached user if still valid
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.user;
    }

    try {
      const user = await getUser({ userId });
      if (user) {
        userCache.set(userId, {
          user: {
            _id: user._id,
            clerkId: user.clerkId,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            profileImageUrl: user.profileImageUrl
          },
          timestamp: now
        });
        return user;
      }
      return null;
    } catch (error) {
      console.error("[UserResolver] Failed to resolve user:", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
      return null;
    }
  };

  return { resolveUser };
} 