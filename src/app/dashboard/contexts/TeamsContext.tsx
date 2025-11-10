

'use client';
import * as React from 'react';
import { type Team } from "@/lib/types";
import { getTeams, addTeam as addTeamAction, updateTeam as updateTeamAction, deleteTeam as deleteTeamAction } from '../actions';
import { useSystemLog } from './SystemLogContext';
import { useAuth } from './AuthContext';

interface TeamsContextType {
  teams: Team[];
  addTeam: (teamData: Omit<Team, 'id'>) => Promise<void>;
  updateTeam: (teamId: string, teamData: Omit<Team, 'id'>) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  isLoading: boolean;
}

export const TeamsContext = React.createContext<TeamsContextType | undefined>(undefined);

export function TeamsProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { currentUser } = useAuth();
  const { logAction } = useSystemLog();

  const fetchTeams = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const fetchedTeams = await getTeams();
        setTeams(fetchedTeams);
    } catch (error) {
        console.error("Failed to fetch teams", error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const addTeam = async (teamData: Omit<Team, 'id'>) => {
    if (!currentUser) return;
    await addTeamAction(teamData);
    await logAction(`User '${currentUser.name}' created team '${teamData.name}'.`);
    await fetchTeams();
  };

  const updateTeam = async (teamId: string, teamData: Omit<Team, 'id'>) => {
    if (!currentUser) return;
    await updateTeamAction(teamId, teamData);
    await logAction(`User '${currentUser.name}' updated team '${teamData.name}' (ID: ${teamId}).`);
    await fetchTeams();
  };

  const deleteTeam = async (teamId: string) => {
    if (!currentUser) return;
    const teamToDelete = teams.find(t => t.id === teamId);
    await deleteTeamAction(teamId);
    if(teamToDelete) {
      await logAction(`User '${currentUser.name}' deleted team '${teamToDelete.name}' (ID: ${teamId}).`);
    }
    await fetchTeams();
  }


  return (
    <TeamsContext.Provider value={{ teams, addTeam, updateTeam, deleteTeam, isLoading }}>
        {children}
    </TeamsContext.Provider>
  );
}

export const useTeams = () => {
  const context = React.useContext(TeamsContext);
  if (!context) {
    throw new Error("useTeams must be used within a TeamsProvider");
  }
  return context;
};
