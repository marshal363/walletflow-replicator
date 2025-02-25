import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { NotificationData, NotificationStatus, Actor, PaymentStatus } from "@/lib/types/notifications";
import { cn } from "@/lib/utils";
import { XIcon, ChevronRightIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Id } from "../../../convex/_generated/dataModel";
import { ICON_MAP } from "./NotificationIcons";
import { useNotificationExpiration } from "@/hooks/useNotificationExpiration";

interface NotificationCardProps {
  notification: NotificationData;
  onAction: (id: Id<"notifications">) => void;
  onDismiss: (id: Id<"notifications">, e: React.MouseEvent) => void;
}

// Map payment status to notification status
function mapPaymentStatus(status: PaymentStatus): NotificationStatus {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'declined';
    case 'expired':
      return 'expired';
    default:
      return 'pending';
  }
}

// Map notification status to display status
function getDisplayStatus(
  notificationStatus: "active" | "dismissed" | "actioned" | "expired", 
  paymentStatus?: PaymentStatus
): NotificationStatus {
  // If we have a payment status, use that directly
  if (paymentStatus) {
    return mapPaymentStatus(paymentStatus);
  }
  
  // Fall back to notification status mapping
  switch (notificationStatus) {
    case 'active':
      return 'pending';
    case 'actioned':
      return 'completed';
    case 'dismissed':
      return 'cancelled';
    case 'expired':
      return 'expired';
    default:
      return 'pending';
  }
}

const STATUS_COLORS: Record<NotificationStatus, string> = {
  pending: "from-blue-500 to-blue-600",
  completed: "from-green-500 to-green-600",
  cancelled: "from-gray-500 to-gray-600",
  declined: "from-red-500 to-red-600",
  approved: "from-green-500 to-green-600",
  expired: "from-red-500 to-red-600",
};

const STATUS_BADGES: Record<NotificationStatus, { bg: string; text: string }> = {
  pending: { bg: "bg-blue-500/20", text: "text-blue-200" },
  completed: { bg: "bg-green-500/20", text: "text-green-200" },
  cancelled: { bg: "bg-gray-500/20", text: "text-gray-200" },
  declined: { bg: "bg-red-500/20", text: "text-red-200" },
  approved: { bg: "bg-green-500/20", text: "text-green-200" },
  expired: { bg: "bg-red-500/20", text: "text-red-200" },
};

function ActorInfo({ actor, label }: { actor?: Actor; label?: string }) {
  if (!actor) return null;
  
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm text-white/60">{label}</span>
      <span className="text-sm text-white">{actor.name}</span>
    </div>
  );
}

export function NotificationCard({
  notification,
  onAction,
  onDismiss
}: NotificationCardProps) {
  const { metadata } = notification;
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });
  
  // Use the shared expiration hook
  const isLocallyExpired = useNotificationExpiration(notification);
  
  // Get the current payment status
  const paymentStatus = isLocallyExpired && metadata.paymentData?.status === 'pending' 
    ? 'expired' as PaymentStatus
    : metadata.paymentData?.status;
  
  // Get the final display status
  const currentStatus = getDisplayStatus(notification.status, paymentStatus);
  
  return (
    <motion.div
      onClick={() => onAction(notification._id)}
      className={cn(
        "relative h-[100px] overflow-hidden rounded-xl cursor-pointer group",
        "bg-gradient-to-r transition-all hover:scale-[1.02]",
        STATUS_COLORS[currentStatus]
      )}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black/10" />
      
      {/* Dismiss Button */}
      {metadata.dismissible && (
        <button
          onClick={(e) => onDismiss(notification._id, e)}
          className="absolute top-2 right-2 p-1.5 rounded-full 
                    hover:bg-black/30 transition-colors z-10"
          title="Dismiss notification"
        >
          <XIcon className="h-3.5 w-3.5 text-white/90" />
        </button>
      )}
      
      {/* Main Content */}
      <div className="relative h-full p-3 flex flex-col justify-between">
        {/* Top Section - Icon and Title */}
        <div className="flex items-start gap-2.5">
          {/* Icon */}
          <div className={cn(
            "flex-shrink-0 w-10 h-10 p-2 rounded-xl",
            "bg-white/10 flex items-center justify-center"
          )}>
            {ICON_MAP[notification.type]}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title */}
            <h4 className="font-medium text-white text-base mb-0.5">
              {notification.title}
            </h4>

            {/* Description */}
            {notification.description && (
              <p className="text-sm text-white/80 line-clamp-1">
                {notification.description}
              </p>
            )}
          </div>
        </div>

        {/* Bottom Section - Status and Time */}
        <div className="flex items-center justify-between">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              STATUS_BADGES[currentStatus].bg,
              STATUS_BADGES[currentStatus].text
            )}>
              {currentStatus}
            </span>
            {notification.priority.modifiers.actionRequired && !isLocallyExpired && (
              <div className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-xs text-yellow-200">Action needed</span>
              </div>
            )}
          </div>

          {/* Timestamp */}
          <span className="text-xs text-white/60">
            {timeAgo}
          </span>
        </div>
      </div>
    </motion.div>
  );
} 