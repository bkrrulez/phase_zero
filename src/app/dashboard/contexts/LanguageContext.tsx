
'use client';

import * as React from 'react';
import en from '@/locales/en.json';
import de from '@/locales/de.json';

type Locale = 'en' | 'de';

const translations = { en, de };

interface LanguageContextType {
  language: Locale;
  setLanguage: (language: Locale) => void;
  t: (key: keyof typeof en, options?: Record<string, string | number>) => string;
}

const LanguageContext = React.createContext<LanguageContextType | undefined>(undefined);

function useLocalStorage(key: string, initialValue: Locale): [Locale, (value: Locale) => void] {
    const [storedValue, setStoredValue] = React.useState<Locale>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? (item as Locale) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    const setValue = (value: Locale) => {
        try {
            setStoredValue(value);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, value);
            }
        } catch (error) {
            console.error(error);
        }
    };
    return [storedValue, setValue];
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useLocalStorage('locale', 'en');

  const t = (key: keyof typeof en, options?: Record<string, string | number>): string => {
    let translation = translations[language][key] || translations['en'][key] || key;
    
    if (options) {
      Object.keys(options).forEach(optionKey => {
        const regex = new RegExp(`{{${optionKey}}}`, 'g');
        translation = translation.replace(regex, String(options[optionKey]));
      });
    }

    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = React.useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
