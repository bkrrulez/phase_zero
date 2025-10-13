
'use client';

import * as React from 'react';
import { type Absence } from "@/lib/types";
import { addAbsence as addAbsenceAction, updateAbsence as updateAbsenceAction, getAbsences } from '../actions';
import { useToast } from '@/hooks/use-toast';

export type AbsenceType = 'General Absence' | 'Sick Leave';

interface RosterContextType {
  absences: Absence[];
  addAbsence: (absence: Omit<Absence, 'id'>) => Promise<void>;
  updateAbsence: (absenceId: string, absence: Omit<Absence, 'id'>) => Promise<void>;
}

const RosterContext = React.createContext<RosterContextType | undefined>(undefined);

export function RosterProvider({ children }: { children: React.ReactNode }) {
  const [absences, setAbsences] = React.useState<Absence[]>([]);
  const { toast } = useToast();

  const fetchRosterData = React.useCallback(async () => {
      try {
        const fetchedAbsences = await getAbsences();
        setAbsences(fetchedAbsences);
      } catch (error) {
        console.error("Failed to fetch absences:", error);
      }
    }, []);

  React.useEffect(() => {
    fetchRosterData();
  }, [fetchRosterData]);

  const addAbsence = async (absence: Omit<Absence, 'id'>) => {
    const newAbsence = await addAbsenceAction(absence);
    if (newAbsence) {
      setAbsences(prev => [...prev, newAbsence]);
       toast({ title: 'Absence Marked', description: 'The absence has been successfully recorded.' });
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not mark absence.' });
    }
  };
  
  const updateAbsence = async (absenceId: string, absence: Omit<Absence, 'id'>) => {
    const updatedAbsence = await updateAbsenceAction(absenceId, absence);
    if(updatedAbsence) {
        setAbsences(prev => prev.map(a => a.id === absenceId ? updatedAbsence : a));
        toast({ title: 'Absence Updated', description: 'The absence has been successfully updated.' });
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update absence.' });
    }
  };

  return (
    <RosterContext.Provider value={{ absences, addAbsence, updateAbsence }}>
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
