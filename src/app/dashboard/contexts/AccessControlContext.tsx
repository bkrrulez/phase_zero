
'use client';

import * as React from 'react';
import { type FreezeRule } from "@/lib/mock-data";
import useLocalStorage from '@/hooks/useLocalStorage';
import { useSystemLog } from './SystemLogContext';
import { useAuth } from './AuthContext';
import { freezeRules as initialFreezeRules } from '@/lib/mock-data';

interface AccessControlContextType {
  freezeRules: FreezeRule[];
  addFreezeRule: (newRule: FreezeRule, teamName: string) => void;
  removeFreezeRule: (rule: FreezeRule, teamName: string) => void;
}

const AccessControlContext = React.createContext<AccessControlContextType | undefined>(undefined);

export function AccessControlProvider({ children }: { children: React.ReactNode }) {
  const [freezeRules, setFreezeRules] = useLocalStorage<FreezeRule[]>('freezeRules', initialFreezeRules);
  const { logAction } = useSystemLog();
  const { currentUser } = useAuth();

  const addFreezeRule = (newRule: FreezeRule, teamName: string) => {
    setFreezeRules(prev => [...prev, newRule]);
    logAction(`User '${currentUser.name}' added a freeze rule for '${teamName}'.`);
  };

  const removeFreezeRule = (rule: FreezeRule, teamName: string) => {
    setFreezeRules(prev => prev.filter(r => r.id !== rule.id));
    logAction(`User '${currentUser.name}' removed a freeze rule for '${teamName}'.`);
  };

  return (
    <AccessControlContext.Provider value={{ freezeRules, addFreezeRule, removeFreezeRule }}>
      {children}
    </AccessControlContext.Provider>
  );
}

export const useAccessControl = () => {
  const context = React.useContext(AccessControlContext);
  if (!context) {
    throw new Error("useAccessControl must be used within an AccessControlProvider");
  }
  return context;
};
