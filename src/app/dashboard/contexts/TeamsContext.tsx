
'use client';
import * as React from 'react';
import { type Team } from "@/lib/types";
import useLocalStorage from '@/hooks/useLocalStorage';
import { initialData } from '@/lib/mock-data';

interface TeamsContextType {
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
}

export const TeamsContext = React.createContext<TeamsContextType | undefined>(undefined);

export function TeamsProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useLocalStorage<Team[]>('teams', initialData.teams);

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
