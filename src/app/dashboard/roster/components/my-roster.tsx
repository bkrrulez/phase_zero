
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '../../contexts/AuthContext';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';
import { useHolidays } from '../../contexts/HolidaysContext';
import { useRoster, AbsenceType } from '../../contexts/RosterContext';
import { isSameMonth, getDay, getYear, min, max, isWithinInterval, addDays, isSameDay, format, DayPicker, DayProps } from 'date-fns';
import { MarkAbsenceDialog } from './mark-absence-dialog';
import type { Absence } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: new Date(0, i).toLocaleString('default', { month: 'long' }),
}));

const parseUTCDate = (dateString: string) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
};

export function MyRoster() {
    const { currentUser } = useAuth();
    const { timeEntries } = useTimeTracking();
    const { publicHolidays } = useHolidays();
    const { absences, addAbsence, updateAbsence } = useRoster();

    const [selectedDate, setSelectedDate] = React.useState(new Date());
    const [isAbsenceDialogOpen, setIsAbsenceDialogOpen] = React.useState(false);
    const [editingAbsence, setEditingAbsence] = React.useState<Absence | null>(null);

    const { availableYears, minContractDate, maxContractDate } = React.useMemo(() => {
        if (!currentUser || !currentUser.contracts || currentUser.contracts.length === 0) {
            const currentYear = new Date().getFullYear();
            return { availableYears: [currentYear], minContractDate: null, maxContractDate: null };
        }
        const startDates = currentUser.contracts.map(c => parseUTCDate(c.startDate));
        const endDates = currentUser.contracts.map(c => c.endDate ? parseUTCDate(c.endDate) : new Date());

        const minDate = min(startDates);
        const maxDate = max(endDates);
        
        const startYear = getYear(minDate);
        const endYear = getYear(maxDate);

        const years = [];
        for (let i = endYear; i >= startYear; i--) {
            years.push(i);
        }
        return { availableYears: years, minContractDate: minDate, maxContractDate: maxDate };
    }, [currentUser]);
    
    const calendarData = React.useMemo(() => {
        const workDays: Record<string, number> = {};
        timeEntries.forEach(entry => {
            if (entry.userId === currentUser.id && isSameMonth(parseUTCDate(entry.date), selectedDate)) {
                const dateKey = parseUTCDate(entry.date).toDateString();
                if (!workDays[dateKey]) {
                    workDays[dateKey] = 0;
                }
                workDays[dateKey] += entry.duration;
            }
        });

        const generalAbsenceDays = new Set<string>();
        const sickLeaveDays = new Set<string>();
        absences.forEach(absence => {
            if (absence.userId === currentUser.id) {
                const startDate = parseUTCDate(absence.startDate);
                const endDate = parseUTCDate(absence.endDate);
                 for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
                    if (isSameMonth(d, selectedDate)) {
                        if (absence.type === 'General Absence') {
                            generalAbsenceDays.add(d.toDateString());
                        } else {
                            sickLeaveDays.add(d.toDateString());
                        }
                    }
                }
            }
        });

        return { workDays, generalAbsenceDays, sickLeaveDays };
    }, [timeEntries, absences, selectedDate, currentUser.id]);

    const handleMonthChange = (month: string) => {
        setSelectedDate(new Date(selectedDate.getFullYear(), parseInt(month), 1));
    };

    const handleYearChange = (year: string) => {
        setSelectedDate(new Date(parseInt(year), selectedDate.getMonth(), 1));
    };

    const handleAbsenceSave = async (from: Date, to: Date, type: AbsenceType, userId: string, absenceIdToUpdate?: string) => {
        const workDaysInPeriod = new Set<string>();
        timeEntries.forEach(entry => {
            if(entry.userId === userId) {
                const entryDate = parseUTCDate(entry.date);
                if(isWithinInterval(entryDate, { start: from, end: to })) {
                    workDaysInPeriod.add(entryDate.toDateString());
                }
            }
        });

        if (workDaysInPeriod.size > 0 && absenceIdToUpdate === undefined) {
            toast({
                variant: 'destructive',
                title: 'Logged Work Conflict',
                description: 'Selected date range contains logged work and cannot be marked as an absence.'
            });
            return;
        }

        const existingAbsence = absences.find(a => {
            if (a.id === absenceIdToUpdate) return false;
            const start = parseUTCDate(a.startDate);
            const end = parseUTCDate(a.endDate);
            return a.userId === userId && 
                   (isWithinInterval(from, { start, end }) || isWithinInterval(to, { start, end }) || 
                    isWithinInterval(start, { start: from, end: to}) || isWithinInterval(end, { start: from, end: to}));
        });
        
        const idToUpdate = absenceIdToUpdate || existingAbsence?.id;
        
        if (idToUpdate) {
            await updateAbsence(idToUpdate, { userId, startDate: from.toISOString().split('T')[0], endDate: to.toISOString().split('T')[0], type });
        } else {
            await addAbsence({ userId, startDate: from.toISOString().split('T')[0], endDate: to.toISOString().split('T')[0], type });
        }
        setIsAbsenceDialogOpen(false);
        setEditingAbsence(null);
    };

    const handleDayDoubleClick = (date: Date) => {
        const userAbsences = absences.filter(a => a.userId === currentUser.id);
        const absenceOnDate = userAbsences.find(a => isWithinInterval(date, { start: parseUTCDate(a.startDate), end: parseUTCDate(a.endDate) }));

        if (absenceOnDate) {
            setEditingAbsence(absenceOnDate);
            setIsAbsenceDialogOpen(true);
        }
    };

    function Day(props: DayProps) {
        const dayString = props.date.toDateString();
        const dayOfWeek = getDay(props.date);
        
        const publicHoliday = publicHolidays.find(h => isSameDay(parseUTCDate(h.date), props.date));
        const hoursLogged = calendarData.workDays[dayString];
        
        let tooltipContent: React.ReactNode = null;
        
        if (hoursLogged > 0) {
            tooltipContent = `${hoursLogged.toFixed(2)}h Logged`;
        } else if (calendarData.sickLeaveDays.has(dayString)) {
            tooltipContent = 'Sick Leave';
        } else if (calendarData.generalAbsenceDays.has(dayString)) {
            tooltipContent = 'General Absence';
        } else if (publicHoliday) {
            tooltipContent = publicHoliday.name;
        } else if (dayOfWeek === 0) {
            tooltipContent = 'Sunday';
        } else if (dayOfWeek === 6) {
            tooltipContent = 'Saturday';
        }
        
        const content = <button type="button" className="w-full h-full p-0 m-0">{format(props.date, 'd')}</button>;

        if (tooltipContent) {
            return (
                <TooltipProvider delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger asChild>{content}</TooltipTrigger>
                        <TooltipContent><p>{tooltipContent}</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        }
        
        return content;
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Roster</CardTitle>
                <div className="flex gap-2 items-center">
                    <Button onClick={() => { setEditingAbsence(null); setIsAbsenceDialogOpen(true); }}>Update My Roster</Button>
                    <Select value={String(selectedDate.getMonth())} onValueChange={handleMonthChange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map(month => (
                                <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={String(selectedDate.getFullYear())} onValueChange={handleYearChange}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableYears.map(year => (
                                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <Calendar
                    month={selectedDate}
                    onMonthChange={setSelectedDate}
                    onDayDoubleClick={handleDayDoubleClick}
                    modifiers={{
                        weekend: (date) => getDay(date) === 0 || getDay(date) === 6,
                        publicHoliday: publicHolidays.map(h => parseUTCDate(h.date)),
                        workDay: Object.keys(calendarData.workDays).map(d => new Date(d)),
                        generalAbsence: Array.from(calendarData.generalAbsenceDays).map(d => new Date(d)),
                        sickLeave: Array.from(calendarData.sickLeaveDays).map(d => new Date(d)),
                    }}
                    modifiersClassNames={{
                        weekend: 'bg-orange-100 dark:bg-orange-900/50',
                        publicHoliday: 'bg-orange-100 dark:bg-orange-900/50',
                        workDay: 'bg-sky-200 dark:bg-sky-800',
                        generalAbsence: 'bg-yellow-200 dark:bg-yellow-800',
                        sickLeave: 'bg-red-300 dark:bg-red-800',
                        day_today: 'bg-muted text-muted-foreground',
                    }}
                    classNames={{
                      row: "flex w-full mt-0 border-t",
                      cell: "flex-1 text-center text-sm p-0 m-0 border-r last:border-r-0 relative",
                      head_row: "flex",
                      head_cell: "text-muted-foreground rounded-md w-full font-normal text-xs",
                      day: "h-20 w-full p-1",
                      months: "w-full",
                      month: "w-full space-y-0",
                      caption_label: "hidden"
                    }}
                    weekStartsOn={1}
                    fromDate={minContractDate || undefined}
                    toDate={maxContractDate || undefined}
                    components={{ Day }}
                />
            </CardContent>
            <MarkAbsenceDialog
                isOpen={isAbsenceDialogOpen}
                onOpenChange={setIsAbsenceDialogOpen}
                onSave={handleAbsenceSave}
                userId={currentUser.id}
                absence={editingAbsence}
            />
        </Card>
    );
}
