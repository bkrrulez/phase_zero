'use client';

import * as React from 'react';
import { type LogEntry } from '@/lib/types';
import { getSystemLogs, addSystemLog, purgeOldSystemLogs, sendContractEndNotificationsNow, getSystemSetting, setSystemSetting } from '../actions';
import { useAuth } from './AuthContext';
import { differenceInHours, startOfToday } from 'date-fns';

interface SystemLogContextType {
  logs: LogEntry[];
  logAction: (message: string) => Promise<void>;
}

const SystemLogContext = React.createContext<SystemLogContextType | undefined>(undefined);

const PURGE_INTERVAL_HOURS = 24;
const NOTIFICATION_HOUR = 10; // 10 AM

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
        
        // --- System Log Purge Check (keeps running every 24h) ---
        const lastPurgeTimeStr = await getSystemSetting('lastSystemLogPurgeTime');
        const lastPurgeTime = lastPurgeTimeStr ? new Date(lastPurgeTimeStr) : new Date(0);
        if (differenceInHours(now, lastPurgeTime) >= PURGE_INTERVAL_HOURS) {
            console.log('Performing daily check for old system logs to purge...');
            try {
                const deletedCount = await purgeOldSystemLogs();
                if (deletedCount > 0) {
                    console.log(`Successfully purged ${deletedCount} old log entries.`);
                    await fetchLogs();
                } else {
                    console.log('No old log entries to purge.');
                }
                await setSystemSetting('lastSystemLogPurgeTime', now.toISOString());
            } catch (error) {
                console.error('Failed to purge old system logs:', error);
            }
        }
        
        // --- Contract End Notification Check (runs at a specific time) ---
        const lastCheckTimeStr = await getSystemSetting('lastContractNotificationCheckTime');
        const lastCheckTime = lastCheckTimeStr ? new Date(lastCheckTimeStr) : new Date(0);
        
        const todayAtRunTime = new Date(startOfToday().setHours(NOTIFICATION_HOUR));

        // Check if it's time to run:
        // 1. Current time is past the scheduled run time for today.
        // 2. The last check was performed before today's scheduled run time.
        if (now >= todayAtRunTime && lastCheckTime < todayAtRunTime) {
            console.log(`It's past ${NOTIFICATION_HOUR}:00 AM, running daily contract notification check...`);
            try {
                // Pass false to indicate this is an automatic, not manual, trigger
                const count = await sendContractEndNotificationsNow(false);
                if (count > 0) {
                    await logAction(`System automatically sent ${count} contract end notifications.`);
                }
                // Record that the check for today has been run
                await setSystemSetting('lastContractNotificationCheckTime', now.toISOString());
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
