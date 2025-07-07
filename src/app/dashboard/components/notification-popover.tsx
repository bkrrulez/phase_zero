
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { currentUser, type PushMessage } from '@/lib/mock-data';
import { formatDistanceToNow } from 'date-fns';
import { usePushMessages } from '../contexts/PushMessagesContext';

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
  const { pushMessages, userMessageStates, markMessageAsRead } = usePushMessages();
  
  const userReadIds = userMessageStates[currentUser.id]?.readMessageIds || [];

  const applicableMessages = React.useMemo(() => {
    return pushMessages.filter((msg) => {
      if (msg.receivers === 'all-members') return true;
      if (msg.receivers === 'all-teams' && currentUser.teamId) return true;
      if (Array.isArray(msg.receivers) && currentUser.teamId) {
        return msg.receivers.includes(currentUser.teamId);
      }
      return false;
    });
  }, [pushMessages]);

  const activeMessages = applicableMessages.filter(msg => getStatus(msg.startDate, msg.endDate) === 'Active');
  
  const expiredAndReadMessages = applicableMessages.filter(msg => {
    const status = getStatus(msg.startDate, msg.endDate);
    return status === 'Expired' && userReadIds.includes(msg.id);
  });

  const displayMessages = activeMessages.filter(msg => !expiredAndReadMessages.find(expired => expired.id === msg.id));
  
  const handleDismiss = (messageId: string) => {
      markMessageAsRead(currentUser.id, messageId);
      const message = displayMessages.find(m => m.id === messageId);
      if (message && getStatus(message.startDate, message.endDate) === 'Expired') {
        // The list will re-render and this message will be gone
      }
      if (displayMessages.length <= 1) {
          onClose();
      }
  };


  return (
    <div className="flex flex-col">
      <div className="p-4 pb-2">
        <h4 className="font-medium">Notifications</h4>
      </div>
      <ScrollArea className="max-h-80">
        <div className="p-4 pt-0">
          {displayMessages.length > 0 ? (
            displayMessages.map((msg, index) => {
                const isRead = userReadIds.includes(msg.id);
                return (
                    <React.Fragment key={msg.id}>
                      <div className="flex items-start gap-3 py-3">
                        {!isRead && <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />}
                        <div className="grid gap-1 flex-1">
                          <p className="font-medium">{msg.context}</p>
                          <p className="text-sm text-muted-foreground">{msg.messageBody}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(msg.startDate), { addSuffix: true })}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDismiss(msg.id)}>Dismiss</Button>
                      </div>
                      {index < displayMessages.length - 1 && <Separator />}
                    </React.Fragment>
                )
            })
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
