
'use client';

import * as React from 'react';
import { type Absence } from "@/lib/types";
import { addAbsence as addAbsenceAction, updateAbsence as updateAbsenceAction, getAbsences, deleteAbsencesInRange as deleteAbsencesInRangeAction } from '../actions';
import { useToast } from '@/hooks/use-toast';

export type AbsenceType = 'General Absence' | 'Sick Leave' | 'Clear Absence';

interface RosterContextType {
  absences: Absence[];
  addAbsence: (absence: Omit<Absence, 'id'>) => Promise<void>;
  updateAbsence: (absenceId: string, absence: Omit<Absence, 'id'>) => Promise<void>;
  deleteAbsencesInRange: (userId: string, startDate: string, endDate: string) => Promise<void>;
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
      await fetchRosterData(); // Re-fetch data to ensure UI consistency
      toast({ title: 'Absence Marked', description: 'The absence has been successfully recorded.' });
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not mark absence.' });
    }
  };
  
  const updateAbsence = async (absenceId: string, absence: Omit<Absence, 'id'>) => {
    const updatedAbsence = await updateAbsenceAction(absenceId, absence);
    if(updatedAbsence) {
        await fetchRosterData(); // Re-fetch data to ensure UI consistency
        toast({ title: 'Absence Updated', description: 'The absence has been successfully updated.' });
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update absence.' });
    }
  };
  
  const deleteAbsencesInRange = async (userId: string, startDate: string, endDate: string) => {
    const deletedCount = await deleteAbsencesInRangeAction(userId, startDate, endDate);
    if (deletedCount > 0) {
        await fetchRosterData();
        toast({ title: 'Absence Cleared', description: `${deletedCount} absence record(s) have been cleared.` });
    } else {
        toast({ variant: 'default', title: 'No Absences Found', description: 'No absences were found in the selected range to clear.' });
    }
  }

  return (
    <RosterContext.Provider value={{ absences, addAbsence, updateAbsence, deleteAbsencesInRange }}>
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
