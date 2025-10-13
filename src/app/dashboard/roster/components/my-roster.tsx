
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
import { isSameMonth, getDay, isSameDay, getMonth, getYear, min, max, isWithinInterval, parseISO, addDays } from 'date-fns';
import { MarkAbsenceDialog } from './mark-absence-dialog';
import type { Absence } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: new Date(0, i).toLocaleString('default', { month: 'long' }),
}));

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
        const startDates = currentUser.contracts.map(c => new Date(c.startDate));
        const endDates = currentUser.contracts.map(c => c.endDate ? new Date(c.endDate) : new Date());

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
        const workDays = new Set<string>();
        timeEntries.forEach(entry => {
            if (entry.userId === currentUser.id && isSameMonth(new Date(entry.date), selectedDate)) {
                workDays.add(new Date(entry.date).toDateString());
            }
        });

        const generalAbsenceDays = new Set<string>();
        const sickLeaveDays = new Set<string>();
        absences.forEach(absence => {
            if (absence.userId === currentUser.id) {
                 for (let d = new Date(absence.startDate); d <= new Date(absence.endDate); d.setDate(d.getDate() + 1)) {
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

    const handleAbsenceSave = (from: Date, to: Date, type: AbsenceType, userId: string, absenceIdToUpdate?: string) => {
        // Validation check
        for (let d = new Date(from); d <= new Date(to); d.setDate(d.getDate() + 1)) {
            if (calendarData.workDays.has(d.toDateString())) {
                 toast({
                    variant: 'destructive',
                    title: 'Logged Work Conflict',
                    description: 'Selected date range contains logged work and cannot be marked as an absence.'
                });
                return;
            }
        }
        
        if (absenceIdToUpdate) {
            updateAbsence(absenceIdToUpdate, { userId: currentUser.id, startDate: from.toISOString(), endDate: to.toISOString(), type });
        } else {
            addAbsence({ userId: currentUser.id, startDate: from.toISOString(), endDate: to.toISOString(), type });
        }
        setIsAbsenceDialogOpen(false);
        setEditingAbsence(null);
    };

    const handleDayDoubleClick = (date: Date) => {
        const clickedDateStr = date.toDateString();
        const userAbsences = absences.filter(a => a.userId === currentUser.id);
        const absence = userAbsences.find(a => isWithinInterval(date, { start: parseISO(a.startDate), end: parseISO(a.endDate) }));

        if (absence) {
            setEditingAbsence(absence);
            setIsAbsenceDialogOpen(true);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Roster</CardTitle>
                <div className="flex gap-2 items-center">
                    <Button onClick={() => { setEditingAbsence(null); setIsAbsenceDialogOpen(true); }}>Mark Absence</Button>
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
                        publicHoliday: publicHolidays.map(h => new Date(h.date)),
                        workDay: Array.from(calendarData.workDays).map(d => new Date(d)),
                        generalAbsence: Array.from(calendarData.generalAbsenceDays).map(d => new Date(d)),
                        sickLeave: Array.from(calendarData.sickLeaveDays).map(d => new Date(d)),
                    }}
                    modifiersClassNames={{
                        weekend: 'bg-orange-100 dark:bg-orange-900/50',
                        publicHoliday: 'bg-orange-100 dark:bg-orange-900/50',
                        workDay: 'bg-sky-200 dark:bg-sky-800',
                        generalAbsence: 'bg-yellow-200 dark:bg-yellow-800',
                        sickLeave: 'bg-red-300 dark:bg-red-800',
                        day_today: ''
                    }}
                    classNames={{
                      row: "flex w-full mt-0 border-t",
                      cell: "flex-1 text-center text-sm p-0 m-0 border-r last:border-r-0 relative",
                      head_row: "flex",
                      head_cell: "text-muted-foreground rounded-md w-full font-normal text-xs",
                      day: "h-24 w-full p-1",
                      months: "w-full",
                      month: "w-full space-y-0",
                      caption_label: "hidden"
                    }}
                    weekStartsOn={1}
                    fromDate={minContractDate || undefined}
                    toDate={maxContractDate || undefined}
                />
            </CardContent>
            <MarkAbsenceDialog
                isOpen={isAbsenceDialogOpen}
                onOpenChange={setIsAbsenceDialogOpen}
                onSave={(from, to, type, userId, absenceId) => handleAbsenceSave(from, to, type, absenceId)}
                userId={currentUser.id}
                absence={editingAbsence}
            />
        </Card>
    );
}
