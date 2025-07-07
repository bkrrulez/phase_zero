
'use client';
import * as React from 'react';
import { type Team } from "@/lib/types";

interface TeamsContextType {
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
}

export const TeamsContext = React.createContext<TeamsContextType | undefined>(undefined);

export function TeamsProvider({ children, initialTeams }: { children: React.ReactNode, initialTeams: Team[] }) {
  const [teams, setTeams] = React.useState<Team[]>(initialTeams);

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
