
'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { freezeRules as initialFreezeRules, type FreezeRule } from "@/lib/mock-data";

interface AccessControlContextType {
  freezeRules: FreezeRule[];
  addFreezeRule: (newRule: FreezeRule) => void;
  removeFreezeRule: (ruleId: string) => void;
}

const AccessControlContext = createContext<AccessControlContextType | undefined>(undefined);

export function AccessControlProvider({ children }: { children: ReactNode }) {
  const [freezeRules, setFreezeRules] = useState<FreezeRule[]>(initialFreezeRules);

  const addFreezeRule = (newRule: FreezeRule) => {
    setFreezeRules(prev => [...prev, newRule]);
  };

  const removeFreezeRule = (ruleId: string) => {
    setFreezeRules(prev => prev.filter(r => r.id !== ruleId));
  };

  return (
    <AccessControlContext.Provider value={{ freezeRules, addFreezeRule, removeFreezeRule }}>
      {children}
    </AccessControlContext.Provider>
  );
}

export const useAccessControl = () => {
  const context = useContext(AccessControlContext);
  if (!context) {
    throw new Error("useAccessControl must be used within an AccessControlProvider");
  }
  return context;
};
