

'use client';

import * as React from 'react';
import { type LogEntry } from '@/lib/types';
import { getSystemLogs, addSystemLog, purgeOldSystemLogs, sendContractEndNotificationsNow } from '../actions';
import { useAuth } from './AuthContext';
import { differenceInHours } from 'date-fns';

interface SystemLogContextType {
  logs: LogEntry[];
  logAction: (message: string) => Promise<void>;
}

const SystemLogContext = React.createContext<SystemLogContextType | undefined>(undefined);

const PURGE_INTERVAL_HOURS = 24;
const CONTRACT_CHECK_INTERVAL_HOURS = 24;

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

        // System Log Purge Check
        const lastPurgeTimeStr = localStorage.getItem('lastSystemLogPurgeTime');
        const lastPurgeTime = lastPurgeTimeStr ? new Date(lastPurgeTimeStr) : new Date(0);
        const hoursSinceLastPurge = differenceInHours(new Date(), lastPurgeTime);

        if (hoursSinceLastPurge >= PURGE_INTERVAL_HOURS) {
            console.log('Performing daily check for old system logs to purge...');
            try {
                const deletedCount = await purgeOldSystemLogs();
                if (deletedCount > 0) {
                    console.log(`Successfully purged ${deletedCount} old log entries.`);
                    await fetchLogs();
                } else {
                    console.log('No old log entries to purge.');
                }
                localStorage.setItem('lastSystemLogPurgeTime', new Date().toISOString());
            } catch (error) {
                console.error('Failed to purge old system logs:', error);
            }
        }
        
        // Contract End Notification Check
        const lastContractCheckTimeStr = localStorage.getItem('lastContractNotificationCheckTime');
        const lastContractCheckTime = lastContractCheckTimeStr ? new Date(lastContractCheckTimeStr) : new Date(0);
        const hoursSinceLastCheck = differenceInHours(new Date(), lastContractCheckTime);

        if(hoursSinceLastCheck >= CONTRACT_CHECK_INTERVAL_HOURS) {
            console.log("Performing daily check for contract end notifications...");
            try {
                // Pass false to indicate this is an automatic, not manual, trigger
                const count = await sendContractEndNotificationsNow(false);
                if (count > 0) {
                    console.log(`Automatic notifications sent for ${count} contracts.`);
                    await logAction(`System automatically sent ${count} contract end notifications.`);
                }
                localStorage.setItem('lastContractNotificationCheckTime', new Date().toISOString());
            } catch (error) {
                console.error('Failed to run automatic contract end notifications:', error);
            }
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
