
'use client';

import * as React from 'react';
import { type Contract, type ContractEndNotification } from "@/lib/types";
import { 
    getContracts as getContractsAction, 
    getContractEndNotifications as getNotificationsAction, 
    addContractEndNotification as addNotificationAction, 
    updateContractEndNotification as updateNotificationAction,
    deleteContractEndNotification as deleteNotificationAction 
} from '../actions';

interface ContractsContextType {
  contracts: Contract[];
  isLoading: boolean;
  fetchContracts: () => Promise<void>;
  contractEndNotifications: ContractEndNotification[];
  addContractEndNotification: (notification: Omit<ContractEndNotification, 'id'>) => Promise<void>;
  updateContractEndNotification: (id: string, notification: Omit<ContractEndNotification, 'id'>) => Promise<void>;
  deleteContractEndNotification: (notificationId: string) => Promise<void>;
}

export const ContractsContext = React.createContext<ContractsContextType | undefined>(undefined);

export function ContractsProvider({ children }: { children: React.ReactNode }) {
  const [contracts, setContracts] = React.useState<Contract[]>([]);
  const [contractEndNotifications, setContractEndNotifications] = React.useState<ContractEndNotification[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchContracts = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const [fetchedContracts, fetchedNotifications] = await Promise.all([
            getContractsAction(),
            getNotificationsAction()
        ]);
        setContracts(fetchedContracts);
        setContractEndNotifications(fetchedNotifications);
    } catch (e) {
        console.error("Failed to fetch contracts data", e);
    } finally {
        setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
      fetchContracts();
  }, [fetchContracts]);

  const addContractEndNotification = async (notification: Omit<ContractEndNotification, 'id'>) => {
      const newNotification = await addNotificationAction(notification);
      if (newNotification) {
        setContractEndNotifications(prev => [...prev, newNotification]);
      }
  };

  const updateContractEndNotification = async (id: string, notification: Omit<ContractEndNotification, 'id'>) => {
      const updatedNotification = await updateNotificationAction(id, notification);
      if (updatedNotification) {
          setContractEndNotifications(prev => prev.map(n => n.id === id ? updatedNotification : n));
      }
  }

  const deleteContractEndNotification = async (notificationId: string) => {
      await deleteNotificationAction(notificationId);
      setContractEndNotifications(prev => prev.filter(n => n.id !== notificationId));
  }

  return (
    <ContractsContext.Provider value={{ 
        contracts, 
        isLoading, 
        fetchContracts,
        contractEndNotifications,
        addContractEndNotification,
        updateContractEndNotification,
        deleteContractEndNotification
    }}>
      {children}
    </ContractsContext.Provider>
  );
}

export const useContracts = () => {
  const context = React.useContext(ContractsContext);
  if (!context) {
    throw new Error("useContracts must be used within a ContractsProvider");
  }
  return context;
};
