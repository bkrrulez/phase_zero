
'use client';

import * as React from 'react';
import { type User } from "@/lib/types";
import { addMember as addMemberAction, updateMember as updateMemberAction } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { useSystemLog } from './SystemLogContext';
import { useAuth } from './AuthContext';

interface MembersContextType {
  teamMembers: User[];
  updateMember: (updatedUser: User) => Promise<void>;
  addMember: (newUser: User) => Promise<void>;
}

export const MembersContext = React.createContext<MembersContextType | undefined>(undefined);

export function MembersProvider({ children, initialMembers }: { children: React.ReactNode; initialMembers: User[] }) {
  const [teamMembers, setTeamMembers] = React.useState<User[]>(initialMembers);
  const { toast } = useToast();
  const { logAction } = useSystemLog();
  const { currentUser } = useAuth();


  const updateMember = async (updatedUser: User) => {
    try {
      await updateMemberAction(updatedUser);
      setTeamMembers(prevMembers =>
          prevMembers.map(member => member.id === updatedUser.id ? updatedUser : member)
      );
      toast({ title: "Member Updated", description: `Details for ${updatedUser.name} have been updated.` });
      logAction(`User '${currentUser.name}' updated details for member '${updatedUser.name}'.`);
    } catch (error) {
      toast({ variant: 'destructive', title: "Error", description: "Failed to update member."});
    }
  };

  const addMember = async (newUser: User) => {
    try {
      const addedUser = await addMemberAction(newUser);
      setTeamMembers(prev => [...prev, addedUser]);
      toast({ title: "Member Added", description: `${newUser.name} has been added.` });
      logAction(`User '${currentUser.name}' added a new member: '${newUser.name}'.`);
    } catch (error) {
       toast({ variant: 'destructive', title: "Error", description: "Failed to add member."});
    }
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
