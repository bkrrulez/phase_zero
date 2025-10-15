
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '../../contexts/AuthContext';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';
import { useHolidays } from '../../contexts/HolidaysContext';
import { useRoster, AbsenceType } from '../../contexts/RosterContext';
import { isSameMonth, getDay, getYear, min, max, isWithinInterval, addDays, isSameDay, format, DayProps, endOfDay } from 'date-fns';
import { MarkAbsenceDialog } from './mark-absence-dialog';
import type { Absence } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: new Date(0, i).toLocaleString('default', { month: 'long' }),
}));

const parseUTCDate = (dateString: string) => {
    if (!dateString) return new Date();
    // Handles both 'YYYY-MM-DD' and full ISO strings by splitting at 'T'
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
};

export function MyRoster() {
    const { currentUser } = useAuth();
    const { timeEntries } = useTimeTracking();
    const { publicHolidays } = useHolidays();
    const { absences, addAbsence, updateAbsence, deleteAbsencesInRange } = useRoster();

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
    
    const modifiers = React.useMemo(() => ({
        workDay: (date: Date) => timeEntries.some(entry => entry.userId === currentUser.id && isSameDay(parseUTCDate(entry.date), date)),
        generalAbsence: (date: Date) => absences.some(absence => absence.userId === currentUser.id && absence.type === 'General Absence' && isWithinInterval(date, { start: parseUTCDate(absence.startDate), end: endOfDay(parseUTCDate(absence.endDate)) })),
        sickLeave: (date: Date) => absences.some(absence => absence.userId === currentUser.id && absence.type === 'Sick Leave' && isWithinInterval(date, { start: parseUTCDate(absence.startDate), end: endOfDay(parseUTCDate(absence.endDate)) })),
        publicHoliday: (date: Date) => publicHolidays.some(ph => isSameDay(parseUTCDate(ph.date), date)),
    }), [timeEntries, absences, publicHolidays, currentUser.id]);

    const handleMonthChange = (month: string) => {
        setSelectedDate(new Date(selectedDate.getFullYear(), parseInt(month), 1));
    };

    const handleYearChange = (year: string) => {
        setSelectedDate(new Date(parseInt(year), selectedDate.getMonth(), 1));
    };
    
    const handlePrevMonth = () => {
        setSelectedDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setSelectedDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1));
    };


    const handleAbsenceSave = async (from: Date, to: Date, type: AbsenceType, userId: string, absenceIdToUpdate?: string) => {
        const startDateStr = from.toISOString().split('T')[0];
        const endDateStr = to.toISOString().split('T')[0];

        if (type === 'Clear Absence') {
            await deleteAbsencesInRange(userId, startDateStr, endDateStr);
            setIsAbsenceDialogOpen(false);
            setEditingAbsence(null);
            return;
        }

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
            await updateAbsence(idToUpdate, { userId, startDate: startDateStr, endDate: endDateStr, type });
        } else {
            await addAbsence({ userId, startDate: startDateStr, endDate: endDateStr, type });
        }
        setIsAbsenceDialogOpen(false);
        setEditingAbsence(null);
    };

    const handleDayDoubleClick = (date: Date) => {
        const userAbsences = absences.filter(a => a.userId === currentUser.id);
        const absenceOnDate = userAbsences.find(a => isWithinInterval(date, { start: parseUTCDate(a.startDate), end: endOfDay(parseUTCDate(a.endDate)) }));

        if (absenceOnDate) {
            setEditingAbsence(absenceOnDate);
            setIsAbsenceDialogOpen(true);
        }
    };

    function Day(props: DayProps) {
        let tooltipContent: React.ReactNode = null;
        let dayClassName = "w-full h-full p-0 m-0 flex items-center justify-center";
        const dayOfWeek = getDay(props.date);

        if (modifiers.publicHoliday(props.date)) {
            dayClassName = cn(dayClassName, "bg-orange-100 dark:bg-orange-900/50");
            tooltipContent = publicHolidays.find(h => isSameDay(parseUTCDate(h.date), props.date))?.name || 'Public Holiday';
        } else if (dayOfWeek === 6) { // Saturday
            dayClassName = cn(dayClassName, "bg-orange-100 dark:bg-orange-900/50");
            tooltipContent = 'Saturday';
        } else if (dayOfWeek === 0) { // Sunday
            dayClassName = cn(dayClassName, "bg-orange-100 dark:bg-orange-900/50");
            tooltipContent = 'Sunday';
        }
        
        if (modifiers.sickLeave(props.date)) {
            dayClassName = cn(dayClassName, "bg-red-300 dark:bg-red-800");
            tooltipContent = 'Sick Leave';
        } else if (modifiers.generalAbsence(props.date)) {
            dayClassName = cn(dayClassName, "bg-yellow-200 dark:bg-yellow-800");
            tooltipContent = 'General Absence';
        } else if (modifiers.workDay(props.date)) {
            dayClassName = cn(dayClassName, "bg-sky-200 dark:bg-sky-800");
            tooltipContent = 'Work Logged';
        }
        
        const content = <button type="button" className={dayClassName}>{format(props.date, 'd')}</button>;

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

    const yearsList = React.useMemo(() => {
        const currentYear = new Date().getFullYear();
        return availableYears.length > 0 ? availableYears : [currentYear];
    }, [availableYears]);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>My Roster</CardTitle>
                        <CardDescription>A monthly overview of your logged time and absences.</CardDescription>
                    </div>
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
                                {yearsList.map(year => (
                                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <div className="p-3">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <Button variant="outline" size="icon" onClick={handlePrevMonth} className="z-10 bg-background hover:bg-muted">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <h3 className="text-center font-bold text-xl">
                                {format(selectedDate, 'MMMM yyyy')}
                            </h3>
                            <Button variant="outline" size="icon" onClick={handleNextMonth} className="z-10 bg-background hover:bg-muted">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <Calendar
                            month={selectedDate}
                            onMonthChange={setSelectedDate}
                            onDayDoubleClick={handleDayDoubleClick}
                            formatters={{ formatWeekdayName: (day) => format(day, 'EEE') }}
                           modifiersClassNames={{
                                today: 'bg-muted'
                           }}
                            classNames={{
                                row: "flex w-full mt-0",
                                cell: "flex-1 text-center text-sm p-0 m-0 border h-[50px]",
                                head_row: "flex",
                                head_cell: "text-muted-foreground rounded-md w-full font-bold text-xs p-2 border",
                                day: "h-full w-full p-1 hover:bg-muted",
                                months: "w-full",
                                month: "w-full space-y-0",
                                caption: "hidden"
                            }}
                            weekStartsOn={1}
                            fromDate={minContractDate || undefined}
                            toDate={maxContractDate || undefined}
                            components={{ Day }}
                        />
                    </div>
                </div>
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
