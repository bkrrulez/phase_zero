
'use client';
import * as React from 'react';
import { teams as initialTeams, type Team } from "@/lib/mock-data";
import useLocalStorage from '@/hooks/useLocalStorage';

interface TeamsContextType {
  teams: Team[];
  setTeams: (teams: Team[] | ((prev: Team[]) => Team[])) => void;
}

export const TeamsContext = React.createContext<TeamsContextType | undefined>(undefined);

export function TeamsProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useLocalStorage<Team[]>('teams', initialTeams);

  return (
    <TeamsContext.Provider value={{ teams, setTeams }}>
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
