
'use client';

import * as React from 'react';
import { type FreezeRule } from "@/lib/types";
import { useSystemLog } from './SystemLogContext';
import { useAuth } from './AuthContext';
import { getFreezeRules, addFreezeRule as addFreezeRuleAction, removeFreezeRule as removeFreezeRuleAction } from '../actions';
import { subDays, getDay, format } from 'date-fns';

interface AccessControlContextType {
  freezeRules: FreezeRule[];
  addFreezeRule: (newRuleData: Omit<FreezeRule, 'id'>) => Promise<void>;
  removeFreezeRule: (rule: FreezeRule, teamName: string) => Promise<void>;
}

const AccessControlContext = React.createContext<AccessControlContextType | undefined>(undefined);

// Helper to calculate the dynamic end date for recurring rules
const getDynamicEndDate = (rule: FreezeRule): string => {
  if (rule.recurringDay === undefined || rule.recurringDay === null) {
    return rule.endDate;
  }
  
  const targetDay = rule.recurringDay; // 0=Sun, 1=Mon, ..., 6=Sat
  const today = new Date();
  const currentDay = getDay(today); // Today's day of the week

  let daysToSubtract = currentDay - targetDay;
  if (daysToSubtract <= 0) {
    daysToSubtract += 7;
  }
  
  const newEndDate = subDays(today, daysToSubtract);
  return format(newEndDate, 'yyyy-MM-dd');
};


export function AccessControlProvider({ children }: { children: React.ReactNode }) {
  const [freezeRules, setFreezeRules] = React.useState<FreezeRule[]>([]);
  const { logAction } = useSystemLog();
  const { currentUser } = useAuth();

  const fetchRules = React.useCallback(async () => {
    const rawRules = await getFreezeRules();
    // Process rules to set dynamic end dates for recurring ones
    const processedRules = rawRules.map(rule => {
        if (rule.recurringDay !== undefined && rule.recurringDay !== null) {
            return { ...rule, endDate: getDynamicEndDate(rule) };
        }
        return rule;
    });
    setFreezeRules(processedRules);
  }, []);

  React.useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const addFreezeRule = async (newRuleData: Omit<FreezeRule, 'id'>) => {
    const teamName = newRuleData.teamId === 'all-teams' ? 'All Teams' : `team ${newRuleData.teamId}`; // Simplified for logging
    const newRule = await addFreezeRuleAction(newRuleData);
    if (newRule) {
        // Re-fetch all rules to correctly process the new one (especially if recurring)
        await fetchRules();
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
