
'use client';

import * as React from 'react';
import { type FreezeRule } from "@/lib/types";
import { useSystemLog } from './SystemLogContext';
import { useAuth } from './AuthContext';
import { getFreezeRules, addFreezeRule as addFreezeRuleAction, removeFreezeRule as removeFreezeRuleAction } from '../actions';

interface AccessControlContextType {
  freezeRules: FreezeRule[];
  addFreezeRule: (newRuleData: Omit<FreezeRule, 'id'>, teamName: string) => Promise<void>;
  removeFreezeRule: (rule: FreezeRule, teamName: string) => Promise<void>;
}

const AccessControlContext = React.createContext<AccessControlContextType | undefined>(undefined);

export function AccessControlProvider({ children }: { children: React.ReactNode }) {
  const [freezeRules, setFreezeRules] = React.useState<FreezeRule[]>([]);
  const { logAction } = useSystemLog();
  const { currentUser } = useAuth();

  const fetchRules = React.useCallback(async () => {
    const rules = await getFreezeRules();
    setFreezeRules(rules);
  }, []);

  React.useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const addFreezeRule = async (newRuleData: Omit<FreezeRule, 'id'>, teamName: string) => {
    const newRule = await addFreezeRuleAction(newRuleData);
    if (newRule) {
        setFreezeRules(prev => [...prev, newRule]);
        await logAction(`User '${currentUser.name}' added a freeze rule for '${teamName}'.`);
    }
  };

  const removeFreezeRule = async (rule: FreezeRule, teamName: string) => {
    await removeFreezeRuleAction(rule.id);
    setFreezeRules(prev => prev.filter(r => r.id !== rule.id));
    await logAction(`User '${currentUser.name}' removed a freeze rule for '${teamName}'.`);
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

    