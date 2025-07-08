
'use client';

import * as React from 'react';
import type { TimeEntry } from "@/lib/types";
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { LogTimeFormValues } from '../components/log-time-dialog';
import { useSystemLog } from './SystemLogContext';
import { useAuth } from './AuthContext';
import { getTimeEntries, logTime as logTimeAction } from '../actions';

interface TimeTrackingContextType {
  timeEntries: TimeEntry[];
  logTime: (data: LogTimeFormValues) => Promise<{ success: boolean }>;
  isLoading: boolean;
}

export const TimeTrackingContext = React.createContext<TimeTrackingContextType | undefined>(undefined);

export function TimeTrackingProvider({ children }: { children: React.ReactNode }) {
  const [timeEntries, setTimeEntries] = React.useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();
  const { logAction } = useSystemLog();
  const { currentUser } = useAuth();
  
  const fetchEntries = React.useCallback(async () => {
    setIsLoading(true);
    try {
        const entries = await getTimeEntries();
        setTimeEntries(entries);
    } catch (error) {
        console.error("Failed to fetch time entries", error);
    } finally {
        setIsLoading(false);
    }
  }, []);
  
  React.useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

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

      const newEntryData = {
        userId: currentUser.id,
        date: format(data.date, 'yyyy-MM-dd'),
        startTime: data.startTime,
        endTime: data.endTime,
        projectId: data.project,
        taskId: data.task,
        duration: duration,
        remarks: data.remarks,
      };

      const newEntry = await logTimeAction(newEntryData);

      if (newEntry) {
        setTimeEntries(prev => [newEntry, ...prev]);
        toast({
            title: "Time Logged Successfully",
            description: `Logged ${newEntry.duration.toFixed(2)} hours for ${format(new Date(newEntry.date), 'PPP')}.`
        });
        await logAction(`User '${currentUser.name}' logged ${newEntry.duration.toFixed(2)} hours.`);
        return { success: true };
      }
      return { success: false };
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
    <TimeTrackingContext.Provider value={{ timeEntries, logTime, isLoading }}>
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

    