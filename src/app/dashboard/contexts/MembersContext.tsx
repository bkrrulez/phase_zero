
'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { teamMembers as initialTeamMembers, type User } from "@/lib/mock-data";
import useLocalStorage from '@/hooks/useLocalStorage';

interface MembersContextType {
  teamMembers: User[];
  updateMember: (updatedUser: User) => void;
  addMember: (newUser: User) => void;
}

export const MembersContext = createContext<MembersContextType | undefined>(undefined);

export function MembersProvider({ children }: { children: ReactNode }) {
  const [teamMembers, setTeamMembers] = useLocalStorage<User[]>('teamMembers', initialTeamMembers);

  const updateMember = (updatedUser: User) => {
    setTeamMembers(prevMembers =>
        prevMembers.map(member => member.id === updatedUser.id ? updatedUser : member)
    );
  };

  const addMember = (newUser: User) => {
    setTeamMembers(prev => [...prev, newUser]);
  };

  return (
    <MembersContext.Provider value={{ teamMembers, updateMember, addMember }}>
        {children}
    </MembersContext.Provider>
  );
}

export const useMembers = () => {
  const context = useContext(MembersContext);
  if (!context) {
    throw new Error("useMembers must be used within a MembersProvider");
  }
  return context;
};
