import { GenericId } from "convex/values";

export type NotificationType = "transaction" | "payment_request" | "security" | "system";

export interface NotificationMetadata {
  gradient: string;
  expiresAt?: string;
  actionRequired: boolean;
  dismissible: boolean;
  relatedEntityId?: string;
  relatedEntityType?: string;
  counterpartyId?: GenericId<"users">;
  visibility: "sender_only" | "recipient_only" | "both";
  role?: "sender" | "recipient";
  parentNotificationId?: GenericId<"notifications">;
  paymentData?: {
    amount: number;
    currency: string;
    type: "lightning" | "onchain";
    status: "pending" | "completed" | "failed";
  };
}

export interface Notification {
  _id: GenericId<"notifications">;
  userId: GenericId<"users">;
  type: NotificationType;
  title: string;
  description: string;
  status: "active" | "dismissed" | "actioned" | "expired";
  priority: {
    base: "high" | "medium" | "low";
    modifiers: {
      actionRequired: boolean;
      timeConstraint: boolean;
      amount: number;
      role: "sender" | "recipient";
    };
    calculatedPriority: number;
  };
  displayLocation: "suggested_actions" | "toast" | "both";
  metadata: NotificationMetadata;
  createdAt: string;
  updatedAt: string;
} 