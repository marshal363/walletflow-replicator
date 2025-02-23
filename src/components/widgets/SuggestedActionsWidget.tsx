import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { NotificationType } from "@/lib/types";
import { useAccountStore, useUserAccountsAndWallets } from "@/hooks/useUserAccountsAndWallets";
import { useUser } from "@clerk/clerk-react";
import { Id } from "../../../convex/_generated/dataModel";

const ICON_MAP: Record<NotificationType, JSX.Element> = {
  security: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 01-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 01.872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 012.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 012.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 01.872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 01-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 01-2.105-.872l-.1-.34zM10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" clipRule="evenodd" />
    </svg>
  ),
  transaction: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
      <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
    </svg>
  ),
  payment_request: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
    </svg>
  ),
  system: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
    </svg>
  ),
};

interface SuggestedActionsWidgetProps {
  actionId?: Id<"notifications">;
  onDismiss?: (actionId: Id<"notifications">) => void;
  onAction?: (actionId: Id<"notifications">) => void;
}

interface NotificationMetadata {
  gradient: string;
  dismissible: boolean;
}

interface NotificationData {
  _id: Id<"notifications">;
  type: NotificationType;
  title: string;
  description: string;
  metadata: NotificationMetadata;
}

export default function SuggestedActionsWidget({
  actionId,
  onDismiss,
  onAction,
}: SuggestedActionsWidgetProps) {
  const { currentAccountId } = useAccountStore();
  const { accounts } = useUserAccountsAndWallets();
  const { user } = useUser();
  
  // Get the current account
  const currentAccount = accounts?.find(account => account._id === currentAccountId);
  
  // Get the Convex user ID using the Clerk ID
  const convexUser = useQuery(api.users.getUser, { 
    clerkId: user?.id ?? "" 
  });
  
  // Get notifications for the user
  const suggestedActions = useQuery(api.notifications.getSuggestedActions, {
    userId: convexUser?._id as Id<"users">
  });

  // Component mount/unmount tracking
  useEffect(() => {
    console.log('🔍 SuggestedActions Debug - Lifecycle:', {
      event: 'Component Mount',
      componentId: Math.random().toString(36).substr(2, 9),
      props: { actionId },
      timestamp: new Date().toISOString()
    });

    return () => {
      console.log('🔍 SuggestedActions Debug - Lifecycle:', {
        event: 'Component Unmount',
        componentId: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString()
      });
    };
  }, []);

  // Query execution tracking
  useEffect(() => {
    if (suggestedActions) {
      console.log('🔍 SuggestedActions Debug - Query:', {
        event: 'Query Results',
        queryId: Math.random().toString(36).substr(2, 9),
        notificationIds: suggestedActions.map(n => n._id.toString()),
        uniqueNotificationCount: new Set(suggestedActions.map(n => n._id.toString())).size,
        totalNotificationCount: suggestedActions.length,
        timestamp: new Date().toISOString()
      });
    }
  }, [suggestedActions]);

  // Parent props change tracking
  useEffect(() => {
    console.log('🔍 SuggestedActions Debug - Props:', {
      event: 'Props Update',
      actionId,
      hasOnDismiss: !!onDismiss,
      hasOnAction: !!onAction,
      timestamp: new Date().toISOString()
    });
  }, [actionId, onDismiss, onAction]);

  // Enhanced debug logs for user state
  useEffect(() => {
    console.log('🔍 SuggestedActions Debug - User State:', {
      event: 'User State',
      clerkId: user?.id || 'none',
      convexUserId: convexUser?._id.toString() || 'none',
      accountId: currentAccount?._id.toString() || 'none',
      hasUser: !!convexUser,
      hasClerkUser: !!user,
      timestamp: new Date().toISOString()
    });
  }, [user, convexUser, currentAccount]);

  // Enhanced debug logs for notifications
  useEffect(() => {
    console.log('🔍 SuggestedActions Debug - Notifications:', {
      event: 'Notifications State',
      count: suggestedActions?.length || 0,
      notifications: suggestedActions?.map(n => ({
        id: n._id.toString(),
        type: n.type,
        userId: n.userId.toString(),
        status: n.status,
        displayLocation: n.displayLocation,
        priority: n.priority,
        metadata: {
          dismissible: n.metadata.dismissible,
          actionRequired: n.metadata.actionRequired,
          gradient: n.metadata.gradient,
          role: n.metadata.role,
          visibility: n.metadata.visibility,
        }
      })) || [],
      queryParams: {
        userId: convexUser?._id.toString() || 'none',
      },
      timestamp: new Date().toISOString()
    });
  }, [suggestedActions, convexUser?._id]);

  // Debug log for render conditions
  useEffect(() => {
    console.log('🔍 SuggestedActions Debug - Render Conditions:', {
      event: 'Render Check',
      hasCurrentAccount: !!currentAccount,
      hasConvexUser: !!convexUser,
      hasSuggestedActions: !!suggestedActions?.length,
      suggestedActionsCount: suggestedActions?.length || 0,
      timestamp: new Date().toISOString()
    });
  }, [currentAccount, convexUser, suggestedActions]);

  const handleDismiss = (notificationId: Id<"notifications">, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🔍 SuggestedActions Debug - Dismiss Action:', {
      event: 'Dismiss Click',
      notificationId: notificationId.toString(),
      timestamp: new Date().toISOString()
    });
    onDismiss?.(notificationId);
  };

  const handleAction = (notificationId: Id<"notifications">) => {
    console.log('🔍 SuggestedActions Debug - Action Click:', {
      event: 'Action Click',
      notificationId: notificationId.toString(),
      timestamp: new Date().toISOString()
    });
    onAction?.(notificationId);
  };

  // Track animation states
  useEffect(() => {
    if (suggestedActions?.length) {
      console.log('🔍 SuggestedActions Debug - Animation State:', {
        event: 'Notifications Update',
        notificationCount: suggestedActions.length,
        notificationTypes: suggestedActions.map(n => n.type),
        gradients: suggestedActions.map(n => n.metadata.gradient),
        timestamp: new Date().toISOString()
      });
    }
  }, [suggestedActions]);

  if (!currentAccount || !convexUser) {
    console.log('🔍 SuggestedActions Debug - Early Return:', {
      event: 'Missing Dependencies',
      hasCurrentAccount: !!currentAccount,
      hasConvexUser: !!convexUser,
      timestamp: new Date().toISOString()
    });
    return null;
  }

  if (!suggestedActions?.length) {
    console.log('🔍 SuggestedActions Debug - No Actions:', {
      event: 'Empty Actions',
      timestamp: new Date().toISOString()
    });
    return null;
  }

  return (
    <div className="space-y-2 px-4">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-lg text-zinc-400">Suggested Actions</h2>
      </div>
      <Carousel className="w-full">
        <CarouselContent>
          {suggestedActions.map((action: NotificationData) => (
            <CarouselItem 
              key={action._id} 
              className="basis-[85%] sm:basis-[45%] md:basis-[35%]"
            >
              <motion.div
                onClick={() => handleAction(action._id)}
                className={`relative flex-none h-[72px] overflow-hidden rounded-xl bg-gradient-to-r ${action.metadata.gradient} cursor-pointer transition-all hover:scale-[1.02]`}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="absolute inset-0 bg-black/10" />
                {action.metadata.dismissible && (
                <div
                    onClick={(e) => handleDismiss(action._id, e)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/20 hover:bg-black/30 transition-colors z-10 cursor-pointer"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </div>
                )}
                <div className="relative h-full p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-black/20">
                    {ICON_MAP[action.type]}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-white text-base">
                      {action.title}
                    </h4>
                    <p className="text-sm text-white/80">
                      {action.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
} 