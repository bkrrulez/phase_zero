
'use client';

import * as React from 'react';
import { type LogEntry } from '@/lib/types';
import { getSystemLogs, addSystemLog, purgeOldSystemLogs } from '../actions';
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
    const runPurgeCheck = async (currentLogs: LogEntry[]) => {
        if (currentUser?.role !== 'Super Admin') return;

        const lastPurgeLog = currentLogs.find(log => log.message.startsWith('System automatically purged'));

        let shouldPurge = true;
        if (lastPurgeLog) {
            const lastPurgeTime = new Date(lastPurgeLog.timestamp);
            const hoursSinceLastPurge = differenceInHours(new Date(), lastPurgeTime);
            if (hoursSinceLastPurge < PURGE_INTERVAL_HOURS) {
                shouldPurge = false;
            }
        }
        
        if (shouldPurge) {
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
            } catch (error) {
                console.error('Failed to purge old system logs:', error);
            }
        }
    };

    if (currentUser) {
        // Fetch logs first, then decide whether to purge
        fetchLogs().then(fetchedLogs => {
            runPurgeCheck(fetchedLogs);
        });
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
