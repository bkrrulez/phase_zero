
"use client";

import * as React from 'react';
import { Clock, Users, BarChart as BarChartIcon, CalendarHeart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type User } from "@/lib/mock-data";
import { MonthlyHoursChart } from "./monthly-chart";
import { format, isSameDay, differenceInCalendarDays, addDays, startOfYear, endOfYear, max, min, getDay, getDaysInMonth, startOfMonth, isFuture, parseISO, isSameMonth, endOfMonth } from "date-fns";
import { useTimeTracking } from "@/app/dashboard/contexts/TimeTrackingContext";
import { useHolidays } from "../contexts/HolidaysContext";
import { useMembers } from '../contexts/MembersContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '@/lib/utils';

export function MyDashboard() {
  const { timeEntries } = useTimeTracking();
  const { publicHolidays, customHolidays, holidayRequests, annualLeaveAllowance } = useHolidays();
  const { teamMembers } = useMembers();
  const { currentUser } = useAuth();
  const { isHolidaysNavVisible } = useSettings();
  
  const dailyHours = currentUser.contract.weeklyHours / 5;

  const calculateDurationInWorkdays = React.useCallback((startDate: Date, endDate: Date, userId: string): number => {
    let workdays = 0;
    const user = teamMembers.find(u => u.id === userId);
    if (!user) return 0;

    for (let dt = new Date(startDate); dt <= new Date(endDate); dt = addDays(dt, 1)) {
        const dayOfWeek = dt.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const isPublic = publicHolidays.some(h => isSameDay(new Date(h.date), dt));
        if (isPublic) continue;

        const isCustom = customHolidays.some(h => {
            const applies = (h.appliesTo === 'all-members') ||
                            (h.appliesTo === 'all-teams' && !!user.teamId) ||
                            (h.appliesTo === user.teamId);
            return applies && isSameDay(new Date(h.date), dt);
        });
        if (isCustom) continue;
        
        workdays++;
    }
    return workdays;
  }, [publicHolidays, customHolidays, teamMembers]);

  const getProratedAllowance = React.useCallback((user: User) => {
    const parseDateStringAsLocal = (dateString: string): Date => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const { startDate, endDate } = user.contract;
    const today = new Date();
    const yearStart = startOfYear(today);
    const yearEnd = endOfYear(today);
    const daysInYear = differenceInCalendarDays(yearEnd, yearStart) + 1;

    const contractStart = parseDateStringAsLocal(startDate);
    const contractEnd = endDate ? parseDateStringAsLocal(endDate) : yearEnd;

    const effectiveStartDate = max([yearStart, contractStart]);
    const effectiveEndDate = min([yearEnd, contractEnd]);

    if (effectiveStartDate > effectiveEndDate) {
        return 0;
    }

    const contractDurationInYear = differenceInCalendarDays(effectiveEndDate, effectiveStartDate) + 1;
    
    const prorated = (annualLeaveAllowance / daysInYear) * contractDurationInYear;
    
    return prorated;
  }, [annualLeaveAllowance]);

  const userAllowance = getProratedAllowance(currentUser);

  const { totalHours, expectedHours, overtime, takenDays, remainingDays } = React.useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    // Calculate Assigned Hours
    let workingDaysInMonth = 0;
    for (let d = new Date(monthStart); d <= monthEnd; d = addDays(d, 1)) {
        const dayOfWeek = getDay(d);
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const isPublic = publicHolidays.some(h => new Date(h.date).toDateString() === d.toDateString());
        if (isPublic) continue;

        const isCustom = customHolidays.some(h => {
            const hDate = new Date(h.date);
            const applies = (h.appliesTo === 'all-members') ||
                            (h.appliesTo === 'all-teams' && !!currentUser.teamId) ||
                            (h.appliesTo === currentUser.teamId);
            return hDate.toDateString() === d.toDateString() && applies;
        });
        if (isCustom) continue;
        
        workingDaysInMonth++;
    }
    const assignedHours = workingDaysInMonth * dailyHours;

    // Calculate Leave Hours
    const proratedAllowanceDays = getProratedAllowance(currentUser);
    const totalYearlyLeaveHours = proratedAllowanceDays * dailyHours;
    const daysInCurrentMonth = getDaysInMonth(today);
    const daysInYear = differenceInCalendarDays(endOfYear(today), startOfYear(today)) + 1;
    const leaveHours = (totalYearlyLeaveHours * daysInCurrentMonth) / daysInYear;

    // Calculate Expected Hours
    const expectedHours = assignedHours - leaveHours;
    
    // Calculate Logged Hours
    const userTimeEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entry.userId === currentUser.id && isSameMonth(entryDate, today);
    });
    const manualTotalHours = userTimeEntries.reduce((acc, entry) => acc + entry.duration, 0);
    const totalHours = manualTotalHours; // Holiday hours are now part of assigned hours/leave hours, not logged hours.

    // Calculate Overtime
    let workDaysSoFar = 0;
    const dayIterator = new Date(monthStart);

    while (dayIterator <= today) {
        if (isSameMonth(dayIterator, today)) {
            const dayOfWeek = getDay(dayIterator);
            const isHoliday = publicHolidays.some(h => new Date(h.date).toDateString() === dayIterator.toDateString()) || customHolidays.some(h => {
                const hDate = new Date(h.date);
                const applies = (h.appliesTo === 'all-members') ||
                                (h.appliesTo === 'all-teams' && !!currentUser.teamId) ||
                                (h.appliesTo === currentUser.teamId);
                return hDate.toDateString() === dayIterator.toDateString() && applies;
            });
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday) {
                workDaysSoFar++;
            }
        }
        dayIterator.setDate(dayIterator.getDate() + 1);
    }
    const expectedHoursSoFar = (workDaysSoFar * dailyHours) - (leaveHours * (today.getDate() / daysInCurrentMonth));
    const overtime = totalHours - expectedHoursSoFar;

    // Calculate Holiday Days
    const takenDays = holidayRequests
      .filter(req => req.userId === currentUser.id && req.status === 'Approved')
      .reduce((acc, req) => acc + calculateDurationInWorkdays(new Date(req.startDate), new Date(req.endDate), req.userId), 0);

    const remainingDays = userAllowance - takenDays;

    return { totalHours, expectedHours, overtime, takenDays, remainingDays };
  }, [timeEntries, publicHolidays, customHolidays, holidayRequests, userAllowance, dailyHours, calculateDurationInWorkdays, currentUser, getProratedAllowance]);

  const upcomingHolidays = React.useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return publicHolidays
      .map(h => ({...h, dateObj: parseISO(h.date)}))
      .filter(h => h.dateObj >= today)
      .sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime())
      .slice(0,3);
  }, [publicHolidays]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Welcome, {currentUser.name}!</h1>
          <p className="text-muted-foreground">Here's your time tracking summary for this month.</p>
        </div>
      </div>

      <div className={cn("grid gap-4 md:grid-cols-2", isHolidaysNavVisible ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours this month</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(2)}h</div>
            <p className="text-xs text-muted-foreground">
              out of {(expectedHours).toFixed(2)}h expected
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overtime</CardTitle>
            <BarChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overtime < 0 ? 'text-destructive' : ''}`}>
              {overtime >= 0 ? '+' : ''}{overtime.toFixed(2)}h
            </div>
            <p className="text-xs text-muted-foreground">
              Based on {currentUser.contract.weeklyHours}h/week contract
            </p>
          </CardContent>
        </Card>
        {isHolidaysNavVisible && (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Holidays Taken</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{takenDays} Day{takenDays === 1 ? '' : 's'}</div>
                    <p className="text-xs text-muted-foreground">
                    {remainingDays.toFixed(2)} days remaining
                    </p>
                </CardContent>
            </Card>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
            <MonthlyHoursChart />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
            <CardHeader>
                <CardTitle>Recent Time Entries</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {timeEntries.filter(e => e.userId === currentUser.id).slice(0, 5).map(entry => (
                    <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.date), 'PP')}</TableCell>
                        <TableCell className="font-medium truncate max-w-[120px]">{entry.task}</TableCell>
                        <TableCell className="text-right">{entry.duration.toFixed(2)}h</TableCell>
                    </TableRow>
                    ))}
                     {timeEntries.filter(e => e.userId === currentUser.id).length === 0 && (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">No recent entries.</TableCell>
                        </TableRow>
                     )}
                </TableBody>
                </Table>
            </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarHeart className="h-5 w-5" />
                  Upcoming Public Holidays
                </CardTitle>
                <CardDescription>The next 3 upcoming public holidays.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingHolidays.length > 0 ? (
                    upcomingHolidays.map(holiday => (
                      <div key={holiday.id} className="flex justify-between items-center">
                        <p className="font-medium">{holiday.name}</p>
                        <p className="text-sm text-muted-foreground">{format(holiday.dateObj, 'PP')}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No upcoming public holidays.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}
