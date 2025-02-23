import { api } from "@/lib/convex";
import { useMutation } from "convex/react";
import { Id } from "../../convex/_generated/dataModel";

// Hook for creating test notifications
export const useCreateTestNotification = () => {
  const mutation = useMutation(api.notifications.createNotification);
  
  return async (userId: Id<"users">) => {
    return await mutation({
      userId,
      type: "security",
      title: "Secure Your Account",
      description: "Enable two-factor authentication for better security",
      priority: {
        base: "high",
        modifiers: {
          actionRequired: true,
          timeConstraint: false,
          amount: 0,
          role: "recipient"
        }
      },
      displayLocation: "suggested_actions",
      metadata: {
        gradient: "from-red-500 to-red-600",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        actionRequired: true,
        dismissible: true,
        relatedEntityId: "/settings/security",
        relatedEntityType: "security",
        visibility: "recipient_only",
        role: "recipient"
      }
    });
  };
}; 