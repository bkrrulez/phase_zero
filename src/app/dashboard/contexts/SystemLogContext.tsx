'use client';

import * as React from 'react';
import { type LogEntry } from '@/lib/types';
import { getSystemLogs, addSystemLog, purgeOldSystemLogs, sendContractEndNotificationsNow, getSystemSetting, setSystemSetting } from '../actions';
import { useAuth } from './AuthContext';
import { differenceInHours } from 'date-fns';

interface SystemLogContextType {
  logs: LogEntry[];
  logAction: (message: string) => Promise<void>;
}

const SystemLogContext = React.createContext<SystemLogContextType | undefined>(undefined);

const PURGE_INTERVAL_HOURS = 24;

export function SystemLogProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const { currentUser } = useAuth();
  
  const fetchLogs = React.useCallback(async () => {
    const fetchedLogs = await getSystemLogs();
    setLogs(fetchedLogs);
    return fetchedLogs;
  }, []);

  React.useEffect(() => {
    const runDailyTasks = async () => {
        if (currentUser?.role !== 'Super Admin') return;

        const now = new Date();
        
        // --- System Log Purge Check (runs every 24h) ---
        const lastPurgeTimeStr = await getSystemSetting('lastSystemLogPurgeTime');
        const lastPurgeTime = lastPurgeTimeStr ? new Date(lastPurgeTimeStr) : new Date(0);
        if (differenceInHours(now, lastPurgeTime) >= PURGE_INTERVAL_HOURS) {
            try {
                const deletedCount = await purgeOldSystemLogs();
                if (deletedCount > 0) {
                    await fetchLogs();
                }
                await setSystemSetting('lastSystemLogPurgeTime', now.toISOString());
            } catch (error) {
                console.error('Failed to purge old system logs:', error);
            }
        }
        
        // --- Contract End Notification Check (runs on every render, but action has internal check) ---
        try {
            await sendContractEndNotificationsNow(false);
        } catch (error) {
            console.error('Failed to run automatic contract end notifications:', error);
        }
    };

    if (currentUser) {
        fetchLogs();
        runDailyTasks();
    }
  }, [currentUser, fetchLogs]);

  const logAction = async (message: string) => {
    const newLog = await addSystemLog(message);
    if (newLog) {
      setLogs(prev => [newLog, ...prev]);
    }
  };

  return (
    <SystemLogContext.Provider value={{ logs, logAction }}>
      {children}
    </SystemLogContext.Provider>
  );
}

export const useSystemLog = () => {
  const context = React.useContext(SystemLogContext);
  if (!context) {
    throw new Error('useSystemLog must be used within a SystemLogProvider');
  }
  return context;
};
