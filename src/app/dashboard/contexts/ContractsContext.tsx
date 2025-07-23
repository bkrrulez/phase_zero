
'use client';

import * as React from 'react';
import { type Contract } from "@/lib/types";
import { useMembers } from './MembersContext';
import { getContracts as getContractsAction } from '../actions';

interface ContractsContextType {
  contracts: Contract[];
  isLoading: boolean;
  addContract: (newContract: Omit<Contract, 'id'>) => void;
  updateContract: (contractId: string, updatedData: Omit<Contract, 'id'>) => void;
  deleteContract: (contractId: string) => void;
}

export const ContractsContext = React.createContext<ContractsContextType | undefined>(undefined);

export function ContractsProvider({ children }: { children: React.ReactNode }) {
  const [contracts, setContracts] = React.useState<Contract[]>([]);
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

  const addContract = (newContractData: Omit<Contract, 'id'>) => {
    // This is optimistic UI update. A re-fetch is better for real apps.
    const tempId = `contract-${Date.now()}`;
    setContracts(prev => [...prev, {id: tempId, ...newContractData}]);
    fetchContracts(); // Re-fetch to get the real data from the server
  }
  
  const updateContract = (contractId: string, updatedData: Omit<Contract, 'id'>) => {
      setContracts(prev => prev.map(c => c.id === contractId ? {id: contractId, ...updatedData} : c));
      fetchContracts();
  }

  const deleteContract = (contractId: string) => {
      setContracts(prev => prev.filter(c => c.id !== contractId));
  }

  return (
    <ContractsContext.Provider value={{ contracts, isLoading, addContract, updateContract, deleteContract }}>
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
