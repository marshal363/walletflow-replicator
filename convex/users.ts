import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const getUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const createOrUpdateUser = mutation({
  args: {
    // Clerk Identity Information
    clerkId: v.string(),
    email: v.string(),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    fullName: v.string(),
    profileImageUrl: v.optional(v.string()),
    
    // Timestamps from Clerk
    createdAt: v.string(),
    lastSignInAt: v.optional(v.string()),
    
    // Optional preferences
    preferences: v.optional(v.object({
      defaultCurrency: v.optional(v.string()),
      notifications: v.optional(v.boolean()),
      twoFactorEnabled: v.optional(v.boolean()),
      theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
      language: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    const now = new Date().toISOString();
    
    // Default preferences with proper type for theme
    const defaultPreferences = {
      defaultCurrency: "USD",
      notifications: true,
      twoFactorEnabled: false,
      theme: "system" as "system" | "light" | "dark",
      language: "en",
    };

    if (existingUser) {
      // Update existing user
      return await ctx.db.patch(existingUser._id, {
        email: args.email,
        username: args.username,
        firstName: args.firstName,
        lastName: args.lastName,
        fullName: args.fullName,
        profileImageUrl: args.profileImageUrl,
        lastSignInAt: args.lastSignInAt,
        updatedAt: now,
        preferences: args.preferences ? { ...defaultPreferences, ...args.preferences } : undefined,
      });
    }

    // Create new user
    const user = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      username: args.username,
      firstName: args.firstName,
      lastName: args.lastName,
      fullName: args.fullName,
      profileImageUrl: args.profileImageUrl,
      createdAt: args.createdAt,
      lastSignInAt: args.lastSignInAt,
      updatedAt: now,
      preferences: { ...defaultPreferences, ...args.preferences ?? {} },
      status: "active", // Default status for new users
    });

    return user;
  },
});

// Mutation to create sample users data
export const createSampleUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();

    // Create first user - Sergio
    const sergioUser = await ctx.db.insert("users", {
      clerkId: "user_2sGWImy48dApqzsf192ipLnCajY",
      email: "sergioandres.363@gmail.com", // Replace with actual email
      username: "dominusmendacium",
      firstName: "Sergio Andres",
      lastName: "Ardila Diaz",
      fullName: "Sergio Andres Ardila Diaz",
      profileImageUrl: "", // Add actual profile image URL if available
      createdAt: now,
      lastSignInAt: now,
      updatedAt: now,
      preferences: {
        defaultCurrency: "USD",
        notifications: true,
        twoFactorEnabled: false,
        theme: "system" as "system" | "light" | "dark",
        language: "en",
      },
      status: "active",
    });

    // Create second user - Add your second user's details here
    const secondUser = await ctx.db.insert("users", {
      clerkId: "user_2sWA2zKbD1AI95jdDzevszS9ibW", // Replace with actual Clerk ID
      email: "sergio.ardila.diaz@gmail.com", // Replace with actual email
      username: "marshal363",
      firstName: "Sergio",
      lastName: "Ardila",
      fullName: "Sergio Ardila",
      profileImageUrl: "", // Add actual profile image URL if available
      createdAt: now,
      lastSignInAt: now,
      updatedAt: now,
      preferences: {
        defaultCurrency: "USD",
        notifications: true,
        twoFactorEnabled: false,
        theme: "system" as "system" | "light" | "dark",
        language: "en",
      },
      status: "active",
    });

    return {
      sergioUser,
      secondUser,
    };
  },
});

// Migration mutation to update existing users to new schema
export const migrateExistingUsers = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all existing users
    const users = await ctx.db.query("users").collect();
    const now = new Date().toISOString();
    const results: Id<"users">[] = [];
    
    // Define type for old user data structure
    type OldUserData = {
      name?: string;
      profileImage?: string;
      preferences?: {
        defaultCurrency?: string;
        notifications?: boolean;
        twoFactorEnabled?: boolean;
      };
    };
    
    for (const user of users) {
      try {
        // Cast to old data structure for migration
        const oldData = user as unknown as OldUserData;
        
        // Extract name parts from existing data
        const existingName = oldData.name || "";
        const nameParts = existingName.split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";
        
        // Prepare the updated user data
        const updatedUser = {
          // Keep existing fields
          clerkId: user.clerkId,
          email: user.email,
          
          // Add new required fields
          createdAt: user._creationTime ? new Date(user._creationTime).toISOString() : now,
          updatedAt: now,
          fullName: existingName || `${firstName} ${lastName}`.trim(),
          status: "active" as const,
          
          // Add new optional fields
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          profileImageUrl: oldData.profileImage || undefined,
          lastSignInAt: now,
          
          // Update preferences structure
          preferences: {
            defaultCurrency: oldData.preferences?.defaultCurrency || "USD",
            notifications: oldData.preferences?.notifications ?? true,
            twoFactorEnabled: oldData.preferences?.twoFactorEnabled ?? false,
            theme: "system" as const,
            language: "en",
          },
        };
        
        // Update the user
        await ctx.db.patch(user._id, updatedUser);
        results.push(user._id);
        
      } catch (error) {
        console.error(`Failed to migrate user ${user._id}:`, error);
      }
    }
    
    return {
      message: `Successfully migrated ${results.length} users`,
      userIds: results,
    };
  },
});

