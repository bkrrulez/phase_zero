
'use client';

import * as React from 'react';
import { type Contract } from "@/lib/types";
import { getContracts as getContractsAction } from '../actions';

interface ContractsContextType {
  contracts: Contract[];
  isLoading: boolean;
  fetchContracts: () => Promise<void>;
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

  return (
    <ContractsContext.Provider value={{ contracts, isLoading, fetchContracts }}>
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
