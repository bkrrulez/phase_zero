
'use client';

import * as React from 'react';
import { type User } from "@/lib/types";
import { useToast } from '@/hooks/use-toast';
import { useSystemLog } from './SystemLogContext';
import { useAuth } from './AuthContext';
import useLocalStorage from '@/hooks/useLocalStorage';
import { initialData } from '@/lib/mock-data';

interface MembersContextType {
  teamMembers: User[];
  updateMember: (updatedUser: User) => void;
  addMember: (newUser: User) => void;
}

export const MembersContext = React.createContext<MembersContextType | undefined>(undefined);

export function MembersProvider({ children }: { children: React.ReactNode }) {
  const [teamMembers, setTeamMembers] = useLocalStorage<User[]>('teamMembers', initialData.teamMembers);
  const { toast } = useToast();
  const { logAction } = useSystemLog();
  const { currentUser } = useAuth();


  const updateMember = (updatedUser: User) => {
    setTeamMembers(prevMembers =>
        prevMembers.map(member => member.id === updatedUser.id ? updatedUser : member)
    );
    toast({ title: "Member Updated", description: `Details for ${updatedUser.name} have been updated.` });
    logAction(`User '${currentUser.name}' updated details for member '${updatedUser.name}'.`);
  };

  const addMember = (newUser: User) => {
    setTeamMembers(prev => [...prev, newUser]);
    toast({ title: "Member Added", description: `${newUser.name} has been added.` });
    logAction(`User '${currentUser.name}' added a new member: '${newUser.name}'.`);
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
