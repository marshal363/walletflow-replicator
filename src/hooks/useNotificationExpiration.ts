import { useEffect, useState } from 'react';
import { NotificationData } from '@/lib/types/notifications';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

const EXPIRATION_CHECK_INTERVAL = 30000; // 30 seconds

export function useNotificationExpiration(notification: NotificationData) {
  const [isLocallyExpired, setIsLocallyExpired] = useState(false);
  const updateStatus = useMutation(api.notifications.updateNotificationStatus);
  const handleRequestAction = useMutation(api.paymentRequests.handleRequestAction);

  useEffect(() => {
    // Only check expiration for payment requests that are still pending
    if (
      notification.type === "payment_request" && 
      notification.status === "active" &&
      notification.metadata.paymentData?.status === "pending"
    ) {
      const checkExpiration = async () => {
        const expiresAt = notification.metadata.expiresAt;
        if (expiresAt) {
          const expirationDate = new Date(expiresAt);
          const now = new Date();
          const isExpired = expirationDate < now;
          
          // Log expiration check for debugging
          console.log("Notification expiration check", {
            id: notification._id,
            expiresAt,
            now: now.toISOString(),
            isExpired,
            timeDifference: (now.getTime() - expirationDate.getTime()) / 1000
          });

          // If expired, update both local state and database
          if (isExpired && !isLocallyExpired) {
            setIsLocallyExpired(true);
            
            // Update notification status
            await updateStatus({
              notificationId: notification._id,
              status: "expired",
              paymentStatus: "expired"
            });

            // If this is a payment request and we have the relatedEntityId, update the payment request
            if (
              notification.type === "payment_request" && 
              notification.metadata.relatedEntityId
            ) {
              try {
                await handleRequestAction({
                  requestId: notification.metadata.relatedEntityId as any, // Cast needed as relatedEntityId is string
                  action: "expired"
                });
                
                console.log("Payment request marked as expired", {
                  notificationId: notification._id,
                  requestId: notification.metadata.relatedEntityId,
                  timestamp: new Date().toISOString()
                });
              } catch (error) {
                console.error("Failed to update payment request status", {
                  error,
                  notificationId: notification._id,
                  requestId: notification.metadata.relatedEntityId
                });
              }
            }
          }
        }
      };

      // Check immediately
      checkExpiration();

      // Set up interval for periodic checks
      const intervalId = setInterval(checkExpiration, EXPIRATION_CHECK_INTERVAL);

      return () => clearInterval(intervalId);
    }
  }, [notification, isLocallyExpired, updateStatus, handleRequestAction]);

  return isLocallyExpired;
} 