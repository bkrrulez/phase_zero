
'use client';

import * as React from 'react';
import { type LogEntry } from '@/lib/types';

interface SystemLogContextType {
  logs: LogEntry[];
  logAction: (message: string) => void;
}

const SystemLogContext = React.createContext<SystemLogContextType | undefined>(undefined);

export function SystemLogProvider({ children, initialLogs }: { children: React.ReactNode, initialLogs: LogEntry[] }) {
  const [logs, setLogs] = React.useState<LogEntry[]>(initialLogs);

  const logAction = (message: string) => {
    const newLog: LogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      message,
    };
    setLogs(prev => [newLog, ...prev]);
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
