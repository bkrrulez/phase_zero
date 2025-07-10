
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import { FileUp } from 'lucide-react';
import { addDays, endOfDay, startOfDay, startOfYear, endOfYear, startOfMonth, endOfMonth, isWithinInterval, getDaysInMonth, differenceInCalendarDays, max, min, getDay, getMonth, getYear, getDate, startOfWeek, endOfWeek } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IndividualReport } from './components/individual-report';
import { useMembers } from '../contexts/MembersContext';
import { useHolidays } from '../contexts/HolidaysContext';
import { useAuth } from '../contexts/AuthContext';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useProjects } from '../contexts/ProjectsContext';
import { useTasks } from '../contexts/TasksContext';
import { type User } from '@/lib/types';

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: new Date(0, i).toLocaleString('default', { month: 'long' }),
}));

const getWeeksForMonth = (year: number, month: number) => {
    const weeks = [];
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let current = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 });

    while (current <= lastDayOfMonth) {
        const weekStart = max([current, firstDayOfMonth]);
        const weekEnd = min([endOfWeek(current, { weekStartsOn: 1 }), lastDayOfMonth]);
        
        weeks.push({ start: weekStart, end: weekEnd });
        
        current = addDays(weekEnd, 1);
    }
    return weeks;
};

export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { teamMembers } = useMembers();
  const { currentUser } = useAuth();
  const { publicHolidays, customHolidays, annualLeaveAllowance } = useHolidays();
  const { timeEntries } = useTimeTracking();
  const tab = searchParams.get('tab') || (currentUser.role === 'Employee' ? 'individual-report' : 'team-report');

  const [periodType, setPeriodType] = React.useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [reportView, setReportView] = React.useState<'consolidated' | 'project' | 'task'>('consolidated');
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = React.useState<number>(new Date().getMonth());
  const [selectedWeekIndex, setSelectedWeekIndex] = React.useState<number>(0);

  const weeksInMonth = React.useMemo(() => getWeeksForMonth(selectedYear, selectedMonth), [selectedYear, selectedMonth]);
  
  React.useEffect(() => {
    const today = new Date();
    if(getYear(today) === selectedYear && getMonth(today) === selectedMonth) {
      const currentWeekIndex = weeksInMonth.findIndex(w => isWithinInterval(today, {start: w.start, end: w.end}));
      setSelectedWeekIndex(currentWeekIndex >= 0 ? currentWeekIndex : 0);
    } else {
      setSelectedWeekIndex(0);
    }
  }, [selectedYear, selectedMonth, weeksInMonth]);


  const reports = React.useMemo(() => {
    const visibleMembers = teamMembers.filter(member => {
        if (currentUser.role === 'Super Admin') return true;
        if (currentUser.role === 'Team Lead') return member.reportsTo === currentUser.id;
        return false;
    });

    let periodStart: Date;
    let periodEnd: Date;

    if (periodType === 'weekly') {
        const week = weeksInMonth[selectedWeekIndex];
        periodStart = week ? startOfDay(week.start) : startOfMonth(new Date(selectedYear, selectedMonth));
        periodEnd = week ? endOfDay(week.end) : endOfMonth(new Date(selectedYear, selectedMonth));
    } else if (periodType === 'monthly') {
        periodStart = startOfMonth(new Date(selectedYear, selectedMonth));
        periodEnd = endOfMonth(new Date(selectedYear, selectedMonth));
    } else { // yearly
        periodStart = startOfYear(new Date(selectedYear, 0, 1));
        periodEnd = endOfYear(new Date(selectedYear, 11, 31));
    }
    

    const visibleMemberIds = visibleMembers.map(m => m.id);
    const filteredTimeEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return visibleMemberIds.includes(entry.userId) && isWithinInterval(entryDate, { start: periodStart, end: periodEnd });
    });
    
    // Consolidated Report
    const consolidatedData = visibleMembers.map(member => {
        const dailyContractHours = member.contract.weeklyHours / 5;

        const parseDateStringAsLocal = (dateString: string): Date => {
            const [year, month, day] = dateString.split('-').map(Number);
            return new Date(year, month - 1, day);
        };
        
        const contractStartDate = parseDateStringAsLocal(member.contract.startDate);
        const contractEndDate = member.contract.endDate ? parseDateStringAsLocal(member.contract.endDate) : periodEnd;
        
        const effectiveStart = max([periodStart, contractStartDate]);
        const effectiveEnd = min([periodEnd, contractEndDate]);

        if (effectiveStart > effectiveEnd) {
            return { ...member, assignedHours: '0.00', leaveHours: '0.00', expectedHours: '0.00', loggedHours: '0.00', remainingHours: '0.00' };
        }

        let assignedWorkDays = 0;

        for (let d = new Date(effectiveStart); d <= effectiveEnd; d = addDays(d, 1)) {
            const dayOfWeek = getDay(d);
            if (dayOfWeek === 0 || dayOfWeek === 6) continue;

            const isPublicHoliday = publicHolidays.some(h => new Date(h.date).toDateString() === d.toDateString());
            if (isPublicHoliday) continue;

            const isCustomHoliday = customHolidays.some(h => {
                const hDate = new Date(h.date);
                const applies = (h.appliesTo === 'all-members') || (h.appliesTo === 'all-teams' && !!member.teamId) || (h.appliesTo === member.teamId);
                return hDate.toDateString() === d.toDateString() && applies;
            });
            if (isCustomHoliday) continue;

            assignedWorkDays++;
        }
        
        const assignedHours = assignedWorkDays * dailyContractHours;
        
        const yearStartForProrata = startOfYear(new Date(selectedYear, 0, 1));
        const yearEndForProrata = endOfYear(new Date(selectedYear, 11, 31));
        const daysInYear = differenceInCalendarDays(yearEndForProrata, yearStartForProrata) + 1;
        const prorataContractStart = max([yearStartForProrata, contractStartDate]);
        const prorataContractEnd = min([yearEndForProrata, contractEndDate]);
        const contractDurationInYear = prorataContractStart > prorataContractEnd ? 0 : differenceInCalendarDays(prorataContractEnd, prorataContractStart) + 1;
        const proratedAllowanceDays = (annualLeaveAllowance / daysInYear) * contractDurationInYear;
        const totalYearlyLeaveHours = proratedAllowanceDays * dailyContractHours;
        const leaveHours = (totalYearlyLeaveHours / daysInYear) * assignedWorkDays;

        const expectedHours = assignedHours - leaveHours;
        const loggedHours = filteredTimeEntries.filter(e => e.userId === member.id).reduce((acc, e) => acc + e.duration, 0);
        const remainingHours = expectedHours - loggedHours;
        
        return { 
            ...member, 
            assignedHours: assignedHours.toFixed(2),
            leaveHours: leaveHours.toFixed(2),
            expectedHours: expectedHours.toFixed(2), 
            loggedHours: loggedHours.toFixed(2), 
            remainingHours: remainingHours.toFixed(2)
        };
    });

    // Project Level Report
    const projectAgg: { [key: string]: { duration: number, member: User } } = {};
    filteredTimeEntries.forEach(entry => {
        const [projectName] = entry.task.split(' - ');
        const key = `${entry.userId}__${projectName}`;
        if (!projectAgg[key]) {
            const member = teamMembers.find(m => m.id === entry.userId);
            if (member) projectAgg[key] = { duration: 0, member };
        }
        if (projectAgg[key]) projectAgg[key].duration += entry.duration;
    });
    const projectReport = Object.keys(projectAgg).map(key => {
        const [, projectName] = key.split('__');
        return { key, member: projectAgg[key].member, projectName, loggedHours: projectAgg[key].duration.toFixed(2) };
    }).sort((a, b) => a.member.name.localeCompare(b.member.name));

    // Task Level Report
    const taskAgg: { [key: string]: { duration: number, member: User } } = {};
    filteredTimeEntries.forEach(entry => {
        const [, ...taskParts] = entry.task.split(' - ');
        const taskName = taskParts.join(' - ') || 'Unspecified';
        const key = `${entry.userId}__${taskName}`;
        if (!taskAgg[key]) {
            const member = teamMembers.find(m => m.id === entry.userId);
            if (member) taskAgg[key] = { duration: 0, member };
        }
        if (taskAgg[key]) taskAgg[key].duration += entry.duration;
    });
    const taskReport = Object.keys(taskAgg).map(key => {
        const [, taskName] = key.split('__');
        return { key, member: taskAgg[key].member, taskName, loggedHours: taskAgg[key].duration.toFixed(2) };
    }).sort((a,b) => a.member.name.localeCompare(b.member.name));

    return { consolidatedData, projectReport, taskReport };
  }, [selectedYear, selectedMonth, selectedWeekIndex, teamMembers, publicHolidays, customHolidays, currentUser, timeEntries, periodType, annualLeaveAllowance, weeksInMonth]);

  const onTabChange = (value: string) => {
    router.push(`/dashboard/reports?tab=${value}`);
  };

  const getReportTitle = () => {
    if (periodType === 'yearly') {
        return `Report for the year ${selectedYear}`;
    }
    if (periodType === 'monthly') {
        return `Report for ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`;
    }
    if (periodType === 'weekly' && weeksInMonth[selectedWeekIndex]) {
        const week = weeksInMonth[selectedWeekIndex];
        return `Report for W${selectedWeekIndex + 1} (${getDate(week.start)}-${getDate(week.end)}) ${months[selectedMonth].label} ${selectedYear}`;
    }
    return 'Report';
  };

  const handleExport = () => {
    if (reports.consolidatedData.length === 0) return;

    // -- Sheet 1: Total Time --
    const title = getReportTitle();
    
    const totalTimeData = [
      [title], [], ['Member', 'Role', 'Assigned Hours', 'Leave Hours', 'Expected', 'Logged', 'Remaining'],
      ...reports.consolidatedData.map(member => [
        member.name, member.role, member.assignedHours, member.leaveHours, member.expectedHours, member.loggedHours, member.remainingHours,
      ]),
    ];
    const totalTimeSheet = XLSX.utils.aoa_to_sheet(totalTimeData);

    // -- Sheet 2: Project Level Report --
    const projectData = [
      ['Project level report'], [], ['Member', 'Role', 'Project', 'Logged Hours'],
      ...reports.projectReport.map(item => [
        item.member.name, item.member.role, item.projectName, item.loggedHours
      ]),
    ];
    const projectSheet = XLSX.utils.aoa_to_sheet(projectData);

    // -- Sheet 3: Task Level Report --
    const taskData = [
        ['Task level report'], [], ['Member', 'Role', 'Task', 'Logged Hours'],
        ...reports.taskReport.map(item => [
            item.member.name, item.member.role, item.taskName, item.loggedHours
        ])
    ];
    const taskSheet = XLSX.utils.aoa_to_sheet(taskData);

    // Create workbook and export
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, totalTimeSheet, 'Total Time');
    XLSX.utils.book_append_sheet(wb, projectSheet, 'Project Level Report');
    XLSX.utils.book_append_sheet(wb, taskSheet, 'Task Level Report');
    XLSX.writeFile(wb, `team_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };


  if (currentUser.role !== 'Team Lead' && currentUser.role !== 'Super Admin') {
      return (
        <div className="space-y-6">
           <h1 className="text-3xl font-bold font-headline">My Report</h1>
           <p className="text-muted-foreground">Monthly overview of your logged hours and holidays.</p>
           <IndividualReport />
        </div>
      )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Reports</h1>
          <p className="text-muted-foreground">View team and individual performance.</p>
        </div>
      </div>
      <Tabs value={tab} onValueChange={onTabChange}>
            <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
                <TabsTrigger value="team-report">Team Report</TabsTrigger>
                <TabsTrigger value="individual-report">Individual Report</TabsTrigger>
            </TabsList>
            <TabsContent value="team-report" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Team Hours Summary</CardTitle>
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <CardDescription>
                      {getReportTitle()}
                    </CardDescription>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <RadioGroup value={periodType} onValueChange={(v) => setPeriodType(v as any)} className="flex items-center">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="weekly" id="weekly" /><Label htmlFor="weekly">Weekly</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="monthly" id="monthly" /><Label htmlFor="monthly">Monthly</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="yearly" id="yearly" /><Label htmlFor="yearly">Yearly</Label></div>
                        </RadioGroup>
                        <div className="flex items-center gap-2">
                             {periodType === 'weekly' && (
                                <Select value={String(selectedWeekIndex)} onValueChange={(v) => setSelectedWeekIndex(Number(v))}>
                                    <SelectTrigger className="w-full sm:w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {weeksInMonth.map((week, index) => (
                                            <SelectItem key={index} value={String(index)}>
                                                W{index + 1} ({getDate(week.start)}-{getDate(week.end)})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                             )}
                            {periodType !== 'yearly' && (
                                <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(Number(value))}>
                                    <SelectTrigger className="w-[130px]"><SelectValue placeholder="Select month" /></SelectTrigger>
                                    <SelectContent>{months.map(month => (<SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>))}</SelectContent>
                                </Select>
                            )}
                            <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                                <SelectTrigger className="w-[100px]"><SelectValue placeholder="Select year" /></SelectTrigger>
                                <SelectContent>{years.map(year => (<SelectItem key={year} value={String(year)}>{year}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                     <RadioGroup value={reportView} onValueChange={(v) => setReportView(v as any)} className="flex items-center gap-4">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="consolidated" id="r-consolidated" /><Label htmlFor="r-consolidated">Consolidated</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="project" id="r-project" /><Label htmlFor="r-project">Project Level</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="task" id="r-task" /><Label htmlFor="r-task">Task Level</Label></div>
                    </RadioGroup>
                     <Button variant="outline" onClick={handleExport}>
                        <FileUp className="mr-2 h-4 w-4" /> Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {reportView === 'consolidated' && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead className="hidden md:table-cell">Role</TableHead>
                          <TableHead className="text-right">Assigned Hours</TableHead>
                          <TableHead className="text-right">Leave Hours</TableHead>
                          <TableHead className="text-right">Expected</TableHead>
                          <TableHead className="text-right">Logged</TableHead>
                          <TableHead className="text-right">Remaining</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports.consolidatedData.map(member => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10"><AvatarImage src={member.avatar} alt={member.name} data-ai-hint="person avatar"/><AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                                <div><Link href={`/dashboard/reports?tab=individual-report&userId=${member.id}`} className="font-medium hover:underline">{member.name}</Link><p className="text-sm text-muted-foreground hidden sm:table-cell">{member.email}</p></div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell"><Badge variant={member.role === 'Team Lead' || member.role === 'Super Admin' ? "default" : "secondary"}>{member.role}</Badge></TableCell>
                            <TableCell className="text-right font-mono">{member.assignedHours}h</TableCell>
                            <TableCell className="text-right font-mono">{member.leaveHours}h</TableCell>
                            <TableCell className="text-right font-mono">{member.expectedHours}h</TableCell>
                            <TableCell className="text-right font-mono">{member.loggedHours}h</TableCell>
                            <TableCell className={`text-right font-mono ${parseFloat(member.remainingHours) < 0 ? 'text-destructive' : ''}`}>{member.remainingHours}h</TableCell>
                          </TableRow>
                        ))}
                        {reports.consolidatedData.length === 0 && (<TableRow><TableCell colSpan={7} className="text-center h-24">No team members to display.</TableCell></TableRow>)}
                      </TableBody>
                    </Table>
                  )}
                  {reportView === 'project' && (
                    <Table>
                      <TableHeader><TableRow><TableHead>Member</TableHead><TableHead className="hidden md:table-cell">Role</TableHead><TableHead>Project</TableHead><TableHead className="text-right">Logged Hours</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {reports.projectReport.map(item => (
                          <TableRow key={item.key}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10"><AvatarImage src={item.member.avatar} alt={item.member.name} data-ai-hint="person avatar"/><AvatarFallback>{item.member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                                <div><Link href={`/dashboard/reports?tab=individual-report&userId=${item.member.id}`} className="font-medium hover:underline">{item.member.name}</Link><p className="text-sm text-muted-foreground hidden sm:table-cell">{item.member.email}</p></div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell"><Badge variant={item.member.role === 'Team Lead' || item.member.role === 'Super Admin' ? "default" : "secondary"}>{item.member.role}</Badge></TableCell>
                            <TableCell className="font-medium">{item.projectName}</TableCell>
                            <TableCell className="text-right font-mono">{item.loggedHours}h</TableCell>
                          </TableRow>
                        ))}
                        {reports.projectReport.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center h-24">No project hours logged for this period.</TableCell></TableRow>)}
                      </TableBody>
                    </Table>
                  )}
                   {reportView === 'task' && (
                    <Table>
                      <TableHeader><TableRow><TableHead>Member</TableHead><TableHead className="hidden md:table-cell">Role</TableHead><TableHead>Task</TableHead><TableHead className="text-right">Logged Hours</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {reports.taskReport.map(item => (
                          <TableRow key={item.key}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10"><AvatarImage src={item.member.avatar} alt={item.member.name} data-ai-hint="person avatar"/><AvatarFallback>{item.member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                                <div><Link href={`/dashboard/reports?tab=individual-report&userId=${item.member.id}`} className="font-medium hover:underline">{item.member.name}</Link><p className="text-sm text-muted-foreground hidden sm:table-cell">{item.member.email}</p></div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell"><Badge variant={item.member.role === 'Team Lead' || item.member.role === 'Super Admin' ? "default" : "secondary"}>{item.member.role}</Badge></TableCell>
                            <TableCell className="font-medium">{item.taskName}</TableCell>
                            <TableCell className="text-right font-mono">{item.loggedHours}h</TableCell>
                          </TableRow>
                        ))}
                        {reports.taskReport.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center h-24">No task hours logged for this period.</TableCell></TableRow>)}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="individual-report" className="mt-4">
                <IndividualReport />
            </TabsContent>
        </Tabs>
    </div>
  );
}
