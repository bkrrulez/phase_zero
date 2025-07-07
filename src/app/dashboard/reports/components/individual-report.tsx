
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { teamMembers, timeEntries, holidayRequests, currentUser, type User, publicHolidays, customHolidays } from '@/lib/mock-data';
import { addDays, getDay, isSameMonth, startOfMonth } from 'date-fns';
import type { DayContentProps } from 'react-day-picker';
import React from 'react';

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: new Date(0, i).toLocaleString('default', { month: 'long' }),
}));

interface ReportCalendarContextValue {
  selectedDate: Date;
  monthlyData: { dailyTotals: Record<string, number> };
}

const ReportCalendarContext = React.createContext<ReportCalendarContextValue | null>(null);

const DayContent: React.FC<DayContentProps> = (props) => {
  const context = React.useContext(ReportCalendarContext);

  if (!context) {
    return <div className="p-1">{props.date.getDate()}</div>;
  }

  const { selectedDate, monthlyData } = context;
  const { date } = props;
  const dayOfMonth = date.getDate();

  if (!isSameMonth(date, selectedDate)) {
    return <div className="p-1">{dayOfMonth}</div>;
  }

  const hours = monthlyData.dailyTotals[dayOfMonth];
  
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-1">
        <div>{dayOfMonth}</div>
        {hours !== undefined && hours > 0 && (
            <span className="text-xs font-bold text-primary">{hours.toFixed(1)}h</span>
        )}
    </div>
  );
};


