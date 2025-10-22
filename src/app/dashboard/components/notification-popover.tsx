
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { type PushMessage } from '@/lib/mock-data';
import { formatDistanceToNow } from 'date-fns';
import { usePushMessages } from '../contexts/PushMessagesContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';

interface NotificationPopoverProps {
  onClose: () => void;
}

const getStatus = (startDate: string, endDate: string) => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (now < start) return 'Scheduled';
  if (now > end) return 'Expired';
  return 'Active';
};

export function NotificationPopover({ onClose }: NotificationPopoverProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  // Push Messages (Broadcast)
  const { pushMessages, userMessageStates, markMessageAsRead } = usePushMessages();
  const pushMessageUserReadIds = userMessageStates[currentUser.id]?.readMessageIds || [];

  const applicablePushMessages = React.useMemo(() => {
    return pushMessages.filter((msg) => {
      if (msg.receivers === 'all-members') return true;
      if (msg.receivers === 'all-teams' && currentUser.teamId) return true;
      if (Array.isArray(msg.receivers) && currentUser.teamId) {
        return msg.receivers.includes(currentUser.teamId);
      }
      return false;
    });
  }, [pushMessages, currentUser]);
  
  const activePushMessages = applicablePushMessages.filter(msg => getStatus(msg.startDate, msg.endDate) === 'Active');
  
  const expiredAndReadPushMessages = applicablePushMessages.filter(msg => {
    const status = getStatus(msg.startDate, msg.endDate);
    return status === 'Expired' && pushMessageUserReadIds.includes(msg.id);
  });
  
  const displayablePushMessages = activePushMessages.filter(msg => !expiredAndReadPushMessages.find(expired => expired.id === msg.id));
  
  // App Notifications (e.g., Holiday Requests)
  const { notifications, markAsRead } = useNotifications();

  // Since holiday requests are removed, this will be empty but keeps the structure
  const userAppNotifications = React.useMemo(() => {
      return notifications
        .filter(n => n.recipientIds.includes(currentUser.id) && n.type !== 'holidayRequest') // Filter out holiday requests explicitly
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [notifications, currentUser]);

  // Combined notifications
  const allDisplayableItems = React.useMemo(() => {
    const pushItems = displayablePushMessages.map(msg => ({
        id: msg.id,
        type: 'pushMessage',
        timestamp: msg.startDate,
        isRead: pushMessageUserReadIds.includes(msg.id),
        ...msg,
    }));
    
    // appItems will be empty regarding holiday requests
    const appItems = userAppNotifications.map(notif => ({
        id: notif.id,
        type: notif.type,
        timestamp: notif.timestamp,
        isRead: notif.readBy.includes(currentUser.id),
        ...notif
    }));

    return [...pushItems, ...appItems].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [displayablePushMessages, userAppNotifications, pushMessageUserReadIds, currentUser]);


  const handleDismissPushMessage = (messageId: string) => {
      markMessageAsRead(currentUser.id, messageId);
      onClose();
  };
  
  const handleApprove = (notificationId: string, requestId: string) => {
      // approveRequest(requestId);
      markAsRead(notificationId, currentUser.id);
      toast({ title: "Request Approved", description: "The holiday request has been approved."});
      onClose();
  }
  
  const handleReject = (notificationId: string, requestId: string) => {
      // rejectRequest(requestId);
      markAsRead(notificationId, currentUser.id);
      toast({ title: "Request Rejected", description: "The holiday request has been rejected.", variant: 'destructive'});
      onClose();
  }

  return (
    <div className="flex flex-col">
      <div className="p-4 pb-2">
        <h4 className="font-medium">Notifications</h4>
      </div>
      <ScrollArea className="max-h-96">
        <div className="p-4 pt-0">
          {allDisplayableItems.length > 0 ? (
            allDisplayableItems.map((item, index) => (
              <React.Fragment key={`${item.type}-${item.id}`}>
                {item.type === 'pushMessage' ? (
                  <div className="flex items-start gap-3 py-3">
                    {!item.isRead && <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />}
                    <div className="grid gap-1 flex-1">
                      <p className="font-medium">{item.context}</p>
                      <p className="text-sm text-muted-foreground">{item.messageBody}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.startDate), { addSuffix: true })}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDismissPushMessage(item.id)}>Dismiss</Button>
                  </div>
                ) : null}
                {index < allDisplayableItems.length - 1 && <Separator />}
              </React.Fragment>
            ))
          ) : (
            <div className="text-center text-sm text-muted-foreground py-8">
              You have no new notifications.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
