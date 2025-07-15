
'use client';

import * as React from 'react';
import { Clock, Users, BarChartHorizontal, CalendarHeart, MoreHorizontal, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TimeEntry, User } from "@/lib/types";
import { MonthlyHoursChart } from "./monthly-chart";
import { format, isSameDay, differenceInCalendarDays, addDays, startOfYear, endOfYear, max, min, getDay, getDaysInMonth, startOfMonth, isFuture, parseISO, isSameMonth, endOfMonth, isWithinInterval, getYear } from "date-fns";
import { useTimeTracking } from "@/app/dashboard/contexts/TimeTrackingContext";
import { useHolidays } from "../contexts/HolidaysContext";
import { useMembers } from '../contexts/MembersContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '@/lib/utils';
import { useLanguage } from '../contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { LogTimeDialog, LogTimeFormValues } from './log-time-dialog';
import { DeleteTimeEntryDialog } from '../reports/components/delete-time-entry-dialog';

export function MyDashboard() {
  const { t } = useLanguage();
  const { timeEntries, updateTimeEntry, deleteTimeEntry } = useTimeTracking();
  const { publicHolidays, customHolidays, holidayRequests, annualLeaveAllowance } = useHolidays();
  const { teamMembers } = useMembers();
  const { currentUser } = useAuth();
  const { isHolidaysNavVisible, isLoading: isSettingsLoading } = useSettings();

  const [editingEntry, setEditingEntry] = React.useState<TimeEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = React.useState<TimeEntry | null>(null);
  
  if (!currentUser) return null; // Should not happen if AuthProvider works correctly

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
    const currentYear = today.getFullYear();
    const dailyContractHours = currentUser.contract.weeklyHours / 5;

    // --- Start: Accurate Calculation Logic from Reports ---
    const yearStartForProrata = startOfYear(new Date(currentYear, 0, 1));
    const yearEndForProrata = endOfYear(new Date(currentYear, 11, 31));

    const userHolidaysForYear = publicHolidays
        .filter(h => getYear(parseISO(h.date)) === currentYear && getDay(parseISO(h.date)) !== 0 && getDay(parseISO(h.date)) !== 6)
        .concat(customHolidays.filter(h => {
            if (getYear(parseISO(h.date)) !== currentYear) return false;
            if (getDay(parseISO(h.date)) === 0 || getDay(parseISO(h.date)) === 6) return false;
            const applies = (h.appliesTo === 'all-members') || (h.appliesTo === 'all-teams' && !!currentUser.teamId) || (h.appliesTo === currentUser.teamId);
            return applies;
        }));

    let totalWorkingDaysInYear = 0;
    for (let d = new Date(yearStartForProrata); d <= yearEndForProrata; d = addDays(d, 1)) {
        const dayOfWeek = getDay(d);
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        const isHoliday = userHolidaysForYear.some(h => isSameDay(parseISO(h.date), d));
        if (isHoliday) continue;
        totalWorkingDaysInYear++;
    }

    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    let workingDaysInMonth = 0;
    for (let d = new Date(monthStart); d <= monthEnd; d = addDays(d, 1)) {
        const dayOfWeek = getDay(d);
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        const isHoliday = userHolidaysForYear.some(h => isSameDay(parseISO(h.date), d));
        if (isHoliday) continue;
        workingDaysInMonth++;
    }

    const assignedHours = workingDaysInMonth * dailyContractHours;
    const totalYearlyLeaveHours = annualLeaveAllowance * dailyContractHours; // Use the base allowance, not prorated for this calc
    const dailyLeaveCredit = totalWorkingDaysInYear > 0 ? totalYearlyLeaveHours / totalWorkingDaysInYear : 0;
    const leaveHoursForMonth = dailyLeaveCredit * workingDaysInMonth;
    const expectedHours = assignedHours - leaveHoursForMonth;
    // --- End: Accurate Calculation Logic ---


    // Calculate Logged Hours for the month so far
    const userTimeEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entry.userId === currentUser.id && isSameMonth(entryDate, today);
    });
    const totalHours = userTimeEntries.reduce((acc, entry) => acc + entry.duration, 0);

    // Calculate Overtime so far
    let workDaysSoFar = 0;
    for (let d = new Date(monthStart); d <= today; d = addDays(d, 1)) {
        const dayOfWeek = getDay(d);
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        const isHoliday = userHolidaysForYear.some(h => new Date(h.date).toDateString() === d.toDateString());
        if (!isHoliday) {
          workDaysSoFar++;
        }
    }
    const assignedHoursSoFar = workDaysSoFar * dailyContractHours;
    const leaveHoursSoFar = dailyLeaveCredit * workDaysSoFar;
    const expectedHoursSoFar = assignedHoursSoFar - leaveHoursSoFar;
    const overtime = totalHours - expectedHoursSoFar;

    // Calculate Holiday Days Taken
    const takenDays = holidayRequests
      .filter(req => req.userId === currentUser.id && req.status === 'Approved')
      .reduce((acc, req) => acc + calculateDurationInWorkdays(new Date(req.startDate), new Date(req.endDate), req.userId), 0);

    const remainingDays = userAllowance - takenDays;

    return { totalHours, expectedHours, overtime, takenDays, remainingDays };
  }, [timeEntries, publicHolidays, customHolidays, holidayRequests, userAllowance, dailyHours, calculateDurationInWorkdays, currentUser, getProratedAllowance, annualLeaveAllowance]);

  const upcomingHolidays = React.useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return publicHolidays
      .map(h => ({...h, dateObj: parseISO(h.date)}))
      .filter(h => h.dateObj >= today)
      .sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime())
      .slice(0,3);
  }, [publicHolidays]);

  const handleSaveEntry = async (data: LogTimeFormValues, entryId?: string) => {
    if (!entryId) return { success: false };
    return updateTimeEntry(entryId, data, currentUser.id, teamMembers);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEntry) return;
    await deleteTimeEntry(deletingEntry.id);
    setDeletingEntry(null);
  };

  const handleRowDoubleClick = (entry: TimeEntry) => {
    setEditingEntry(entry);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">{t('welcome', { name: currentUser.name })}</h1>
            <p className="text-muted-foreground">{t('welcomeSubtitle')}</p>
          </div>
        </div>

        <div className={cn("grid gap-4 md:grid-cols-2", isHolidaysNavVisible ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('hoursThisMonth')}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHours.toFixed(2)}h</div>
              <p className="text-xs text-muted-foreground">
                {t('outOfExpected', { hours: expectedHours.toFixed(2) })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('overtime')}</CardTitle>
              <BarChartHorizontal className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${overtime < 0 ? 'text-destructive' : ''}`}>
                {overtime >= 0 ? '+' : ''}{overtime.toFixed(2)}h
              </div>
              <p className="text-xs text-muted-foreground">
                {t('basedOnContract', { hours: currentUser.contract.weeklyHours })}
              </p>
            </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <CalendarHeart className="h-4 w-4 text-muted-foreground" />
                  {t('upcomingPublicHolidays')}
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="space-y-2">
                  {upcomingHolidays.length > 0 ? (
                      upcomingHolidays.map(holiday => (
                      <div key={holiday.id} className="flex justify-between items-center text-xs">
                          <p className="font-medium">{holiday.name}</p>
                          <p className="text-muted-foreground">{format(holiday.dateObj, 'PP')}</p>
                      </div>
                      ))
                  ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">
                      {t('noUpcomingPublicHolidays')}
                      </p>
                  )}
                  </div>
              </CardContent>
          </Card>
          {isSettingsLoading ? (
              <Skeleton className="h-full w-full" />
          ) : isHolidaysNavVisible ? (
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t('holidaysTaken')}</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{t('daysCount', { count: takenDays })}</div>
                      <p className="text-xs text-muted-foreground">
                      {t('daysRemaining', { count: remainingDays.toFixed(2) })}
                      </p>
                  </CardContent>
              </Card>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
              <MonthlyHoursChart />
          </div>
          <div className="lg:col-span-2 flex">
              <Card className="flex-grow flex flex-col">
                <CardHeader>
                    <CardTitle>{t('recentTimeEntries')}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                    <Table>
                      <TableHeader>
                          <TableRow>
                          <TableHead>{t('date')}</TableHead>
                          <TableHead>{t('task')}</TableHead>
                          <TableHead className="text-right">{t('duration')}</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {timeEntries.filter(e => e.userId === currentUser.id).slice(0, 5).map(entry => (
                          <TableRow key={entry.id} onDoubleClick={() => handleRowDoubleClick(entry)} className="cursor-pointer">
                              <TableCell>{format(new Date(entry.date), 'PP')}</TableCell>
                              <TableCell className="font-medium truncate max-w-[120px]">{entry.task}</TableCell>
                              <TableCell className="text-right">{entry.duration.toFixed(2)}h</TableCell>
                          </TableRow>
                          ))}
                          {timeEntries.filter(e => e.userId === currentUser.id).length === 0 && (
                              <TableRow>
                                  <TableCell colSpan={3} className="h-24 text-center">{t('noRecentEntries')}</TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                    </Table>
                </CardContent>
              </Card>
          </div>
        </div>
      </div>
      
      {editingEntry && (
        <LogTimeDialog
          isOpen={!!editingEntry}
          onOpenChange={() => setEditingEntry(null)}
          onSave={handleSaveEntry}
          entryToEdit={editingEntry}
          userId={currentUser.id}
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
    </>
  )
}
