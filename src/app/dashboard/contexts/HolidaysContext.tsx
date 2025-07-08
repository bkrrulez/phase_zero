
'use client';
import * as React from 'react';
import { type PublicHoliday, type CustomHoliday, type HolidayRequest } from "@/lib/types";
import { useSystemLog } from './SystemLogContext';
import { useMembers } from './MembersContext';
import { useNotifications } from './NotificationsContext';
import { format } from 'date-fns';
import { useAuth } from './AuthContext';
import { 
    getPublicHolidays,
    getCustomHolidays,
    getHolidayRequests,
    getAnnualLeaveAllowance,
    setAnnualLeaveAllowance as setAnnualLeaveAllowanceAction,
    addHolidayRequest as addHolidayRequestAction,
    updateHolidayRequestStatus,
    deleteHolidayRequest
} from '../actions';

interface HolidaysContextType {
  publicHolidays: PublicHoliday[];
  setPublicHolidays: React.Dispatch<React.SetStateAction<PublicHoliday[]>>;
  customHolidays: CustomHoliday[];
  setCustomHolidays: React.Dispatch<React.SetStateAction<CustomHoliday[]>>;
  annualLeaveAllowance: number;
  setAnnualLeaveAllowance: (allowance: number) => Promise<void>;
  holidayRequests: HolidayRequest[];
  addHolidayRequest: (request: Omit<HolidayRequest, 'id' | 'userId' | 'status'>) => Promise<void>;
  approveRequest: (requestId: string) => Promise<void>;
  rejectRequest: (requestId: string) => Promise<void>;
  withdrawRequest: (requestId: string) => Promise<void>;
  isLoading: boolean;
}

export const HolidaysContext = React.createContext<HolidaysContextType | undefined>(undefined);

export function HolidaysProvider({ children }: { children: React.ReactNode }) {
    const { logAction } = useSystemLog();
    const { teamMembers } = useMembers();
    const { currentUser } = useAuth();
    const { addNotification } = useNotifications();
    const [publicHolidays, setPublicHolidays] = React.useState<PublicHoliday[]>([]);
    const [customHolidays, setCustomHolidays] = React.useState<CustomHoliday[]>([]);
    const [annualLeaveAllowance, _setAnnualLeaveAllowance] = React.useState<number>(25);
    const [holidayRequests, setHolidayRequests] = React.useState<HolidayRequest[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    const fetchData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const [publicH, customH, requests, allowance] = await Promise.all([
                getPublicHolidays(),
                getCustomHolidays(),
                getHolidayRequests(),
                getAnnualLeaveAllowance()
            ]);
            setPublicHolidays(publicH);
            setCustomHolidays(customH);
            setHolidayRequests(requests);
            _setAnnualLeaveAllowance(allowance);
        } catch (error) {
            console.error("Failed to fetch holidays data", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const setAnnualLeaveAllowance = async (allowance: number) => {
      await setAnnualLeaveAllowanceAction(allowance);
      _setAnnualLeaveAllowance(allowance);
      await logAction(`User '${currentUser.name}' updated annual leave allowance to ${allowance} days.`);
    };

    const addHolidayRequest = async (request: Omit<HolidayRequest, 'id' | 'userId' | 'status'>) => {
        const newRequestData = {
            userId: currentUser.id,
            status: 'Pending' as const,
            ...request,
        };
        const newRequest = await addHolidayRequestAction(newRequestData);
        
        if (newRequest) {
            setHolidayRequests(prev => [...prev, newRequest]);
            await logAction(`User '${currentUser.name}' submitted a holiday request from ${request.startDate} to ${request.endDate}.`);

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
                await addNotification({
                    recipientIds: Array.from(recipients),
                    title: 'New Holiday Request',
                    body: `${currentUser.name} requested leave from ${format(new Date(request.startDate), 'PP')} to ${format(new Date(request.endDate), 'PP')}.`,
                    referenceId: newRequest.id,
                    type: 'holidayRequest'
                });
            }
        }
    };
    
    const approveRequest = async (requestId: string) => {
        const request = holidayRequests.find(r => r.id === requestId);
        if (!request || request.status !== 'Pending') return;
    
        const updatedRequest = await updateHolidayRequestStatus(requestId, 'Approved', currentUser.id);
        if (updatedRequest) {
            setHolidayRequests(prev => prev.map(req => req.id === requestId ? updatedRequest : req));
            const user = teamMembers.find(u => u.id === request.userId);
            await logAction(`Holiday request for '${user?.name || 'Unknown'}' approved by '${currentUser.name}'.`);
        }
    };
    
    const rejectRequest = async (requestId: string) => {
        const request = holidayRequests.find(r => r.id === requestId);
        if (!request || request.status !== 'Pending') return;

        const updatedRequest = await updateHolidayRequestStatus(requestId, 'Rejected', currentUser.id);
        if (updatedRequest) {
            setHolidayRequests(prev => prev.map(req => req.id === requestId ? updatedRequest : req));
            const user = teamMembers.find(u => u.id === request.userId);
            await logAction(`Holiday request for '${user?.name || 'Unknown'}' rejected by '${currentUser.name}'.`);
        }
    };

    const withdrawRequest = async (requestId: string) => {
        const request = holidayRequests.find(r => r.id === requestId);
        if (request?.userId !== currentUser.id) return;
        
        await deleteHolidayRequest(requestId);
        setHolidayRequests(prev => prev.filter(req => req.id !== requestId));
        await logAction(`User '${currentUser.name}' withdrew a holiday request.`);
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
          withdrawRequest,
          isLoading
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
