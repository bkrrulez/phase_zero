
'use client';

import * as React from 'react';
import type { TimeEntry } from "@/lib/mock-data";
import { timeEntries as initialTimeEntries, currentUser } from "@/lib/mock-data";
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { LogTimeFormValues } from '../components/log-time-dialog';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useSystemLog } from './SystemLogContext';

interface TimeTrackingContextType {
  timeEntries: TimeEntry[];
  logTime: (data: LogTimeFormValues) => { success: boolean };
}

export const TimeTrackingContext = React.createContext<TimeTrackingContextType | undefined>(undefined);

const calculateDuration = (startTime: string, endTime: string): number => {
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    const diff = end.getTime() - start.getTime();
    return diff / (1000 * 60 * 60);
};

export function TimeTrackingProvider({ children }: { children: React.ReactNode }) {
  const [timeEntries, setTimeEntries] = useLocalStorage<TimeEntry[]>('timeEntries', initialTimeEntries);
  const { toast } = useToast();
  const { logAction } = useSystemLog();

  const logTime = (data: LogTimeFormValues): { success: boolean } => {
    const newEntry: TimeEntry = {
      id: `t-${Date.now()}`,
      userId: currentUser.id,
      date: data.date.toISOString(),
      startTime: data.startTime,
      endTime: data.endTime,
      task: `${data.project} - ${data.task}`,
      duration: calculateDuration(data.startTime, data.endTime),
      remarks: data.remarks,
    };
    setTimeEntries(prev => [newEntry, ...prev]);
    toast({
        title: "Time Logged Successfully",
        description: `Logged ${newEntry.duration.toFixed(2)} hours for ${format(new Date(newEntry.date), 'PPP')}.`
    });
    logAction(`User '${currentUser.name}' logged ${newEntry.duration.toFixed(2)} hours.`);
    return { success: true };
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
