
'use client';
import * as React from 'react';
import { type Team } from "@/lib/types";
import { getTeams, addTeam as addTeamAction, updateTeam as updateTeamAction } from '../actions';

interface TeamsContextType {
  teams: Team[];
  addTeam: (teamData: Omit<Team, 'id'>) => Promise<void>;
  updateTeam: (teamId: string, teamData: Omit<Team, 'id'>) => Promise<void>;
  isLoading: boolean;
}

export const TeamsContext = React.createContext<TeamsContextType | undefined>(undefined);

export function TeamsProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

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
    await addTeamAction(teamData);
    await fetchTeams();
  };

  const updateTeam = async (teamId: string, teamData: Omit<Team, 'id'>) => {
    await updateTeamAction(teamId, teamData);
    await fetchTeams();
  };


  return (
    <TeamsContext.Provider value={{ teams, addTeam, updateTeam, isLoading }}>
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

    