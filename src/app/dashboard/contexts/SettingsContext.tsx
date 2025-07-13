
'use client';

import * as React from 'react';
import { getIsHolidaysNavVisible, setIsHolidaysNavVisible as setGlobalVisibility } from '../actions';
import { useAuth } from './AuthContext';
import { useSystemLog } from './SystemLogContext';

interface SettingsContextType {
  isHolidaysNavVisible: boolean;
  setIsHolidaysNavVisible: (isVisible: boolean) => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = React.createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const { logAction } = useSystemLog();
  const [isHolidaysNavVisible, _setIsHolidaysNavVisible] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    const fetchVisibility = async () => {
      setIsLoading(true);
      const visible = await getIsHolidaysNavVisible();
      _setIsHolidaysNavVisible(visible);
      setIsLoading(false);
    }
    fetchVisibility();
  }, []);

  const setIsHolidaysNavVisible = async (isVisible: boolean) => {
    _setIsHolidaysNavVisible(isVisible);
    await setGlobalVisibility(isVisible);
    await logAction(`User '${currentUser.name}' set 'Display Holidays' navigation to ${isVisible}.`);
  };

  return (
    <SettingsContext.Provider value={{ isHolidaysNavVisible, setIsHolidaysNavVisible, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const context = React.useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
