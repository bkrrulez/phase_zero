
'use client';
import * as React from 'react';
import { 
  publicHolidays as initialPublicHolidays, 
  customHolidays as initialCustomHolidays,
  holidayRequests as initialHolidayRequests,
  type PublicHoliday, 
  type CustomHoliday,
  type HolidayRequest
} from "@/lib/mock-data";
import useLocalStorage from '@/hooks/useLocalStorage';
import { useSystemLog } from './SystemLogContext';
import { currentUser } from '@/lib/mock-data';

interface HolidaysContextType {
  publicHolidays: PublicHoliday[];
  setPublicHolidays: (holidays: PublicHoliday[] | ((prev: PublicHoliday[]) => PublicHoliday[])) => void;
  customHolidays: CustomHoliday[];
  setCustomHolidays: (holidays: CustomHoliday[] | ((prev: CustomHoliday[]) => CustomHoliday[])) => void;
  annualLeaveAllowance: number;
  setAnnualLeaveAllowance: (allowance: number) => void;
  holidayRequests: HolidayRequest[];
  addHolidayRequest: (request: Omit<HolidayRequest, 'id' | 'userId' | 'status'>) => void;
}

export const HolidaysContext = React.createContext<HolidaysContextType | undefined>(undefined);

export function HolidaysProvider({ children }: { children: React.ReactNode }) {
    const { logAction } = useSystemLog();
    const [publicHolidays, setPublicHolidays] = useLocalStorage<PublicHoliday[]>('publicHolidays', initialPublicHolidays);
    const [customHolidays, setCustomHolidays] = useLocalStorage<CustomHoliday[]>('customHolidays', initialCustomHolidays);
    const [annualLeaveAllowance, _setAnnualLeaveAllowance] = useLocalStorage<number>('annualLeaveAllowance', 25);
    const [holidayRequests, setHolidayRequests] = useLocalStorage<HolidayRequest[]>('holidayRequests', initialHolidayRequests);

    const setAnnualLeaveAllowance = (allowance: number) => {
      _setAnnualLeaveAllowance(allowance);
      logAction(`User '${currentUser.name}' updated annual leave allowance to ${allowance} days.`);
    };

    const addHolidayRequest = (request: Omit<HolidayRequest, 'id' | 'userId' | 'status'>) => {
        const newRequest: HolidayRequest = {
            id: `hr-${Date.now()}`,
            userId: currentUser.id,
            status: 'Pending',
            ...request,
        };
        setHolidayRequests(prev => [...prev, newRequest]);
        logAction(`User '${currentUser.name}' submitted a holiday request from ${request.startDate} to ${request.endDate}.`);
    };

    return (
        <HolidaysContext.Provider value={{ 
          publicHolidays, 
          setPublicHolidays, 
          customHolidays, 
          setCustomHolidays,
          annualLeaveAllowance,
          setAnnualLeaveAllowance,
          holidayRequests,
          addHolidayRequest,
        }}>
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
