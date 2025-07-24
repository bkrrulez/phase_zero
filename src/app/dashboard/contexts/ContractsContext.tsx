'use client';

import * as React from 'react';
import { type Contract, type ContractEndNotification } from "@/lib/types";
import { getContracts as getContractsAction } from '../actions';

// Mocked data and actions for contract end notifications as they are not in the DB
const MOCKED_NOTIFICATIONS: ContractEndNotification[] = [];
let MOCKED_NOTIFICATIONS_ID_COUNTER = 0;


interface ContractsContextType {
  contracts: Contract[];
  isLoading: boolean;
  fetchContracts: () => Promise<void>;
  contractEndNotifications: ContractEndNotification[];
  addContractEndNotification: (notification: Omit<ContractEndNotification, 'id'>) => Promise<void>;
  deleteContractEndNotification: (notificationId: string) => Promise<void>;
}

export const ContractsContext = React.createContext<ContractsContextType | undefined>(undefined);

export function ContractsProvider({ children }: { children: React.ReactNode }) {
  const [contracts, setContracts] = React.useState<Contract[]>([]);
  const [contractEndNotifications, setContractEndNotifications] = React.useState<ContractEndNotification[]>(MOCKED_NOTIFICATIONS);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchContracts = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const fetchedContracts = await getContractsAction();
        setContracts(fetchedContracts);
    } catch (e) {
        console.error("Failed to fetch contracts", e);
    } finally {
        setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
      fetchContracts();
  }, [fetchContracts]);

  // Mocked actions
  const addContractEndNotification = async (notification: Omit<ContractEndNotification, 'id'>) => {
      const newNotification = { ...notification, id: `cen-${MOCKED_NOTIFICATIONS_ID_COUNTER++}` };
      setContractEndNotifications(prev => [...prev, newNotification]);
  };

  const deleteContractEndNotification = async (notificationId: string) => {
      setContractEndNotifications(prev => prev.filter(n => n.id !== notificationId));
  }

  return (
    <ContractsContext.Provider value={{ 
        contracts, 
        isLoading, 
        fetchContracts,
        contractEndNotifications,
        addContractEndNotification,
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
