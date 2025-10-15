
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
import { useMembers } from '../../contexts/MembersContext';
import { useTeams } from '../../contexts/TeamsContext';
import { isSameMonth, getDay, isWithinInterval, addDays, isSameDay, format, DayProps, endOfDay, parseISO, startOfDay, isBefore, isAfter } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { MarkAbsenceDialog } from './mark-absence-dialog';
import { User, Absence } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: new Date(0, i).toLocaleString('default', { month: 'long' }),
}));
const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

type SortableColumn = 'name' | 'email' | 'team';

// ✅ interpret date string as a plain local date (no timezone conversion)
const parseLocalDate = (dateString: string | Date): Date => {
    if (dateString instanceof Date) {
        return new Date(dateString.getFullYear(), dateString.getMonth(), dateString.getDate());
    }
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day);
};

const isDateInAbsence = (date: Date, absence: Absence) => {
    const localDate = parseLocalDate(date);
    const startDate = parseLocalDate(absence.startDate);
    const endDate = parseLocalDate(absence.endDate);
    
    return localDate.getTime() >= startDate.getTime() && localDate.getTime() <= endDate.getTime();
};

export function TeamRoster() {
    const { currentUser } = useAuth();
    const { teamMembers } = useMembers();
    const { timeEntries } = useTimeTracking();
    const { publicHolidays } = useHolidays();
    const { absences, addAbsence, updateAbsence, deleteAbsencesInRange } = useRoster();
    const { teams } = useTeams();

    const [selectedDate, setSelectedDate] = React.useState(new Date());
    const [selectedTeam, setSelectedTeam] = React.useState('all');
    const [expandedUser, setExpandedUser] = React.useState<string | null>(null);
    const [sortColumn, setSortColumn] = React.useState<SortableColumn>('name');
    const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
    const [isAbsenceDialogOpen, setIsAbsenceDialogOpen] = React.useState(false);
    const [editingAbsence, setEditingAbsence] = React.useState<Absence | null>(null);
    
    const visibleMembers = React.useMemo(() => {
        let members: User[];
        if (currentUser.role === 'Super Admin') {
            members = teamMembers.filter(m => m.id !== currentUser.id);
        } else { // Team Lead
            members = teamMembers.filter(m => m.reportsTo === currentUser.id);
        }
        
        if (selectedTeam !== 'all') {
            members = members.filter(m => m.teamId === selectedTeam);
        }

        return members.sort((a, b) => {
            let compareA, compareB;
            switch(sortColumn) {
                case 'email':
                    compareA = a.email;
                    compareB = b.email;
                    break;
                case 'team':
                    compareA = teams.find(t => t.id === a.teamId)?.name || '';
                    compareB = teams.find(t => t.id === b.teamId)?.name || '';
                    break;
                default: // name
                    compareA = a.name;
                    compareB = b.name;
                    break;
            }
            if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
            if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

    }, [currentUser, teamMembers, selectedTeam, sortColumn, sortDirection, teams]);

    const handleSort = (column: SortableColumn) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const renderSortArrow = (column: SortableColumn) => {
        if (sortColumn !== column) {
            return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
        }
        return sortDirection === 'asc' ? <ArrowUpDown className="ml-2 h-4 w-4" /> : <ArrowUpDown className="ml-2 h-4 w-4" />;
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
                const entryDate = parseLocalDate(entry.date);
                if(entryDate >= startOfDay(from) && entryDate <= endOfDay(to)) {
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
            const start = parseLocalDate(a.startDate);
            const end = endOfDay(parseLocalDate(a.endDate));
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


    const handleDayDoubleClick = (date: Date, userId: string) => {
        const userAbsences = absences.filter(a => a.userId === userId);
        const absenceOnDate = userAbsences.find(a => isDateInAbsence(date, a));

        if (absenceOnDate) {
            setEditingAbsence(absenceOnDate);
            setIsAbsenceDialogOpen(true);
        }
    };
    
    const handlePrevMonth = () => {
        setSelectedDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setSelectedDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1));
    };


    const RosterCalendar = ({ userId }: { userId: string }) => {
        const modifiers = React.useMemo(() => ({
            workDay: (date: Date) => timeEntries.some(entry => 
                entry.userId === userId && isSameDay(parseLocalDate(entry.date), date)
            ),
            generalAbsence: (date: Date) => absences.some(absence => 
                absence.userId === userId && absence.type === 'General Absence' && isDateInAbsence(date, absence)
            ),
            sickLeave: (date: Date) => absences.some(absence => 
                absence.userId === userId && absence.type === 'Sick Leave' && isDateInAbsence(date, absence)
            ),
            publicHoliday: (date: Date) => publicHolidays.some(ph => 
                isSameDay(parseLocalDate(ph.date), date)
            ),
        }), [userId]);

        function Day(props: DayProps) {
            let tooltipContent: React.ReactNode = null;
            let dayClassName = "w-full h-full p-0 m-0 flex items-center justify-center";
            const dayOfWeek = getDay(props.date);
    
            if (modifiers.publicHoliday(props.date)) {
                dayClassName = cn(dayClassName, "bg-orange-100 dark:bg-orange-900/50");
                tooltipContent = publicHolidays.find(h => isSameDay(parseLocalDate(h.date), props.date))?.name || 'Public Holiday';
            } else if (dayOfWeek === 6) {
                dayClassName = cn(dayClassName, "bg-orange-100 dark:bg-orange-900/50");
                tooltipContent = 'Saturday';
            } else if (dayOfWeek === 0) {
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
        
        return (
            <div className="p-4">
                <div className="border rounded-lg p-3">
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
                        onDayDoubleClick={(date) => handleDayDoubleClick(date, userId)}
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
                        components={{ Day }}
                    />
                </div>
            </div>
        );
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Team Roster</CardTitle>
                        <CardDescription>View your team's roster and mark absences.</CardDescription>
                    </div>
                     <div className="flex gap-2 items-center">
                        <Button onClick={() => { setEditingAbsence(null); setIsAbsenceDialogOpen(true); }}>Update Roster</Button>
                         <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by Team" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Teams</SelectItem>
                                {teams.map(team => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={String(selectedDate.getMonth())} onValueChange={(v) => setSelectedDate(new Date(selectedDate.getFullYear(), parseInt(v), 1))}>
                            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={String(selectedDate.getFullYear())} onValueChange={(v) => setSelectedDate(new Date(parseInt(v), selectedDate.getMonth(), 1))}>
                            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                                <div className="flex items-center">Name {renderSortArrow('name')}</div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort('email')}>
                                <div className="flex items-center">Email {renderSortArrow('email')}</div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort('team')}>
                                <div className="flex items-center">Team {renderSortArrow('team')}</div>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visibleMembers.map(member => (
                            <React.Fragment key={member.id}>
                                <TableRow onClick={() => setExpandedUser(expandedUser === member.id ? null : member.id)} className="cursor-pointer">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-10 h-10">
                                                <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="person avatar"/>
                                                <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{member.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{member.email}</TableCell>
                                    <TableCell>{teams.find(t => t.id === member.teamId)?.name || 'N/A'}</TableCell>
                                </TableRow>
                                {expandedUser === member.id && (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={3}>
                                            <RosterCalendar userId={member.id} />
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            <MarkAbsenceDialog
                isOpen={isAbsenceDialogOpen}
                onOpenChange={setIsAbsenceDialogOpen}
                onSave={handleAbsenceSave}
                members={visibleMembers}
                isTeamView={true}
                absence={editingAbsence}
            />
        </Card>
    );
}
