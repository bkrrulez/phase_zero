
'use client';

import * as React from 'react';
import { teamMembers as initialTeamMembers, type User } from "@/lib/mock-data";
import useLocalStorage from '@/hooks/useLocalStorage';

interface MembersContextType {
  teamMembers: User[];
  updateMember: (updatedUser: User) => void;
  addMember: (newUser: User) => void;
}

export const MembersContext = React.createContext<MembersContextType | undefined>(undefined);

export function MembersProvider({ children }: { children: React.ReactNode }) {
  const [rawTeamMembers, setTeamMembers] = useLocalStorage<User[]>('teamMembers', initialTeamMembers);

  // This memoized value ensures that we always work with a list of unique members,
  // preventing "duplicate key" errors in React, even if localStorage data is temporarily corrupted.
  const teamMembers = React.useMemo(() => {
    const uniqueMembers = new Map<string, User>();
    rawTeamMembers.forEach(member => {
      uniqueMembers.set(member.id, member);
    });
    return Array.from(uniqueMembers.values());
  }, [rawTeamMembers]);


  const updateMember = (updatedUser: User) => {
    setTeamMembers(prevMembers =>
        prevMembers.map(member => member.id === updatedUser.id ? updatedUser : member)
    );
  };

  const addMember = (newUser: User) => {
    // Ensure we don't add a user if one with the same ID already exists.
    setTeamMembers(prev => {
        const userExists = prev.some(member => member.id === newUser.id);
        if (userExists) {
            return prev.map(member => member.id === newUser.id ? newUser : member);
        }
        return [...prev, newUser];
    });
  };

  return (
    <MembersContext.Provider value={{ teamMembers, updateMember, addMember }}>
        {children}
    </MembersContext.Provider>
  );
}

export const useMembers = () => {
  const context = React.useContext(MembersContext);
  if (!context) {
    throw new Error("useMembers must be used within a MembersProvider");
  }
  return context;
};
