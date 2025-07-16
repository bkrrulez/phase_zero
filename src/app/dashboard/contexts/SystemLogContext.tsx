
'use client';

import * as React from 'react';
import { type LogEntry } from '@/lib/types';
import { getSystemLogs, addSystemLog, purgeOldSystemLogs } from '../actions';
import { useAuth } from './AuthContext';

interface SystemLogContextType {
  logs: LogEntry[];
  logAction: (message: string) => Promise<void>;
}

const SystemLogContext = React.createContext<SystemLogContextType | undefined>(undefined);

const LAST_PURGE_KEY = 'lastSystemLogPurge';
const PURGE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export function SystemLogProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const { currentUser } = useAuth();
  
  const fetchLogs = React.useCallback(async () => {
    const fetchedLogs = await getSystemLogs();
    setLogs(fetchedLogs);
  }, []);

  React.useEffect(() => {
    const runPurgeCheck = async () => {
        if (currentUser?.role !== 'Super Admin') return;

        const lastPurgeStr = localStorage.getItem(LAST_PURGE_KEY);
        const lastPurgeTime = lastPurgeStr ? parseInt(lastPurgeStr, 10) : 0;
        const now = Date.now();

        if (now - lastPurgeTime > PURGE_INTERVAL) {
            console.log('Performing daily check for old system logs to purge...');
            try {
                const deletedCount = await purgeOldSystemLogs();
                if (deletedCount > 0) {
                    console.log(`Successfully purged ${deletedCount} old log entries.`);
                    // We need to re-fetch logs if any were purged to update the view
                    await fetchLogs();
                } else {
                    console.log('No old log entries to purge.');
                }
                localStorage.setItem(LAST_PURGE_KEY, String(now));
            } catch (error) {
                console.error('Failed to purge old system logs:', error);
            }
        }
    };

    if (currentUser) {
        runPurgeCheck();
    }
  }, [currentUser, fetchLogs]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
