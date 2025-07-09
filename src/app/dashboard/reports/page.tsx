
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { unparse } from 'papaparse';
import { FileDown } from 'lucide-react';
import { addDays } from 'date-fns';
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

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: new Date(0, i).toLocaleString('default', { month: 'long' }),
}));

export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { teamMembers } = useMembers();
  const { currentUser } = useAuth();
  const { publicHolidays, customHolidays } = useHolidays();
  const { timeEntries } = useTimeTracking();
  const tab = searchParams.get('tab') || (currentUser.role === 'Employee' ? 'individual-report' : 'team-report');

  const [periodType, setPeriodType] = React.useState<'monthly' | 'yearly'>('monthly');
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = React.useState<number>(new Date().getMonth());

  const reportData = React.useMemo(() => {
    const visibleMembers = teamMembers.filter(member => {
        if (currentUser.role === 'Super Admin') {
            return member.id !== currentUser.id;
        }
        if (currentUser.role === 'Team Lead') {
            return member.role === 'Employee';
        }
        return false;
    });

    if (periodType === 'yearly') {
        const yearStart = new Date(selectedYear, 0, 1);
        const yearEnd = new Date(selectedYear, 11, 31);
        
        const parseDateStringAsLocal = (dateString: string): Date => {
            const [year, month, day] = dateString.split('-').map(Number);
            return new Date(year, month - 1, day);
        };

        return visibleMembers.map(member => {
            const contractStartDate = parseDateStringAsLocal(member.contract.startDate);
            const contractEndDate = member.contract.endDate ? parseDateStringAsLocal(member.contract.endDate) : yearEnd;

            const effectiveStart = contractStartDate > yearStart ? contractStartDate : yearStart;
            const effectiveEnd = contractEndDate < yearEnd ? contractEndDate : yearEnd;
            
            if (effectiveStart > effectiveEnd) {
                return {
                    ...member,
                    expectedHours: (0).toFixed(2),
                    loggedHours: (0).toFixed(2),
                    remainingHours: (0).toFixed(2),
                };
            }

            const dailyContractHours = member.contract.weeklyHours / 5;

            const allPublicHolidaysForUser = publicHolidays.filter(h => new Date(h.date).getFullYear() === selectedYear);
            const allCustomHolidaysForUser = customHolidays.filter(h => {
                const hDate = new Date(h.date);
                const applies = (h.appliesTo === 'all-members') || (h.appliesTo === 'all-teams' && !!member.teamId) || (h.appliesTo === member.teamId);
                return hDate.getFullYear() === selectedYear && applies;
            });
            const allHolidaysForMemberDates = [...allPublicHolidaysForUser, ...allCustomHolidaysForUser].map(h => new Date(h.date).toDateString());

            let workingDaysInPeriod = 0;
            for (let d = new Date(effectiveStart); d <= effectiveEnd; d = addDays(d, 1)) {
                const dayOfWeek = d.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6 && !allHolidaysForMemberDates.includes(d.toDateString())) {
                    workingDaysInPeriod++;
                }
            }
            const expectedHours = workingDaysInPeriod * dailyContractHours;

            const holidaysInPeriod = [...allPublicHolidaysForUser, ...allCustomHolidaysForUser].filter(h => {
                const hDate = new Date(h.date);
                return hDate >= effectiveStart && hDate <= effectiveEnd && hDate.getDay() !== 0 && hDate.getDay() !== 6;
            });

            const holidayHours = holidaysInPeriod.reduce((acc, holiday) => {
                return acc + (holiday.type === 'Full Day' ? dailyContractHours : (dailyContractHours / 2));
            }, 0);

            const manualLoggedHours = timeEntries
                .filter(entry => {
                    const entryDate = new Date(entry.date);
                    return entry.userId === member.id && entryDate >= effectiveStart && entryDate <= effectiveEnd;
                })
                .reduce((acc, entry) => acc + entry.duration, 0);

            const loggedHours = manualLoggedHours + holidayHours;
            const remainingHours = expectedHours - loggedHours;

            return {
                ...member,
                expectedHours: expectedHours.toFixed(2),
                loggedHours: loggedHours.toFixed(2),
                remainingHours: remainingHours.toFixed(2),
            };
        });
    }

    // Monthly logic
    return visibleMembers.map(member => {
      const dailyContractHours = member.contract.weeklyHours / 5;
      const date = new Date(selectedYear, selectedMonth, 1);
      let workingDaysInMonthForMember = 0;
      
      const publicHolidaysInMonth = publicHolidays.filter(h => {
          const hDate = new Date(h.date);
          return hDate.getFullYear() === selectedYear && hDate.getMonth() === selectedMonth;
      });

      const customHolidaysInMonth = customHolidays.filter(h => {
          const hDate = new Date(h.date);
          const applies = (h.appliesTo === 'all-members') || (h.appliesTo === 'all-teams' && !!member.teamId) || (h.appliesTo === member.teamId);
          return hDate.getFullYear() === selectedYear && hDate.getMonth() === selectedMonth && applies;
      });

      const allHolidaysForMemberDates = [...publicHolidaysInMonth, ...customHolidaysInMonth].map(h => new Date(h.date).toDateString());

      while (date.getMonth() === selectedMonth) {
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !allHolidaysForMemberDates.includes(date.toDateString())) {
            workingDaysInMonthForMember++;
        }
        date.setDate(date.getDate() + 1);
      }
      
      const expectedHours = workingDaysInMonthForMember * dailyContractHours;

      const allHolidaysInMonthForMember = [...publicHolidaysInMonth, ...customHolidaysInMonth].filter(h => {
          const hDate = new Date(h.date);
          return hDate.getDay() !== 0 && hDate.getDay() !== 6;
      });

      const holidayHours = allHolidaysInMonthForMember.reduce((acc, holiday) => {
          return acc + (holiday.type === 'Full Day' ? dailyContractHours : (dailyContractHours / 2));
      }, 0);
      
      const manualLoggedHours = timeEntries
        .filter(entry => {
          const entryDate = new Date(entry.date);
          return (
            entry.userId === member.id &&
            entryDate.getFullYear() === selectedYear &&
            entryDate.getMonth() === selectedMonth
          );
        })
        .reduce((acc, entry) => acc + entry.duration, 0);

      const loggedHours = manualLoggedHours + holidayHours;
      const remainingHours = expectedHours - loggedHours;

      return {
        ...member,
        expectedHours: expectedHours.toFixed(2),
        loggedHours: loggedHours.toFixed(2),
        remainingHours: remainingHours.toFixed(2),
      };
    });
  }, [selectedYear, selectedMonth, teamMembers, publicHolidays, customHolidays, currentUser, timeEntries, periodType]);

  const onTabChange = (value: string) => {
    router.push(`/dashboard/reports?tab=${value}`);
  };

  const handleExport = () => {
    if (reportData.length === 0) return;

    const csvData = reportData.map(member => ({
        'Member': member.name,
        'Email': member.email,
        'Role': member.role,
        'Expected Hours': member.expectedHours,
        'Logged Hours': member.loggedHours,
        'Remaining Hours': member.remainingHours,
    }));

    const csv = unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const filename = periodType === 'monthly'
      ? `team_report_${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}.csv`
      : `team_report_${selectedYear}.csv`;
      
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                      {periodType === 'monthly'
                        ? `Report for ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`
                        : `Report for the year ${selectedYear}`}
                    </CardDescription>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <RadioGroup value={periodType} onValueChange={(v) => setPeriodType(v as 'monthly' | 'yearly')} className="flex items-center">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="monthly" id="monthly" />
                                <Label htmlFor="monthly">Monthly</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yearly" id="yearly" />
                                <Label htmlFor="yearly">Yearly</Label>
                            </div>
                        </RadioGroup>
                        <div className="flex-grow sm:flex-grow-0" />
                        <div className="flex items-center gap-2">
                            {periodType === 'monthly' && (
                                <Select
                                    value={String(selectedMonth)}
                                    onValueChange={(value) => setSelectedMonth(Number(value))}
                                >
                                    <SelectTrigger className="w-[130px]">
                                        <SelectValue placeholder="Select month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map(month => (
                                            <SelectItem key={month.value} value={String(month.value)}>
                                                {month.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            <Select
                                value={String(selectedYear)}
                                onValueChange={(value) => setSelectedYear(Number(value))}
                            >
                                <SelectTrigger className="w-[100px]">
                                    <SelectValue placeholder="Select year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(year => (
                                        <SelectItem key={year} value={String(year)}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                             <Button variant="outline" size="icon" onClick={handleExport}>
                              <FileDown className="h-4 w-4" />
                              <span className="sr-only">Export</span>
                            </Button>
                        </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead className="hidden md:table-cell">Role</TableHead>
                        <TableHead className="text-right">Expected</TableHead>
                        <TableHead className="text-right">Logged</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map(member => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="person avatar"/>
                                <AvatarFallback>
                                  {member.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <Link href={`/dashboard/reports?tab=individual-report&userId=${member.id}`} className="font-medium hover:underline">
                                    {member.name}
                                </Link>
                                <p className="text-sm text-muted-foreground hidden sm:table-cell">
                                  {member.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant={member.role === 'Team Lead' || member.role === 'Super Admin' ? "default" : "secondary"}>{member.role}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{member.expectedHours}h</TableCell>
                          <TableCell className="text-right font-mono">{member.loggedHours}h</TableCell>
                          <TableCell className={`text-right font-mono ${parseFloat(member.remainingHours) < 0 ? 'text-destructive' : ''}`}>{member.remainingHours}h</TableCell>
                        </TableRow>
                      ))}
                      {reportData.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24">
                                No team members to display.
                            </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
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
