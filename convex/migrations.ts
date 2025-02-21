import { mutation } from "./_generated/server";

export const migrateConversationsMetadata = mutation({
  args: {},
  handler: async (ctx) => {
    const conversations = await ctx.db.query("conversations").collect();
    
    for (const conversation of conversations) {
      const metadata = conversation.metadata;
      
      // Create new metadata object with the correct structure
      const updatedMetadata = {
        name: metadata.name,
        isGroup: metadata.isGroup,
        createdBy: metadata.createdBy,
        linkedUserId: metadata.linkedUserId ?? undefined
      };

      // Update the conversation with the new metadata
      await ctx.db.patch(conversation._id, {
        metadata: updatedMetadata
      });
    }
    
    return { message: "Conversations metadata migrated successfully" };
  }
});

export const migrateMessagesMetadata = mutation({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db.query("messages").collect();
    let updated = 0;
    
    for (const message of messages) {
      const metadata = message.metadata;
      
      // Create new metadata object with the correct structure
      const updatedMetadata = {
        ...metadata,
        visibility: metadata.visibility ?? "both" // Set default visibility if not present
      };

      // Update the message with the new metadata
      await ctx.db.patch(message._id, {
        metadata: updatedMetadata
      });
      updated++;
    }
    
    return { 
      message: "Messages metadata migrated successfully",
      updatedCount: updated
    };
  }
}); 