export function IndividualReport() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const viewableUsers = useMemo(() => {
        if (currentUser.role === 'Super Admin') return teamMembers;
        if (currentUser.role === 'Team Lead') {
            const team = teamMembers.filter(m => m.role === 'Employee' && m.reportsTo === currentUser.id);
            return [currentUser, ...team];
        }
        return [currentUser];
    }, []);

    const targetUserId = searchParams.get('userId') || currentUser.id;
    
    const [selectedUser, setSelectedUser] = useState<User | undefined>(() => viewableUsers.find(u => u.id === targetUserId));
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        const userFromParams = viewableUsers.find(u => u.id === targetUserId);
        const userToSelect = userFromParams || (viewableUsers.includes(currentUser) ? currentUser : viewableUsers[0]);
        setSelectedUser(userToSelect);
    }, [targetUserId, viewableUsers]);

    useEffect(() => {
        if (selectedUser) {
            const now = new Date();
            const year = selectedDate.getFullYear() || now.getFullYear();
            const month = selectedDate.getMonth() || now.getMonth();
            let date = startOfMonth(new Date(year, month, 1));
            
            const contractStart = startOfMonth(new Date(selectedUser.contract.startDate));
            const contractEnd = selectedUser.contract.endDate ? startOfMonth(new Date(selectedUser.contract.endDate)) : startOfMonth(now);

            if (date < contractStart) date = contractStart;
            if (date > contractEnd) date = contractEnd;
            
            setSelectedDate(date);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedUser]);

  const availableYears = useMemo(() => {
    if (!selectedUser) return [];
    const startYear = new Date(selectedUser.contract.startDate).getFullYear();
    const endYear = selectedUser.contract.endDate ? new Date(selectedUser.contract.endDate).getFullYear() : new Date().getFullYear();
    
    const yearsList = [];
    for (let i = endYear; i >= startYear; i--) {
        yearsList.push(i);
    }
    return yearsList;
  }, [selectedUser]);

  const availableMonths = useMemo(() => {
      if (!selectedUser) return months;

      const contractStart = new Date(selectedUser.contract.startDate);
      const contractEnd = selectedUser.contract.endDate ? new Date(selectedUser.contract.endDate) : null;
      const year = selectedDate.getFullYear();

      let startMonth = 0;
      if (year === contractStart.getFullYear()) {
          startMonth = contractStart.getMonth();
      }
      
      let endMonth = 11;
      if (contractEnd && year === contractEnd.getFullYear()) {
          endMonth = contractEnd.getMonth();
      }

      return months.filter(m => m.value >= startMonth && m.value <= endMonth);
  }, [selectedUser, selectedDate]);

  const monthlyData = useMemo(() => {
    if (!selectedUser) return { dailyTotals: {}, personalLeaveDays: [], publicHolidayDays: [], customHolidayDays: [] };

    const dailyTotals: Record<string, number> = {};
    const dailyContractHours = selectedUser.contract.weeklyHours / 5;

    // 1. Calculate manually logged hours
    const userTimeEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entry.userId === selectedUser.id &&
               isSameMonth(entryDate, selectedDate);
    });

    userTimeEntries.forEach(entry => {
        const day = new Date(entry.date).getDate();
        if (!dailyTotals[day]) dailyTotals[day] = 0;
        dailyTotals[day] += entry.duration;
    });

    // 2. Calculate and add public holiday hours
    const publicHolidaysInMonth = publicHolidays.filter(h => {
        const hDate = new Date(h.date);
        return isSameMonth(hDate, selectedDate) && getDay(hDate) !== 0 && getDay(hDate) !== 6;
    });

    publicHolidaysInMonth.forEach(holiday => {
        const day = new Date(holiday.date).getDate();
        const holidayCredit = holiday.type === 'Full Day' ? dailyContractHours : dailyContractHours / 2;
        if (!dailyTotals[day]) dailyTotals[day] = 0;
        dailyTotals[day] += holidayCredit;
    });
    
    // 3. Calculate and add custom holiday hours
    const customHolidaysInMonth = customHolidays.filter(h => {
        const hDate = new Date(h.date);
        const applies = (h.appliesTo === 'all-members') ||
                        (h.appliesTo === 'all-teams' && !!selectedUser.teamId) ||
                        (h.appliesTo === selectedUser.teamId);
        return isSameMonth(hDate, selectedDate) && getDay(hDate) !== 0 && getDay(hDate) !== 6 && applies;
    });

    customHolidaysInMonth.forEach(holiday => {
        const day = new Date(holiday.date).getDate();
        const holidayCredit = holiday.type === 'Full Day' ? dailyContractHours : dailyContractHours / 2;
        if (!dailyTotals[day]) dailyTotals[day] = 0;
        dailyTotals[day] += holidayCredit;
    });

    // 4. Get personal leave days for modifier
    const personalLeaveDays = holidayRequests.filter(req => 
        req.userId === selectedUser.id && req.status === 'Approved'
    ).flatMap(req => {
        const start = new Date(req.startDate);
        const end = new Date(req.endDate);
        const dates: Date[] = [];
        for (let dt = start; dt <= end; dt = addDays(dt, 1)) {
            if (isSameMonth(dt, selectedDate)) {
                dates.push(new Date(dt));
            }
        }
        return dates;
    });
    
    const publicHolidayDays = publicHolidaysInMonth.map(h => new Date(h.date));
    const customHolidayDays = customHolidaysInMonth.map(h => new Date(h.date));

    return { dailyTotals, personalLeaveDays, publicHolidayDays, customHolidayDays };
  }, [selectedUser, selectedDate]);
    
    const handleUserChange = (userId: string) => {
        const currentTab = searchParams.get('tab') || 'individual-report';
        router.push(`/dashboard/reports?tab=${currentTab}&userId=${userId}`);
    };
    
    const handleMonthChange = (month: string) => {
        setSelectedDate(new Date(selectedDate.getFullYear(), parseInt(month), 1));
    }
    
    const handleYearChange = (year: string) => {
        if (!selectedUser) return;
        const newYear = parseInt(year);
        let newMonth = selectedDate.getMonth();
        
        const contractStart = new Date(selectedUser.contract.startDate);
        if (newYear === contractStart.getFullYear() && newMonth < contractStart.getMonth()) {
            newMonth = contractStart.getMonth();
        }

        const contractEnd = selectedUser.contract.endDate ? new Date(selectedUser.contract.endDate) : null;
        if (contractEnd && newYear === contractEnd.getFullYear() && newMonth > contractEnd.getMonth()) {
            newMonth = contractEnd.getMonth();
        }

        setSelectedDate(new Date(newYear, newMonth, 1));
    }
    
    const calendarContextValue = useMemo<ReportCalendarContextValue>(() => ({
        selectedDate,
        monthlyData,
    }), [selectedDate, monthlyData]);

  if (!selectedUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No User Selected</CardTitle>
          <CardDescription>
            {viewableUsers.length > 1 ? 'Please select a user to view their calendar.' : 'No user data available.'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12">
                <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} data-ai-hint="person avatar"/>
                <AvatarFallback>{selectedUser.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold font-headline">{selectedUser.name}'s Calendar</h2>
                  <p className="text-muted-foreground">Monthly overview of logged hours and holidays.</p>
                </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <Select onValueChange={handleUserChange} value={selectedUser.id} disabled={viewableUsers.length <= 1}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Select User" />
                    </SelectTrigger>
                    <SelectContent>
                        {viewableUsers.map(user => (
                            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex justify-end gap-2">
                <Select
                    value={String(selectedDate.getMonth())}
                    onValueChange={handleMonthChange}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableMonths.map(month => (
                            <SelectItem key={month.value} value={String(month.value)}>
                                {month.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select
                    value={String(selectedDate.getFullYear())}
                    onValueChange={handleYearChange}
                >
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableYears.map(year => (
                            <SelectItem key={year} value={String(year)}>
                                {year}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <ReportCalendarContext.Provider value={calendarContextValue}>
              <Calendar
                  month={selectedDate}
                  onMonthChange={setSelectedDate}
                  weekStartsOn={1}
                  fromDate={new Date(selectedUser.contract.startDate)}
                  toDate={selectedUser.contract.endDate ? new Date(selectedUser.contract.endDate) : new Date()}
                  modifiers={{ 
                      saturday: (date) => getDay(date) === 6,
                      sunday: (date) => getDay(date) === 0,
                      holiday: monthlyData.publicHolidayDays,
                      customHoliday: monthlyData.customHolidayDays,
                      personalLeave: monthlyData.personalLeaveDays,
                      logged: Object.keys(monthlyData.dailyTotals).filter(d => monthlyData.dailyTotals[parseInt(d)] > 0).map(day => {
                          return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), parseInt(day))
                      })
                  }}
                  modifiersClassNames={{
                  saturday: 'text-muted-foreground/50',
                  sunday: 'text-muted-foreground/50',
                  holiday: 'bg-green-200 dark:bg-green-800 rounded-md',
                  customHoliday: 'bg-orange-200 dark:bg-orange-800 rounded-md',
                  personalLeave: 'opacity-60 bg-blue-200 dark:bg-blue-800 rounded-md',
                  logged: 'border border-primary rounded-md'
                  }}
                  components={{
                  DayContent,
                  }}
                  className="p-0"
                  classNames={{
                      row: "flex w-full mt-2",
                      cell: "flex-1 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      head_row: "flex",
                      head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
                      day: "h-20 w-full text-base p-1",
                      months: "w-full",
                      month: "w-full space-y-4",
                      caption_label: "text-lg font-bold"
                  }}
              />
            </ReportCalendarContext.Provider>
        </CardContent>
      </Card>
    </div>
  );
}
