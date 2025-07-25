import { Id } from "../../../convex/_generated/dataModel";

export type NotificationType = 
  | "payment_request"
  | "payment_sent"
  | "payment_received"
  | "security"
  | "system";

export type NotificationStatus = 
  | "pending" 
  | "completed" 
  | "cancelled" 
  | "declined" 
  | "approved"
  | "expired";

export type PaymentStatus = 
  | "pending"
  | "completed"
  | "failed"
  | "expired";

export interface Actor {
  id: Id<"users">;
  name: string;
  profileImageUrl?: string;
}

export interface StatusChange {
  status: NotificationStatus;
  actor: Actor;
  timestamp: string;
  reason?: string;
}

export interface PaymentData {
  amount: number;
  currency: string;
  type: "lightning" | "onchain";
  status: PaymentStatus;
}

export interface NotificationMetadata {
  gradient: string;
  dismissible: boolean;
  actionRequired: boolean;
  expiresAt?: string;
  
  // Actor information
  actor?: Actor;
  counterparty?: Actor;
  
  // Payment specific
  paymentData?: PaymentData;
  
  // Status tracking
  status: NotificationStatus;
  statusHistory?: StatusChange[];
  
  // Visibility and routing
  role?: "sender" | "recipient";
  visibility: "sender_only" | "recipient_only" | "both";
  relatedEntityId?: string;
  relatedEntityType?: string;
  counterpartyId?: Id<"users">;
  parentNotificationId?: Id<"notifications">;
}

export interface NotificationData {
  _id: Id<"notifications">;
  _creationTime: number;
  type: NotificationType;
  title: string;
  description: string;
  status: "active" | "dismissed" | "actioned" | "expired";
  metadata: NotificationMetadata;
  createdAt: string;
  updatedAt: string;
  userId: Id<"users">;
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
} 