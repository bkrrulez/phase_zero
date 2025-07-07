
'use client';

import * as React from 'react';
import type { TimeEntry } from "@/lib/types";
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { LogTimeFormValues } from '../components/log-time-dialog';
import { useSystemLog } from './SystemLogContext';
import { useAuth } from './AuthContext';
import useLocalStorage from '@/hooks/useLocalStorage';
import { initialData } from '@/lib/mock-data';

interface TimeTrackingContextType {
  timeEntries: TimeEntry[];
  logTime: (data: LogTimeFormValues) => Promise<{ success: boolean }>;
}

export const TimeTrackingContext = React.createContext<TimeTrackingContextType | undefined>(undefined);

export function TimeTrackingProvider({ children }: { children: React.ReactNode }) {
  const [timeEntries, setTimeEntries] = useLocalStorage<TimeEntry[]>('timeEntries', initialData.timeEntries);
  const { toast } = useToast();
  const { logAction } = useSystemLog();
  const { currentUser } = useAuth();

  const logTime = async (data: LogTimeFormValues): Promise<{ success: boolean }> => {
    try {
      const start = new Date(`1970-01-01T${data.startTime}`);
      const end = new Date(`1970-01-01T${data.endTime}`);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

      if (duration < 0) {
        toast({
          variant: 'destructive',
          title: 'Invalid Time',
          description: 'End time cannot be earlier than start time.',
        });
        return { success: false };
      }

      const newEntry: TimeEntry = {
        id: `te-${Date.now()}`,
        userId: currentUser.id,
        date: format(data.date, 'yyyy-MM-dd'),
        startTime: data.startTime,
        endTime: data.endTime,
        task: `${data.project} - ${data.task}`,
        duration: duration,
        remarks: data.remarks,
      };

      setTimeEntries(prev => [newEntry, ...prev]);
      toast({
          title: "Time Logged Successfully",
          description: `Logged ${newEntry.duration.toFixed(2)} hours for ${format(new Date(newEntry.date), 'PPP')}.`
      });
      logAction(`User '${currentUser.name}' logged ${newEntry.duration.toFixed(2)} hours.`);
      return { success: true };
    } catch (error) {
      console.error("Failed to log time:", error);
      toast({
        variant: 'destructive',
        title: "Error",
        description: "Failed to log time.",
      });
      return { success: false };
    }
  };
  
  return (
    <TimeTrackingContext.Provider value={{ timeEntries, logTime }}>
        {children}
    </TimeTrackingContext.Provider>
  )
}

export const useTimeTracking = () => {
  const context = React.useContext(TimeTrackingContext);
  if (!context) {
    throw new Error("useTimeTracking must be used within a TimeTrackingProvider");
  }
  return context;
};
