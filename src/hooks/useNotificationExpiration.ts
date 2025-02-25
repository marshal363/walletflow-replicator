import { useEffect, useState } from 'react';
import { NotificationData } from '@/lib/types/notifications';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

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
          const diffMs = expirationDate.getTime() - now.getTime();
          
          // Log expiration check for debugging
          console.log("Notification expiration check", {
            id: notification._id,
            type: notification.type,
            expiresAt,
            now: now.toISOString(),
            isExpired,
            currentLocalExpiredState: isLocallyExpired,
            timeDifference: Math.floor(diffMs / 1000),
            paymentStatus: notification.metadata.paymentData?.status,
            databaseStatus: notification.status,
            hasRelatedEntityId: !!notification.metadata.relatedEntityId,
            relatedEntityId: notification.metadata.relatedEntityId,
            shouldTriggerUpdate: isExpired && !isLocallyExpired
          });

          // If expired, update both local state and database
          if (isExpired && !isLocallyExpired) {
            console.log("Setting local expiration state to true", {
              notificationId: notification._id,
              previousState: isLocallyExpired,
              timestamp: now.toISOString()
            });
            
            setIsLocallyExpired(true);
            
            // Update notification status
            console.log("Updating notification status in database", {
              notificationId: notification._id,
              previousStatus: notification.status,
              newStatus: "expired",
              previousPaymentStatus: notification.metadata.paymentData?.status,
              newPaymentStatus: "expired"
            });
            
            try {
              await updateStatus({
                notificationId: notification._id,
                status: "expired",
                paymentStatus: "expired"
              });
              
              console.log("Successfully updated notification status", {
                notificationId: notification._id,
                status: "expired",
                timestamp: new Date().toISOString()
              });
            } catch (error) {
              console.error("Failed to update notification status", {
                error,
                notificationId: notification._id
              });
            }

            // If this is a payment request and we have the relatedEntityId, update the payment request
            if (
              notification.type === "payment_request" && 
              notification.metadata.relatedEntityId
            ) {
              try {
                console.log("Attempting to update payment request status", {
                  notificationId: notification._id,
                  requestId: notification.metadata.relatedEntityId as Id<"paymentRequests">,
                  action: "expired",
                  timestamp: new Date().toISOString()
                });
                
                await handleRequestAction({
                  requestId: notification.metadata.relatedEntityId as Id<"paymentRequests">,
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