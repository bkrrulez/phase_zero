
'use client';

import * as React from 'react';
import {
  type PushMessage,
  type UserMessageState,
} from '@/lib/types';
import { 
  getPushMessages, 
  getUserMessageStates, 
  addPushMessage,
  updatePushMessage,
  deletePushMessage as deletePushMessageAction,
  markMessageAsRead as markMessageAsReadAction
} from '../actions';

interface PushMessagesContextType {
  pushMessages: PushMessage[];
  addMessage: (newMessageData: Omit<PushMessage, 'id'>) => Promise<void>;
  updateMessage: (messageId: string, data: Omit<PushMessage, 'id'>) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  userMessageStates: Record<string, UserMessageState>;
  markMessageAsRead: (userId: string, messageId: string) => Promise<void>;
}

const PushMessagesContext = React.createContext<PushMessagesContextType | undefined>(undefined);

export function PushMessagesProvider({ children }: { children: React.ReactNode }) {
  const [pushMessages, setPushMessages] = React.useState<PushMessage[]>([]);
  const [userMessageStates, setUserMessageStates] = React.useState<Record<string, UserMessageState>>({});

  const fetchData = React.useCallback(async () => {
    const [messages, states] = await Promise.all([
      getPushMessages(),
      getUserMessageStates()
    ]);
    setPushMessages(messages);
    setUserMessageStates(states);
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);


  const addMessage = async (data: Omit<PushMessage, 'id'>) => {
    await addPushMessage(data);
    await fetchData();
  };

  const updateMessage = async (messageId: string, data: Omit<PushMessage, 'id'>) => {
    await updatePushMessage(messageId, data);
    await fetchData();
  };

  const deleteMessage = async (messageId: string) => {
    await deletePushMessageAction(messageId);
    setPushMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  };

  const markMessageAsRead = async (userId: string, messageId: string) => {
    await markMessageAsReadAction(userId, messageId);
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

    