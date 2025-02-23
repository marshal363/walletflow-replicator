import React, { useEffect } from 'react';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { NotificationData } from "@/lib/types/notifications";
import { useAccountStore, useUserAccountsAndWallets } from "@/hooks/useUserAccountsAndWallets";
import { useUser } from "@clerk/clerk-react";
import { Id } from "../../../convex/_generated/dataModel";
import { NotificationCard } from "../notifications/NotificationCard";

interface SuggestedActionsWidgetProps {
  actionId?: Id<"notifications">;
  onDismiss?: (actionId: Id<"notifications">) => void;
  onAction?: (actionId: Id<"notifications">) => void;
}

export default function SuggestedActionsWidget({
  actionId,
  onDismiss,
  onAction,
}: SuggestedActionsWidgetProps) {
  const { currentAccountId } = useAccountStore();
  const { accounts } = useUserAccountsAndWallets();
  const { user } = useUser();
  
  const currentAccount = accounts?.find(account => account._id === currentAccountId);
  
  const convexUser = useQuery(api.users.getUser, { 
    clerkId: user?.id ?? "" 
  });
  
  const suggestedActions = useQuery(api.notifications.getSuggestedActions, {
    userId: convexUser?._id as Id<"users">
  });

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

  if (!currentAccount || !convexUser || !suggestedActions?.length) {
    return null;
  }

  return (
    <div className="space-y-2 px-4">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-lg text-zinc-400">Suggested Actions</h2>
      </div>
      <Carousel className="w-full">
        <CarouselContent>
          {suggestedActions.map((action) => (
            <CarouselItem 
              key={action._id} 
              className="basis-[85%] sm:basis-[45%] md:basis-[35%]"
            >
              <NotificationCard
                notification={action}
                onAction={handleAction}
                onDismiss={handleDismiss}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
} 