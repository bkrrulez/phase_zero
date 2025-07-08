
'use client';

import * as React from 'react';
import { type User } from "@/lib/types";
import { getUsers, addUser as addUserAction, updateUser as updateUserAction } from '../actions';

interface MembersContextType {
  teamMembers: User[];
  updateMember: (updatedUser: User) => Promise<void>;
  addMember: (newUser: Omit<User, 'id' | 'avatar'>) => Promise<void>;
  isLoading: boolean;
}

export const MembersContext = React.createContext<MembersContextType | undefined>(undefined);

export function MembersProvider({ children }: { children: React.ReactNode }) {
  const [teamMembers, setTeamMembers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchMembers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const users = await getUsers();
      setTeamMembers(users);
    } catch (error) {
      console.error("Failed to fetch team members", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);


  const updateMember = async (updatedUser: User) => {
    await updateUserAction(updatedUser);
    setTeamMembers(prevMembers =>
        prevMembers.map(member => member.id === updatedUser.id ? updatedUser : member)
    );
  };

  const addMember = async (newUserData: Omit<User, 'id' | 'avatar'>) => {
    const newUser = await addUserAction(newUserData);
    if(newUser) {
      setTeamMembers(prev => [...prev, newUser]);
    }
  };

  return (
    <MembersContext.Provider value={{ teamMembers, updateMember, addMember, isLoading }}>
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

    