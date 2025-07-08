
'use client';

import * as React from 'react';
import { type LogEntry } from '@/lib/types';
import { getSystemLogs, addSystemLog } from '../actions';

interface SystemLogContextType {
  logs: LogEntry[];
  logAction: (message: string) => Promise<void>;
}

const SystemLogContext = React.createContext<SystemLogContextType | undefined>(undefined);

export function SystemLogProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  
  const fetchLogs = React.useCallback(async () => {
    const fetchedLogs = await getSystemLogs();
    setLogs(fetchedLogs);
  }, []);

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

    