export const importUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    username: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    fullName: v.string(),
    profileImageUrl: v.optional(v.string()),
    createdAt: v.string(),
    lastSignInAt: v.optional(v.string()),
    updatedAt: v.string(),
    preferences: v.object({
      defaultCurrency: v.string(),
      notifications: v.boolean(),
      twoFactorEnabled: v.boolean(),
      theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
      language: v.string(),
    }),
    status: v.union(v.literal("active"), v.literal("inactive"), v.literal("suspended"))
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", args);
  },
});

// Helper query to get user mappings
export const getUserMappings = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map(user => ({
      clerkId: user.clerkId,
      convexId: user._id,
      username: user.username
    }));
  },
});

export const searchUsers = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), identity.subject))
      .first();
    
    if (!currentUser) throw new Error("User not found");

    const searchQuery = args.query.toLowerCase();

    // Search by username, full name, or email
    const users = await ctx.db
      .query("users")
      .filter((q) => 
        q.and(
          // Don't include current user
          q.neq(q.field("_id"), currentUser._id),
          // Only active users
          q.eq(q.field("status"), "active"),
          // Search across multiple fields
          q.or(
            // Username search
            q.and(
              q.neq(q.field("username"), null),
              q.gte(q.field("username"), searchQuery),
              q.lt(q.field("username"), searchQuery + "\uffff")
            ),
            // Full name search
            q.and(
              q.neq(q.field("fullName"), null),
              q.gte(q.field("fullName"), searchQuery),
              q.lt(q.field("fullName"), searchQuery + "\uffff")
            ),
            // Email search
            q.and(
              q.neq(q.field("email"), null),
              q.gte(q.field("email"), searchQuery),
              q.lt(q.field("email"), searchQuery + "\uffff")
            )
          )
        )
      )
      .take(10);

    return users.map(user => ({
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      profileImageUrl: user.profileImageUrl,
      email: user.email,
    }));
  },
});

const debug = {
  log: (ctx: any, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[Convex:Users] ${message}`, {
      ...data,
      timestamp,
    });
  },
  error: (ctx: any, message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[Convex:Users:Error] ${message}`, {
      error,
      timestamp,
    });
  }
};

// Get other participant in a conversation
export const getOtherParticipant = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    try {
      debug.log(ctx, "Getting other participant", { conversationId: args.conversationId });

      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error("Not authenticated");

      // Get current user
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id")
        .filter((q) => q.eq(q.field("clerkId"), identity.subject))
        .unique();
      
      if (!currentUser) throw new Error("User not found");

      debug.log(ctx, "Current user found", { userId: currentUser._id });

      // Get conversation
      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation) {
        debug.error(ctx, "Conversation not found", { conversationId: args.conversationId });
        throw new Error("Conversation not found");
      }

      debug.log(ctx, "Conversation found", { 
        participants: conversation.participants,
        isGroup: conversation.metadata.isGroup
      });

      // Find other participant
      const otherParticipantId = conversation.participants.find(
        (id) => id !== currentUser._id
      );

      if (!otherParticipantId) {
        debug.error(ctx, "Other participant not found in conversation");
        throw new Error("Other participant not found");
      }

      // Get other participant's details
      const otherParticipant = await ctx.db.get(otherParticipantId);
      if (!otherParticipant) {
        debug.error(ctx, "Other participant details not found", { 
          participantId: otherParticipantId 
        });
        throw new Error("Other participant details not found");
      }

      debug.log(ctx, "Other participant found", { 
        username: otherParticipant.username,
        fullName: otherParticipant.fullName
      });

      return {
        _id: otherParticipant._id,
        fullName: otherParticipant.fullName,
        username: otherParticipant.username ?? "",
        profileImageUrl: otherParticipant.profileImageUrl,
        status: otherParticipant.status,
      };
    } catch (error) {
      debug.error(ctx, "Error in getOtherParticipant", error);
      throw error;
    }
  },
}); 