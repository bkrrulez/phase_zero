
'use client';

import * as React from 'react';
import { type Contract, type User } from "@/lib/types";
import { useMembers } from './MembersContext';

interface ContractsContextType {
  contracts: Contract[];
  isLoading: boolean;
}

export const ContractsContext = React.createContext<ContractsContextType | undefined>(undefined);

export function ContractsProvider({ children }: { children: React.ReactNode }) {
  const { teamMembers, isLoading: membersLoading } = useMembers();
  const [contracts, setContracts] = React.useState<Contract[]>([]);

  React.useEffect(() => {
    // Derive contracts from team members to ensure consistency
    const allContracts = teamMembers.flatMap(member => 
        member.contracts.map(c => ({
            ...c,
            userId: member.id,
        }))
    );
    setContracts(allContracts);
  }, [teamMembers]);


  return (
    <ContractsContext.Provider value={{ contracts, isLoading: membersLoading }}>
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
