
'use client';

import * as React from 'react';
import { type User } from "@/lib/types";
import { getUsers, addUser as addUserAction, updateUser as updateUserAction, deleteUser as deleteUserAction } from '../actions';
import { EditMemberFormValues } from '../team/components/edit-contract-dialog';
import { useContracts } from './ContractsContext';

interface MembersContextType {
  teamMembers: User[];
  updateMember: (originalUser: User, updatedData: EditMemberFormValues) => Promise<void>;
  addMember: (newUser: Omit<User, 'id' | 'avatar'>) => Promise<void>;
  deleteMember: (userId: string) => Promise<void>;
  isLoading: boolean;
  fetchMembers: () => Promise<void>;
}

export const MembersContext = React.createContext<MembersContextType | undefined>(undefined);

export function MembersProvider({ children }: { children: React.ReactNode }) {
  const [teamMembers, setTeamMembers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { fetchContracts } = useContracts();

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


  const updateMember = async (originalUser: User, updatedData: EditMemberFormValues) => {
    // Construct the full user object to send to the server
    const userToUpdate: User = {
        ...originalUser,
        name: updatedData.name,
        email: updatedData.email,
        role: updatedData.role,
        reportsTo: updatedData.reportsTo,
        teamId: updatedData.teamId,
        associatedProjectIds: updatedData.associatedProjectIds,
        contracts: updatedData.contracts.map(c => ({
            id: c.id,
            startDate: c.startDate,
            endDate: c.endDate || null,
            weeklyHours: c.weeklyHours,
        })),
        // The primary contract is purely for display and will be recalculated on the backend
        // So we can just pass a placeholder.
        contract: originalUser.contract 
    };
    
    const updatedUserFromServer = await updateUserAction(userToUpdate);
    
    if (updatedUserFromServer) {
      setTeamMembers(prevMembers =>
        prevMembers.map(member => member.id === updatedUserFromServer.id ? updatedUserFromServer : member)
      );
      // After updating members, refetch contracts to ensure consistency across the app
      await fetchContracts();
    }
  };

  const addMember = async (newUserData: Omit<User, 'id' | 'avatar'>) => {
    const newUser = await addUserAction(newUserData);
    if(newUser) {
      setTeamMembers(prev => [...prev, newUser]);
      await fetchContracts();
    }
  };

  const deleteMember = async (userId: string) => {
    await deleteUserAction(userId);
    setTeamMembers(prev => prev.filter(m => m.id !== userId));
    await fetchContracts();
  };

  return (
    <MembersContext.Provider value={{ teamMembers, updateMember, addMember, deleteMember, isLoading, fetchMembers }}>
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
