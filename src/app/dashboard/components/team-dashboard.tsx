
"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isSameDay, startOfMonth, getDay, addDays, endOfMonth, isWithinInterval, differenceInCalendarDays, startOfYear, endOfYear, max, min, getDaysInMonth } from "date-fns";
import { useTimeTracking } from "../contexts/TimeTrackingContext";
import { useMembers } from "../contexts/MembersContext";
import { useHolidays } from "../contexts/HolidaysContext";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";

export function TeamDashboard() {
  const { timeEntries } = useTimeTracking();
  const { teamMembers } = useMembers();
  const { publicHolidays, customHolidays, annualLeaveAllowance } = useHolidays();
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const teamPerformance = useMemo(() => {
    const visibleMembers = teamMembers.filter(member => {
        if (currentUser.role === 'Super Admin') {
            return member.id !== currentUser.id;
        }
        if (currentUser.role === 'Team Lead') {
            return member.reportsTo === currentUser.id;
        }
        return false;
    });

    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    
    return visibleMembers.map(member => {
      const dailyContractHours = member.contract.weeklyHours / 5;

      // 1. Calculate Assigned Hours for the whole month
      let assignedWorkDaysInMonth = 0;
      const monthHolidays = publicHolidays.filter(h => isWithinInterval(new Date(h.date), {start: monthStart, end: monthEnd}))
        .concat(customHolidays.filter(h => {
             const applies = (h.appliesTo === 'all-members') || (h.appliesTo === 'all-teams' && !!member.teamId) || (h.appliesTo === member.teamId);
             return applies && isWithinInterval(new Date(h.date), {start: monthStart, end: monthEnd});
        }));

      for (let d = new Date(monthStart); d <= monthEnd; d = addDays(d, 1)) {
        const dayOfWeek = getDay(d);
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        const isHoliday = monthHolidays.some(h => new Date(h.date).toDateString() === d.toDateString());
        if (isHoliday) continue;
        assignedWorkDaysInMonth++;
      }
      const assignedHours = assignedWorkDaysInMonth * dailyContractHours;

      // 2. Calculate Leave Hours for the month (prorated from annual)
      const parseDateStringAsLocal = (dateString: string): Date => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
      };
      const yearStartForProrata = startOfYear(today);
      const yearEndForProrata = endOfYear(today);
      const contractStartDate = parseDateStringAsLocal(member.contract.startDate);
      const contractEndDate = member.contract.endDate ? parseDateStringAsLocal(member.contract.endDate) : yearEndForProrata;
      const prorataContractStart = max([yearStartForProrata, contractStartDate]);
      const prorataContractEnd = min([yearEndForProrata, contractEndDate]);
      const daysInYear = differenceInCalendarDays(yearEndForProrata, yearStartForProrata) + 1;
      const contractDurationInYear = prorataContractStart > prorataContractEnd ? 0 : differenceInCalendarDays(prorataContractEnd, prorataContractStart) + 1;
      const proratedAllowanceDays = (annualLeaveAllowance / daysInYear) * contractDurationInYear;
      const totalYearlyLeaveHours = proratedAllowanceDays * dailyContractHours;
      const daysInCurrentMonth = getDaysInMonth(today);
      const leaveHours = (totalYearlyLeaveHours * daysInCurrentMonth) / daysInYear;

      // 3. Calculate Expected Hours for the month
      const expectedHours = assignedHours - leaveHours;

      // 4. Calculate Logged Hours for the month so far
      const userTimeEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entry.userId === member.id && isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
      });
      const manualTotalHours = userTimeEntries.reduce((acc, entry) => acc + entry.duration, 0);

      // 5. Calculate Performance (Overtime/Deficit) so far
      let workDaysSoFar = 0;
      for (let d = new Date(monthStart); d <= today; d = addDays(d, 1)) {
        const dayOfWeek = getDay(d);
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        const isHoliday = monthHolidays.some(h => new Date(h.date).toDateString() === d.toDateString());
        if (!isHoliday) {
          workDaysSoFar++;
        }
      }
      const assignedHoursSoFar = workDaysSoFar * dailyContractHours;
      const leaveHoursSoFar = (totalYearlyLeaveHours * today.getDate()) / daysInYear;
      const expectedHoursSoFar = assignedHoursSoFar - leaveHoursSoFar;
      const performance = manualTotalHours - expectedHoursSoFar;
      
      return {
        ...member,
        totalHours: manualTotalHours,
        expectedHours,
        performance,
      }
    });
  }, [timeEntries, teamMembers, publicHolidays, customHolidays, currentUser, annualLeaveAllowance]);

  const usersWithOvertime = teamPerformance
    .filter(u => u.performance > 0)
    .sort((a, b) => b.performance - a.performance);
  
  const usersWithDeficit = teamPerformance
    .filter(u => u.performance < 0)
    .sort((a, b) => a.performance - b.performance);
  
  const totalTeamHours = teamPerformance.reduce((acc, member) => acc + member.totalHours, 0);
  const totalExpectedHours = teamPerformance.reduce((acc, member) => acc + member.expectedHours, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">{t('teamDashboardTitle')}</h1>
        <p className="text-muted-foreground">{t('teamDashboardSubtitle')}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader>
                <CardTitle>{t('teamMembersTitle')}</CardTitle>
                <CardDescription>{t('teamMembersDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">{teamPerformance.length}</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>{t('totalHoursLoggedTitle')}</CardTitle>
                <CardDescription>{t('totalHoursLoggedDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">{totalTeamHours.toFixed(2)}h</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle>{t('totalExpectedHoursTitle')}</CardTitle>
                <CardDescription>{t('totalExpectedHoursDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">{totalExpectedHours.toFixed(2)}h</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>{t('teamPerformanceTitle')}</CardTitle>
                <CardDescription>{t('teamPerformanceDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
                <p className={`text-3xl font-bold ${(totalTeamHours - totalExpectedHours) < 0 ? 'text-destructive' : ''}`}>
                    { (totalTeamHours - totalExpectedHours) >= 0 ? '+' : '' }
                    {(totalTeamHours - totalExpectedHours).toFixed(2)}h
                </p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUp className="w-5 h-5 text-green-600" /> {t('usersWithOvertimeTitle')}
            </CardTitle>
            <CardDescription>{t('usersWithOvertimeDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('member')}</TableHead>
                        <TableHead className="text-right">{t('overtime')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {usersWithOvertime.length > 0 ? usersWithOvertime.map(user => (
                        <TableRow key={user.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-9 h-9">
                                        <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person avatar"/>
                                        <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{user.name}</p>
                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-600">+{user.performance.toFixed(2)}h</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={2} className="h-24 text-center">{t('noUsersWithOvertime')}</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDown className="w-5 h-5 text-destructive" /> {t('usersWithDeficitTitle')}
            </CardTitle>
            <CardDescription>{t('usersWithDeficitDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('member')}</TableHead>
                        <TableHead className="text-right">{t('deficit')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {usersWithDeficit.length > 0 ? usersWithDeficit.map(user => (
                        <TableRow key={user.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-9 h-9">
                                        <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person avatar"/>
                                        <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{user.name}</p>
                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-destructive">{user.performance.toFixed(2)}h</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={2} className="h-24 text-center">{t('noUsersWithDeficit')}</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
