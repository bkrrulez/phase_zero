
'use client';

import { createContext, useContext } from 'react';
import type { TimeEntry } from "@/lib/mock-data";

interface TimeTrackingContextType {
  timeEntries: TimeEntry[];
}

export const TimeTrackingContext = createContext<TimeTrackingContextType | undefined>(undefined);

export const useTimeTracking = () => {
  const context = useContext(TimeTrackingContext);
  if (!context) {
    throw new Error("useTimeTracking must be used within a DashboardLayout's TimeTrackingContext.Provider");
  }
  return context;
};
