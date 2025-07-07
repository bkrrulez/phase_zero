
'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { teams as initialTeams, type Team } from "@/lib/mock-data";
import useLocalStorage from '@/hooks/useLocalStorage';

interface TeamsContextType {
  teams: Team[];
  setTeams: (teams: Team[] | ((prev: Team[]) => Team[])) => void;
}

export const TeamsContext = createContext<TeamsContextType | undefined>(undefined);

export function TeamsProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useLocalStorage<Team[]>('teams', initialTeams);

  return (
    <TeamsContext.Provider value={{ teams, setTeams }}>
        {children}
    </TeamsContext.Provider>
  );
}

export const useTeams = () => {
  const context = useContext(TeamsContext);
  if (!context) {
    throw new Error("useTeams must be used within a TeamsProvider");
  }
  return context;
};
