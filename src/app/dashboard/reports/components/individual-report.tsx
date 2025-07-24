
'use client';

import * as React from 'react';
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
import type { User, TimeEntry } from '@/lib/types';
import { addDays, getDay, isSameMonth, startOfMonth, isWithinInterval, getYear, parseISO, isSameDay, min as minDate, max as maxDate, getMonth, endOfYear, startOfYear, endOfMonth } from 'date-fns';
import type { DayContentProps } from 'react-day-picker';
import { DayDetailsDialog } from './day-details-dialog';
import { useMembers } from '../../contexts/MembersContext';
import { useHolidays } from '../../contexts/HolidaysContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';
import { LogTimeDialog, type LogTimeFormValues } from '../../components/log-time-dialog';
import { DeleteTimeEntryDialog } from './delete-time-entry-dialog';
import { useLanguage } from '../../contexts/LanguageContext';

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: new Date(0, i).toLocaleString('default', { month: 'long' }),
}));

interface ReportCalendarContextValue {
  selectedDate: Date;
  monthlyData: { 
    dailyTotals: Record<string, number>;
    dailyEntries: Record<string, TimeEntry[]>;
    dailyExpected: Record<string, number>;
    dailyHolidayNames: Record<string, string>;
    personalLeaveDays: Date[];
    publicHolidayDays: Date[];
    customHolidayDays: Date[];
  };
  onDayClick: (date: Date) => void;
  t: (key: any, options?: any) => string;
}

const ReportCalendarContext = React.createContext<ReportCalendarContextValue | null>(null);

const DayContent: React.FC<DayContentProps> = (props) => {
  const context = React.useContext(ReportCalendarContext);

  if (!context) {
    return <div className="p-1">{props.date.getDate()}</div>;
  }

  const { selectedDate, monthlyData, onDayClick, t } = context;
  const { date } = props;
  const dayOfMonth = date.getDate();

  if (!isSameMonth(date, selectedDate)) {
    return <div className="p-1">{dayOfMonth}</div>;
  }

  const hours = monthlyData.dailyTotals[dayOfMonth];
  const expectedHours = monthlyData.dailyExpected[dayOfMonth];
  const holidayName = monthlyData.dailyHolidayNames[dayOfMonth];
  const hasManualEntries = (monthlyData.dailyEntries[dayOfMonth] || []).length > 0;
  
  const isWeekend = getDay(date) === 0 || getDay(date) === 6;
  const isLeaveDay = monthlyData.personalLeaveDays.some(d => d.toDateString() === date.toDateString());

  const wrapperProps = {
    className: "relative w-full h-full flex flex-col items-center justify-between text-center p-1",
    ...(hasManualEntries && {
        onClick: () => onDayClick(date),
        role: 'button' as const,
        className: "relative w-full h-full flex flex-col items-center justify-between text-center p-1 cursor-pointer hover:bg-accent/50 rounded-md"
    })
  };

  return (
    <div {...wrapperProps}>
        <div className="self-start">{dayOfMonth}</div>
        {hours !== undefined && hours > 0 ? (
            <span className="text-xs font-bold text-primary">{hours.toFixed(1)}h</span>
        ) : <span className="h-[15px]" />}
        {!isWeekend && !isLeaveDay ? (
            holidayName ? (
                <span className="text-[10px] font-semibold text-green-600 truncate px-1">
                    {holidayName}
                </span>
            ) : expectedHours > 0 ? (
                <span className="text-[10px] font-semibold text-orange-400">
                    {t('expectedHoursShort', { hours: expectedHours.toFixed(1) })}
                </span>
            ) : <span className="h-[15px]" />
        ) : <span className="h-[15px]" />}
    </div>
  );
};


