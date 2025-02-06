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