
'use client';

import * as React from 'react';
import { type Absence } from "@/lib/types";
import { getAbsences, addAbsence as addAbsenceAction } from '../actions';

export type AbsenceType = 'General Absence' | 'Sick Leave';

interface RosterContextType {
  absences: Absence[];
  addAbsence: (absence: Omit<Absence, 'id'>) => Promise<void>;
}

const RosterContext = React.createContext<RosterContextType | undefined>(undefined);

export function RosterProvider({ children }: { children: React.ReactNode }) {
  const [absences, setAbsences] = React.useState<Absence[]>([]);

  React.useEffect(() => {
    const fetchRosterData = async () => {
      const fetchedAbsences = await getAbsences();
      setAbsences(fetchedAbsences);
    };
    fetchRosterData();
  }, []);

  const addAbsence = async (absence: Omit<Absence, 'id'>) => {
    const newAbsence = await addAbsenceAction(absence);
    if (newAbsence) {
      setAbsences(prev => [...prev, newAbsence]);
    }
  };

  return (
    <RosterContext.Provider value={{ absences, addAbsence }}>
      {children}
    </RosterContext.Provider>
  );
}

export const useRoster = () => {
  const context = React.useContext(RosterContext);
  if (!context) {
    throw new Error('useRoster must be used within a RosterProvider');
  }
  return context;
};
