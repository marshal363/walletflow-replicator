import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const debug = {
  log: (ctx: any, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[Convex:Conversations] ${message}`, {
      ...data,
      timestamp,
    });
  },
  error: (ctx: any, message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[Convex:Conversations:Error] ${message}`, {
      error,
      timestamp,
    });
  }
};

// Create or get existing conversation between two users
export const getOrCreateConversation = mutation({
  args: {
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      debug.log(ctx, "Starting getOrCreateConversation", { otherUserId: args.otherUserId });
      
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Not authenticated");

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id")
        .filter((q) => q.eq(q.field("clerkId"), identity.subject))
        .unique();
      
      if (!user) throw new Error("User not found");
      
      debug.log(ctx, "Current user found", { 
        userId: user._id,
        username: user.username 
      });

      // Check if other user exists
      const otherUser = await ctx.db.get(args.otherUserId);
      if (!otherUser) {
        debug.error(ctx, "Other user not found", { otherUserId: args.otherUserId });
        throw new Error("Other user not found");
      }
      
      debug.log(ctx, "Other user found", { 
        otherUserId: otherUser._id,
        otherUsername: otherUser.username 
      });

      // Check for existing conversation with either participant order
      const existingConversation = await ctx.db
        .query("conversations")
        .withIndex("by_participants")
        .filter((q) => 
          q.and(
            q.eq(q.field("metadata.isGroup"), false),
            q.or(
              q.eq(q.field("participants"), [user._id, args.otherUserId]),
              q.eq(q.field("participants"), [args.otherUserId, user._id])
            )
          )
        )
        .first();

      if (existingConversation) {
        debug.log(ctx, "Found existing conversation", { 
          conversationId: existingConversation._id,
          participants: existingConversation.participants 
        });
        return existingConversation._id;
      }

      debug.log(ctx, "No existing conversation found, creating new one");

      // Create new conversation
      const now = new Date().toISOString();
      const conversationId = await ctx.db.insert("conversations", {
        participants: [user._id, args.otherUserId],
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
        status: "active",
        metadata: {
          isGroup: false,
          createdBy: user._id,
          name: undefined,
          linkedUserId: args.otherUserId,
        },
      });

      debug.log(ctx, "Created new conversation", { 
        conversationId,
        participants: [user._id, args.otherUserId]
      });

      // Create participant records
      await Promise.all([
        ctx.db.insert("conversationParticipants", {
          conversationId,
          userId: user._id,
          joinedAt: now,
          role: "admin",
          isArchived: false,
          isMuted: false,
          notificationPreferences: {
            mentions: true,
            all: true,
          },
        }),
        ctx.db.insert("conversationParticipants", {
          conversationId,
          userId: args.otherUserId,
          joinedAt: now,
          role: "member",
          isArchived: false,
          isMuted: false,
          notificationPreferences: {
            mentions: true,
            all: true,
          },
        }),
      ]);

      debug.log(ctx, "Created participant records");
      return conversationId;
    } catch (error) {
      debug.error(ctx, "Error in getOrCreateConversation", error);
      throw error;
    }
  },
});

// Search users to start a conversation
export const searchUsers = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      debug.log(ctx, "Starting user search", { query: args.query });
      
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Not authenticated");

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id")
        .filter((q) => q.eq(q.field("clerkId"), identity.subject))
        .unique();
      
      if (!user) throw new Error("User not found");

      debug.log(ctx, "Current user found", { 
        userId: user._id,
        username: user.username 
      });

      // Get all users and filter in memory
      const results = await ctx.db
        .query("users")
        .collect();

      const searchQuery = args.query.toLowerCase();
      
      // Filter and format results
      const filteredResults = results
        .filter((result) => {
          if (result._id === user._id) return false;
          
          const username = result.username?.toLowerCase() ?? "";
          const fullName = result.fullName.toLowerCase();
          
          return username.includes(searchQuery) || 
                 fullName.includes(searchQuery);
        })
        .map((result) => ({
          _id: result._id,
          fullName: result.fullName,
          username: result.username ?? "",
          profileImageUrl: result.profileImageUrl,
        }));

      debug.log(ctx, "Search results", { 
        query: args.query,
        resultCount: filteredResults.length 
      });

      return filteredResults;
    } catch (error) {
      debug.error(ctx, "Error in searchUsers", error);
      throw error;
    }
  },
}); 