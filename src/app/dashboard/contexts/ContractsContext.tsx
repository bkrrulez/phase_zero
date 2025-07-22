
'use client';

import * as React from 'react';
import { type Contract } from "@/lib/types";
import { getContracts, addContract as addContractAction, updateContract as updateContractAction, deleteContract as deleteContractAction } from '../actions';

interface ContractsContextType {
  contracts: Contract[];
  addContract: (newContractData: Omit<Contract, 'id'>) => Promise<void>;
  updateContract: (contractId: string, data: Omit<Contract, 'id'>) => Promise<void>;
  deleteContract: (contractId: string) => Promise<void>;
  isLoading: boolean;
}

export const ContractsContext = React.createContext<ContractsContextType | undefined>(undefined);

export function ContractsProvider({ children }: { children: React.ReactNode }) {
  const [contracts, setContracts] = React.useState<Contract[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchContracts = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedContracts = await getContracts();
      setContracts(fetchedContracts);
    } catch (error) {
      console.error("Failed to fetch contracts", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const addContract = async (contractData: Omit<Contract, 'id'>) => {
    await addContractAction(contractData);
    await fetchContracts();
  };

  const updateContract = async (contractId: string, data: Omit<Contract, 'id'>) => {
    await updateContractAction(contractId, data);
    await fetchContracts();
  };

  const deleteContract = async (contractId: string) => {
    await deleteContractAction(contractId);
    setContracts(prev => prev.filter(c => c.id !== contractId));
  };

  return (
    <ContractsContext.Provider value={{ contracts, addContract, updateContract, deleteContract, isLoading }}>
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
