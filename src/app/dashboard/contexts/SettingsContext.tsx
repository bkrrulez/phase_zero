'use client';

import * as React from 'react';

interface SettingsContextType {
  isHolidaysNavVisible: boolean;
  setIsHolidaysNavVisible: (isVisible: boolean) => void;
}

const SettingsContext = React.createContext<SettingsContextType | undefined>(undefined);

// A simple hook to read from localStorage, meant to be used on the client.
function useLocalStorage(key: string, initialValue: boolean): [boolean, (value: boolean) => void] {
    const [storedValue, setStoredValue] = React.useState<boolean>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    const setValue = (value: boolean) => {
        try {
            setStoredValue(value);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(value));
            }
        } catch (error) {
            console.error(error);
        }
    };
    return [storedValue, setValue];
}


export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [isHolidaysNavVisible, setIsHolidaysNavVisible] = useLocalStorage('isHolidaysNavVisible', true);

  return (
    <SettingsContext.Provider value={{ isHolidaysNavVisible, setIsHolidaysNavVisible }}>
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