export function IndividualReport() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();
    const { teamMembers } = useMembers();
    const { currentUser } = useAuth();
    const { publicHolidays, customHolidays, holidayRequests, annualLeaveAllowance } = useHolidays();
    const { timeEntries, updateTimeEntry, deleteTimeEntry } = useTimeTracking();

    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false);
    const [selectedDayEntries, setSelectedDayEntries] = React.useState<TimeEntry[]>([]);
    const [selectedDayForDialog, setSelectedDayForDialog] = React.useState<Date>(new Date());
    const [editingEntry, setEditingEntry] = React.useState<TimeEntry | null>(null);
    const [deletingEntry, setDeletingEntry] = React.useState<TimeEntry | null>(null);

    const viewableUsers = React.useMemo(() => {
        let members: User[];
        if (currentUser.role === 'Super Admin') {
            members = teamMembers;
        } else if (currentUser.role === 'Team Lead') {
            const team = teamMembers.filter(m => m.reportsTo === currentUser.id);
            members = [currentUser, ...team];
        } else {
            members = [currentUser];
        }
        return Array.from(new Map(members.map(item => [item.id, item])).values());
    }, [teamMembers, currentUser]);

    const targetUserId = searchParams.get('userId') || currentUser.id;
    
    const [selectedUser, setSelectedUser] = React.useState<User | undefined>(() => viewableUsers.find(u => u.id === targetUserId));
    const [selectedDate, setSelectedDate] = React.useState(new Date());

    React.useEffect(() => {
        const userFromParams = viewableUsers.find(u => u.id === targetUserId);
        const userToSelect = userFromParams || (viewableUsers.includes(currentUser) ? currentUser : viewableUsers[0]);
        setSelectedUser(userToSelect);
    }, [targetUserId, viewableUsers, currentUser]);

    React.useEffect(() => {
        if (selectedUser) {
          const now = new Date();
          const year = selectedDate.getFullYear();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();

          let defaultDate = new Date(year, selectedDate.getMonth(), 1);

          // If the user's calendar for the current year is being viewed, default to the current month.
          if (year === currentYear) {
            defaultDate = new Date(year, currentMonth, 1);
          }
          
          setSelectedDate(defaultDate);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedUser]);

    const { availableYears, availableMonths, minContractDate, maxContractDate } = React.useMemo(() => {
        if (!selectedUser || !selectedUser.contracts || selectedUser.contracts.length === 0) {
            return { availableYears: [], availableMonths: [], minContractDate: null, maxContractDate: null };
        }
    
        const startDates = selectedUser.contracts.map(c => parseISO(c.startDate));
        const endDates = selectedUser.contracts.map(c => c.endDate ? parseISO(c.endDate) : new Date());
    
        const minDateVal = minDate(startDates);
        const maxDateVal = maxDate(endDates);
        
        const startYear = getYear(minDateVal);
        const endYear = getYear(maxDateVal);
        
        const yearsList = [];
        for (let i = endYear; i >= startYear; i--) {
            yearsList.push(i);
        }
    
        const year = selectedDate.getFullYear();
    
        let startMonth = 0;
        if (year === startYear) {
            startMonth = getMonth(minDateVal);
        }
        
        let endMonth = 11;
        if (year === endYear) {
            endMonth = getMonth(maxDateVal);
        }
    
        const monthsList = months.filter(m => m.value >= startMonth && m.value <= endMonth);
    
        return { availableYears: yearsList, availableMonths: monthsList, minContractDate: minDateVal, maxContractDate: maxDateVal };
    }, [selectedUser, selectedDate]);


  const monthlyData = React.useMemo(() => {
    if (!selectedUser) return { dailyTotals: {}, personalLeaveDays: [], publicHolidayDays: [], customHolidayDays: [], dailyEntries: {}, dailyExpected: {}, dailyHolidayNames: {} };

    const dailyTotals: Record<string, number> = {};
    const dailyEntries: Record<string, TimeEntry[]> = {};
    const dailyExpected: Record<string, number> = {};
    const dailyHolidayNames: Record<string, string> = {};

    const selectedYear = selectedDate.getFullYear();
    const yearStart = startOfYear(selectedDate);
    const yearEnd = endOfYear(selectedDate);
    const publicHolidaysInYear = publicHolidays.filter(h => getYear(parseISO(h.date)) === selectedYear);

    const standardWorkDaysInYear = 261;
    const dailyLeaveCredit = annualLeaveAllowance / standardWorkDaysInYear;
    
    const userHolidaysInYear = publicHolidaysInYear
        .concat(customHolidays.filter(h => {
            if (getYear(parseISO(h.date)) !== selectedYear) return false;
            const applies = (h.appliesTo === 'all-members') || (h.appliesTo === 'all-teams' && !!selectedUser.teamId) || (h.appliesTo === selectedUser.teamId);
            return applies;
        }));
    
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);

    for (let d = new Date(monthStart); d <= monthEnd; d = addDays(d, 1)) {
        const dayOfMonth = d.getDate();
        const dayOfWeek = getDay(d);

        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const isHoliday = userHolidaysInYear.some(h => isSameDay(parseISO(h.date), d));
        if (isHoliday) {
            const holiday = userHolidaysInYear.find(h => isSameDay(parseISO(h.date), d));
            if (holiday) dailyHolidayNames[dayOfMonth] = holiday.name;
            continue;
        }

        const isLeaveDay = holidayRequests.some(req => req.userId === selectedUser.id && req.status === 'Approved' && isWithinInterval(d, { start: parseISO(req.startDate), end: parseISO(req.endDate) }));
        if (isLeaveDay) continue;

        const activeContractsOnDay = selectedUser.contracts.filter(c => {
            const contractStart = parseISO(c.startDate);
            const contractEnd = c.endDate ? parseISO(c.endDate) : yearEnd;
            return isWithinInterval(d, { start: contractStart, end: contractEnd });
        });
        
        if (activeContractsOnDay.length > 0) {
            const dailyContractHours = activeContractsOnDay.reduce((sum, c) => sum + c.weeklyHours, 0) / 5;
            const leaveHoursForDay = dailyLeaveCredit * dailyContractHours;
            dailyExpected[dayOfMonth] = dailyContractHours - leaveHoursForDay;
        }
    }

    const userTimeEntries = timeEntries.filter(entry => {
        const entryDate = parseISO(entry.date);
        return entry.userId === selectedUser.id &&
               isSameMonth(entryDate, selectedDate);
    });

    userTimeEntries.forEach(entry => {
        const day = parseISO(entry.date).getDate();
        if (!dailyTotals[day]) dailyTotals[day] = 0;
        if (!dailyEntries[day]) dailyEntries[day] = [];
        dailyTotals[day] += entry.duration;
        dailyEntries[day].push(entry);
    });
    
    const personalLeaveDays = holidayRequests.filter(req => 
        req.userId === selectedUser.id && req.status === 'Approved'
    ).flatMap(req => {
        const start = parseISO(req.startDate);
        const end = parseISO(req.endDate);
        const dates: Date[] = [];
        for (let dt = start; dt <= end; dt = addDays(dt, 1)) {
            if (isSameMonth(dt, selectedDate)) {
                dates.push(new Date(dt));
            }
        }
        return dates;
    });
    
    const publicHolidayDays = publicHolidaysInYear.map(h => parseISO(h.date));
    const customHolidayDays = userHolidaysInYear.filter(h => !publicHolidaysInYear.includes(h)).map(h => parseISO(h.date));

    return { dailyTotals, personalLeaveDays, publicHolidayDays, customHolidayDays, dailyEntries, dailyExpected, dailyHolidayNames };
  }, [selectedUser, selectedDate, publicHolidays, customHolidays, holidayRequests, timeEntries, annualLeaveAllowance]);
    
    const canEditEntries = React.useMemo(() => {
        if (!selectedUser) return false;
        if (currentUser.role === 'Super Admin') return true;
        if (currentUser.id === selectedUser.id) return true;
        if (currentUser.role === 'Team Lead' && selectedUser.reportsTo === currentUser.id) return true;
        return false;
    }, [currentUser, selectedUser]);
    
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
        
        if (minContractDate && newYear === getYear(minContractDate) && newMonth < getMonth(minContractDate)) {
            newMonth = getMonth(minContractDate);
        }

        if (maxContractDate && newYear === getYear(maxContractDate) && newMonth > getMonth(maxContractDate)) {
            newMonth = getMonth(maxContractDate);
        }

        setSelectedDate(new Date(newYear, newMonth, 1));
    }
    
    const handleDayClick = React.useCallback((date: Date) => {
        const day = date.getDate();
        const entries = monthlyData.dailyEntries[day] || [];
        
        if (entries.length > 0) {
            setSelectedDayEntries(entries);
            setSelectedDayForDialog(date);
            setIsDetailsDialogOpen(true);
        }
    }, [monthlyData.dailyEntries]);

    const handleSaveEntry = async (data: LogTimeFormValues, entryId?: string) => {
        if (!entryId || !selectedUser) return { success: false };
        return updateTimeEntry(entryId, data, selectedUser.id, teamMembers);
    };

    const handleDeleteConfirm = async () => {
        if (!deletingEntry) return;
        await deleteTimeEntry(deletingEntry.id);
        setDeletingEntry(null);
        setIsDetailsDialogOpen(false); // Close details dialog after deletion
    };


    const calendarContextValue = React.useMemo<ReportCalendarContextValue>(() => ({
        selectedDate,
        monthlyData,
        onDayClick: handleDayClick,
        t,
    }), [selectedDate, monthlyData, handleDayClick, t]);

  if (!selectedUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('noUserSelectedTitle')}</CardTitle>
          <CardDescription>
            {viewableUsers.length > 1 ? t('noUserSelectedDescMulti') : t('noUserSelectedDescSingle')}
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
                  <h2 className="text-xl font-bold font-headline">{t('userCalendar', {name: selectedUser.name})}</h2>
                  <p className="text-muted-foreground">{t('userCalendarDesc')}</p>
                </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <Select onValueChange={handleUserChange} value={selectedUser.id} disabled={viewableUsers.length <= 1}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder={t('selectUserPlaceholder')} />
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
                        <SelectValue placeholder={t('selectMonthPlaceholder')} />
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
                        <SelectValue placeholder={t('selectYearPlaceholder')} />
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
                  fromDate={minContractDate || undefined}
                  toDate={maxContractDate || undefined}
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
                  personalLeave: 'bg-yellow-200 dark:bg-yellow-800 rounded-md',
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
                      day: "h-20 w-full text-base p-0",
                      months: "w-full",
                      month: "w-full space-y-4",
                      caption_label: "text-lg font-bold"
                  }}
              />
            </ReportCalendarContext.Provider>
        </CardContent>
      </Card>
      <DayDetailsDialog 
        isOpen={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        date={selectedDayForDialog}
        entries={selectedDayEntries}
        canEdit={canEditEntries}
        onEdit={(entry) => {
            setIsDetailsDialogOpen(false);
            setEditingEntry(entry);
        }}
        onDelete={(entry) => setDeletingEntry(entry)}
      />
      {editingEntry && (
        <LogTimeDialog
          isOpen={!!editingEntry}
          onOpenChange={() => setEditingEntry(null)}
          onSave={(data, entryId) => handleSaveEntry(data as Omit<LogTimeFormValues, 'userId'>, entryId)}
          entryToEdit={editingEntry}
          userId={selectedUser.id}
        />
      )}
      {deletingEntry && (
        <DeleteTimeEntryDialog
            isOpen={!!deletingEntry}
            onOpenChange={() => setDeletingEntry(null)}
            onConfirm={handleDeleteConfirm}
            entry={deletingEntry}
        />
      )}
    </div>
  );
}
