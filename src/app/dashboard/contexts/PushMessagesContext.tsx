
'use client';

import * as React from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import {
  pushMessages as initialPushMessages,
  userMessageStates as initialUserMessageStates,
  type PushMessage,
  type UserMessageState,
} from '@/lib/mock-data';

interface PushMessagesContextType {
  pushMessages: PushMessage[];
  addMessage: (newMessageData: Omit<PushMessage, 'id'>) => void;
  updateMessage: (messageId: string, data: Omit<PushMessage, 'id'>) => void;
  deleteMessage: (messageId: string) => void;
  userMessageStates: Record<string, UserMessageState>;
  markMessageAsRead: (userId: string, messageId: string) => void;
}

const PushMessagesContext = React.createContext<PushMessagesContextType | undefined>(undefined);

export function PushMessagesProvider({ children }: { children: React.ReactNode }) {
  const [pushMessages, setPushMessages] = useLocalStorage<PushMessage[]>('pushMessages', initialPushMessages);
  const [userMessageStates, setUserMessageStates] = useLocalStorage<Record<string, UserMessageState>>(
    'userMessageStates',
    initialUserMessageStates
  );

  const addMessage = (data: Omit<PushMessage, 'id'>) => {
    const newMessage: PushMessage = { ...data, id: `msg-${Date.now()}` };
    setPushMessages((prev) => [...prev, newMessage]);
  };

  const updateMessage = (messageId: string, data: Omit<PushMessage, 'id'>) => {
    setPushMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { id: messageId, ...data } : msg))
    );
  };

  const deleteMessage = (messageId: string) => {
    setPushMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  };

  const markMessageAsRead = (userId: string, messageId: string) => {
    setUserMessageStates((prev) => {
      const userState = prev[userId] || { readMessageIds: [] };
      if (!userState.readMessageIds.includes(messageId)) {
        return {
          ...prev,
          [userId]: {
            ...userState,
            readMessageIds: [...userState.readMessageIds, messageId],
          },
        };
      }
      return prev;
    });
  };

  return (
    <PushMessagesContext.Provider
      value={{
        pushMessages,
        addMessage,
        updateMessage,
        deleteMessage,
        userMessageStates,
        markMessageAsRead,
      }}
    >
      {children}
    </PushMessagesContext.Provider>
  );
}

export const usePushMessages = () => {
  const context = React.useContext(PushMessagesContext);
  if (!context) {
    throw new Error('usePushMessages must be used within a PushMessagesProvider');
  }
  return context;
};
