
'use client';
import * as React from 'react';
import { publicHolidays as initialPublicHolidays, customHolidays as initialCustomHolidays, type PublicHoliday, type CustomHoliday } from "@/lib/mock-data";
import useLocalStorage from '@/hooks/useLocalStorage';

interface HolidaysContextType {
  publicHolidays: PublicHoliday[];
  setPublicHolidays: (holidays: PublicHoliday[] | ((prev: PublicHoliday[]) => PublicHoliday[])) => void;
  customHolidays: CustomHoliday[];
  setCustomHolidays: (holidays: CustomHoliday[] | ((prev: CustomHoliday[]) => CustomHoliday[])) => void;
}

export const HolidaysContext = React.createContext<HolidaysContextType | undefined>(undefined);

export function HolidaysProvider({ children }: { children: React.ReactNode }) {
    const [publicHolidays, setPublicHolidays] = useLocalStorage<PublicHoliday[]>('publicHolidays', initialPublicHolidays);
    const [customHolidays, setCustomHolidays] = useLocalStorage<CustomHoliday[]>('customHolidays', initialCustomHolidays);

    return (
        <HolidaysContext.Provider value={{ publicHolidays, setPublicHolidays, customHolidays, setCustomHolidays }}>
            {children}
        </HolidaysContext.Provider>
    );
}

export const useHolidays = () => {
  const context = React.useContext(HolidaysContext);
  if (!context) {
    throw new Error("useHolidays must be used within a HolidaysProvider");
  }
  return context;
};
