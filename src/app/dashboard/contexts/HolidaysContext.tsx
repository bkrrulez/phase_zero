
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
import { useMembers } from './MembersContext';
import { useNotifications } from './NotificationsContext';
import { format } from 'date-fns';

interface HolidaysContextType {
  publicHolidays: PublicHoliday[];
  setPublicHolidays: (holidays: PublicHoliday[] | ((prev: PublicHoliday[]) => PublicHoliday[])) => void;
  customHolidays: CustomHoliday[];
  setCustomHolidays: (holidays: CustomHoliday[] | ((prev: CustomHoliday[]) => CustomHoliday[])) => void;
  annualLeaveAllowance: number;
  setAnnualLeaveAllowance: (allowance: number) => void;
  holidayRequests: HolidayRequest[];
  addHolidayRequest: (request: Omit<HolidayRequest, 'id' | 'userId' | 'status'>) => void;
  approveRequest: (requestId: string) => void;
  rejectRequest: (requestId: string) => void;
}

export const HolidaysContext = React.createContext<HolidaysContextType | undefined>(undefined);

export function HolidaysProvider({ children }: { children: React.ReactNode }) {
    const { logAction } = useSystemLog();
    const { teamMembers } = useMembers();
    const { addNotification } = useNotifications();
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

        const user = teamMembers.find(u => u.id === currentUser.id);
        const recipients = new Set<string>();
        if (user?.reportsTo) {
            recipients.add(user.reportsTo);
        }
        teamMembers.forEach(member => {
            if (member.role === 'Super Admin' && member.id !== currentUser.id) {
                recipients.add(member.id);
            }
        });

        if (recipients.size > 0) {
            addNotification({
                recipientIds: Array.from(recipients),
                title: 'New Holiday Request',
                body: `${currentUser.name} requested leave from ${format(new Date(request.startDate), 'PP')} to ${format(new Date(request.endDate), 'PP')}.`,
                referenceId: newRequest.id,
                type: 'holidayRequest'
            });
        }
    };
    
    const approveRequest = (requestId: string) => {
        const request = holidayRequests.find(r => r.id === requestId);
        if (!request) return;

        setHolidayRequests(prev => prev.map(req => req.id === requestId ? { ...req, status: 'Approved' } : req));
        const user = teamMembers.find(u => u.id === request.userId);
        logAction(`Holiday request for '${user?.name || 'Unknown'}' approved by '${currentUser.name}'.`);
    };
    
    const rejectRequest = (requestId: string) => {
        const request = holidayRequests.find(r => r.id === requestId);
        if (!request) return;

        setHolidayRequests(prev => prev.map(req => req.id === requestId ? { ...req, status: 'Rejected' } : req));
        const user = teamMembers.find(u => u.id === request.userId);
        logAction(`Holiday request for '${user?.name || 'Unknown'}' rejected by '${currentUser.name}'.`);
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
          approveRequest,
          rejectRequest,
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
