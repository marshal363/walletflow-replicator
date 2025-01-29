import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get all contacts for a user
export const getContacts = query({
  args: {
    userId: v.id("users"),
    type: v.optional(
      v.union(
        v.literal("personal"),
        v.literal("business"),
        v.literal("merchant")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("blocked"),
        v.literal("pending")
      )
    ),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("contacts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));

    if (args.type) {
      query = query.filter((q) => q.eq(q.field("type"), args.type));
    }

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    return await query.collect();
  },
});

// Add a new contact
export const addContact = mutation({
  args: {
    userId: v.id("users"),
    contactId: v.id("users"),
    nickname: v.optional(v.string()),
    type: v.union(
      v.literal("personal"),
      v.literal("business"),
      v.literal("merchant")
    ),
    metadata: v.optional(
      v.object({
        notes: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Check if contact already exists
    const existingContact = await ctx.db
      .query("contacts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("contactId"), args.contactId))
      .first();

    if (existingContact) {
      throw new Error("Contact already exists");
    }

    // Create the contact
    const contact = await ctx.db.insert("contacts", {
      userId: args.userId,
      contactId: args.contactId,
      nickname: args.nickname,
      type: args.type,
      status: "active",
      metadata: {
        ...args.metadata,
        lastInteraction: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
    });

    // Log the activity
    await ctx.db.insert("activityLogs", {
      userId: args.userId,
      type: "settings_change",
      action: "add_contact",
      status: "success",
      metadata: {
        details: {
          contactId: args.contactId,
          type: args.type,
        },
      },
      timestamp: new Date().toISOString(),
    });

    return contact;
  },
});

// Update contact details
export const updateContact = mutation({
  args: {
    contactId: v.id("contacts"),
    nickname: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("personal"),
        v.literal("business"),
        v.literal("merchant")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("blocked"),
        v.literal("pending")
      )
    ),
    metadata: v.optional(
      v.object({
        notes: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (!contact) {
      throw new Error("Contact not found");
    }

    const updates: any = {};
    if (args.nickname !== undefined) updates.nickname = args.nickname;
    if (args.type !== undefined) updates.type = args.type;
    if (args.status !== undefined) updates.status = args.status;
    if (args.metadata !== undefined) {
      updates.metadata = {
        ...contact.metadata,
        ...args.metadata,
        lastInteraction: new Date().toISOString(),
      };
    }

    const updatedContact = await ctx.db.patch(args.contactId, updates);

    // Log the activity
    await ctx.db.insert("activityLogs", {
      userId: contact.userId,
      type: "settings_change",
      action: "update_contact",
      status: "success",
      metadata: {
        details: {
          contactId: contact.contactId,
          updates,
        },
      },
      timestamp: new Date().toISOString(),
    });

    return updatedContact;
  },
});

// Search contacts
export const searchContacts = query({
  args: {
    userId: v.id("users"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const searchTerm = args.query.toLowerCase();
    return contacts.filter((contact) => {
      const nickname = contact.nickname?.toLowerCase() || "";
      const notes = contact.metadata?.notes?.toLowerCase() || "";
      const tags = contact.metadata?.tags || [];
      
      return (
        nickname.includes(searchTerm) ||
        notes.includes(searchTerm) ||
        tags.some((tag) => tag.toLowerCase().includes(searchTerm))
      );
    });
  },
}); 