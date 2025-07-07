
'use client';

import * as React from 'react';
import { type AppNotification } from '@/lib/types';

type NotificationInput = Omit<AppNotification, 'id' | 'timestamp' | 'readBy'>;

interface NotificationsContextType {
  notifications: AppNotification[];
  addNotification: (notification: NotificationInput) => void;
  markAsRead: (notificationId: string, userId: string) => void;
  markAllAsRead: (userId: string) => void;
}

const NotificationsContext = React.createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children, initialNotifications }: { children: React.ReactNode, initialNotifications: AppNotification[] }) {
  const [notifications, setNotifications] = React.useState<AppNotification[]>(initialNotifications);

  const addNotification = (notification: NotificationInput) => {
    const newNotification: AppNotification = {
      ...notification,
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      readBy: [],
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (notificationId: string, userId: string) => {
    setNotifications(prev => prev.map(notif => {
      if (notif.id === notificationId && !notif.readBy.includes(userId)) {
        return { ...notif, readBy: [...notif.readBy, userId] };
      }
      return notif;
    }));
  };

  const markAllAsRead = (userId: string) => {
    setNotifications(prev => prev.map(notif => {
      if (notif.recipientIds.includes(userId) && !notif.readBy.includes(userId)) {
        return { ...notif, readBy: [...notif.readBy, userId] };
      }
      return notif;
    }));
  };

  return (
    <NotificationsContext.Provider value={{ notifications, addNotification, markAsRead, markAllAsRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => {
  const context = React.useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};
