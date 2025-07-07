
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { teamMembers, timeEntries, currentUser, publicHolidays } from '@/lib/mock-data';
import { IndividualReport } from './components/individual-report';

const getWorkingDaysInMonth = (year: number, month: number) => {
  const date = new Date(year, month, 1);
  let workingDays = 0;
  
  const holidaysInMonth = publicHolidays
    .filter(h => {
      const holidayDate = new Date(h.date);
      return holidayDate.getFullYear() === year && holidayDate.getMonth() === month;
    })
    .map(h => new Date(h.date).getDate());

  while (date.getMonth() === month) {
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaysInMonth.includes(dayOfMonth)) {
      workingDays++;
    }
    date.setDate(date.getDate() + 1);
  }
  return workingDays;
};

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: new Date(0, i).toLocaleString('default', { month: 'long' }),
}));

export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || (currentUser.role === 'Employee' ? 'individual-report' : 'team-report');

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  const reportData = useMemo(() => {
    const workingDays = getWorkingDaysInMonth(selectedYear, selectedMonth);

    const visibleMembers = teamMembers.filter(member => {
        if (currentUser.role === 'Super Admin') {
            return member.id !== currentUser.id;
        }
        if (currentUser.role === 'Team Lead') {
            return member.role === 'Employee';
        }
        return false;
    });

    return visibleMembers.map(member => {
      const expectedHours = (member.contract.weeklyHours / 5) * workingDays;

      const dailyContractHours = member.contract.weeklyHours / 5;
      const holidaysForUser = publicHolidays.filter(h => {
          const holidayDate = new Date(h.date);
          const dayOfWeek = holidayDate.getDay();
          return holidayDate.getFullYear() === selectedYear && holidayDate.getMonth() === selectedMonth && dayOfWeek !== 0 && dayOfWeek !== 6;
      });

      const holidayHours = holidaysForUser.reduce((acc, holiday) => {
          if (holiday.type === 'Full Day') return acc + dailyContractHours;
          if (holiday.type === 'Half Day') return acc + (dailyContractHours / 2);
          return acc;
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
  }, [selectedYear, selectedMonth]);

  const onTabChange = (value: string) => {
    router.push(`/dashboard/reports?tab=${value}`);
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
                  <CardTitle>Monthly Hours Summary</CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2 justify-between">
                    <CardDescription>
                      Report for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                    </CardDescription>
                    <div className="flex gap-2">
                        <Select
                            value={String(selectedMonth)}
                            onValueChange={(value) => setSelectedMonth(Number(value))}
                        >
                            <SelectTrigger className="w-full sm:w-[180px]">
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
                        <Select
                            value={String(selectedYear)}
                            onValueChange={(value) => setSelectedYear(Number(value))}
                        >
                            <SelectTrigger className="w-full sm:w-[120px]">
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
