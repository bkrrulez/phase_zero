
'use client';

import * as React from 'react';
import { getSystemSetting, setSystemSetting } from '../actions';
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
      const visibleStr = await getSystemSetting('isHolidaysNavVisible');
      // Default to true if the setting doesn't exist or is not 'false'
      _setIsHolidaysNavVisible(visibleStr !== 'false');
      setIsLoading(false);
    }
    fetchVisibility();
  }, []);

  const setIsHolidaysNavVisible = async (isVisible: boolean) => {
    _setIsHolidaysNavVisible(isVisible);
    await setSystemSetting('isHolidaysNavVisible', String(isVisible));
    if (currentUser) {
        await logAction(`User '${currentUser.name}' set 'Display Holidays' navigation to ${isVisible}.`);
    }
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

    