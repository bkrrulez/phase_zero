
'use client';

import * as React from 'react';
import { Clock, Users, BarChartHorizontal, CalendarHeart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TimeEntry, User } from "@/lib/types";
import { MonthlyHoursChart } from "./monthly-chart";
import { format, isSameDay, differenceInCalendarDays, addDays, startOfYear, endOfYear, max, min, getDay, getDaysInMonth, startOfMonth, parseISO, isSameMonth, endOfMonth, isWithinInterval, getYear } from "date-fns";
import { useTimeTracking } from "@/app/dashboard/contexts/TimeTrackingContext";
import { useMembers } from '../contexts/MembersContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '@/lib/utils';
import { useLanguage } from '../contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { LogTimeDialog, LogTimeFormValues } from './log-time-dialog';
import { DeleteTimeEntryDialog } from '../reports/components/delete-time-entry-dialog';
import { DayDetailsDialog } from '../reports/components/day-details-dialog';

export function MyDashboard() {
  const { t } = useLanguage();
  const { timeEntries, updateTimeEntry, deleteTimeEntry } = useTimeTracking();
  const { teamMembers } = useMembers();
  const { currentUser } = useAuth();
  const { isHolidaysNavVisible, isLoading: isSettingsLoading } = useSettings();

  const [editingEntry, setEditingEntry] = React.useState<TimeEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = React.useState<TimeEntry | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false);
  const [selectedDayEntries, setSelectedDayEntries] = React.useState<TimeEntry[]>([]);
  const [selectedDayForDialog, setSelectedDayForDialog] = React.useState<Date>(new Date());
  
  if (!currentUser) return null; // Should not happen if AuthProvider works correctly

  const { totalHours, expectedHoursSoFar, overtime } = React.useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const periodStart = startOfMonth(today);
    const yearEnd = endOfYear(new Date(currentYear, 11, 31));

    // Calculate Logged Hours for the month so far
    const userTimeEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entry.userId === currentUser.id && isSameMonth(entryDate, today);
    });
    const totalHours = userTimeEntries.reduce((acc, entry) => acc + entry.duration, 0);

    // Calculate Overtime so far
    let assignedHoursSoFar = 0;

    for (let d = new Date(periodStart); d <= today; d = addDays(d, 1)) {
        const dayOfWeek = getDay(d);
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        
        const activeContractsOnDay = currentUser.contracts.filter(c => {
            const contractStart = parseISO(c.startDate);
            const contractEnd = c.endDate ? parseISO(c.endDate) : yearEnd;
            return isWithinInterval(d, { start: contractStart, end: contractEnd });
        });
        if (activeContractsOnDay.length > 0) {
            const dailyHours = activeContractsOnDay.reduce((sum, c) => sum + c.weeklyHours, 0) / 5;
            assignedHoursSoFar += dailyHours;
        }
    }
    
    const expectedHoursSoFar = parseFloat(assignedHoursSoFar.toFixed(2));
    const overtime = totalHours - expectedHoursSoFar;

    return { totalHours, expectedHoursSoFar, overtime };
  }, [timeEntries, currentUser]);


  const handleSaveEntry = async (data: LogTimeFormValues, entryId?: string) => {
    if (!entryId) return { success: false };
    return updateTimeEntry(entryId, data, currentUser.id, teamMembers);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEntry) return;
    await deleteTimeEntry(deletingEntry.id);
    setDeletingEntry(null);
    setIsDetailsDialogOpen(false); // Also close day details dialog
  };

  const handleRowDoubleClick = (entry: TimeEntry) => {
    const entryDate = new Date(entry.date);
    const entriesForDay = timeEntries.filter(e =>
      e.userId === currentUser.id && isSameDay(new Date(e.date), entryDate)
    );
    setSelectedDayEntries(entriesForDay);
    setSelectedDayForDialog(entryDate);
    setIsDetailsDialogOpen(true);
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
                Out of {expectedHoursSoFar.toFixed(2)}h expected till date
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('overtime')}</CardTitle>
              <BarChartHorizontal className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${overtime < 0 ? 'text-destructive' : 'text-green-600'}`}>
                {overtime >= 0 ? '+' : ''}{overtime.toFixed(2)}h
              </div>
              <p className="text-xs text-muted-foreground">
                {t('basedOnContract', { hours: currentUser.contract.weeklyHours })}
              </p>
            </CardContent>
          </Card>>
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
                          <TableHead>{t('project')}</TableHead>
                          <TableHead className="text-right">{t('duration')}</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {timeEntries.filter(e => e.userId === currentUser.id).slice(0, 5).map(entry => (
                          <TableRow key={entry.id} onDoubleClick={() => handleRowDoubleClick(entry)} className="cursor-pointer">
                              <TableCell>{format(new Date(entry.date), 'PP')}</TableCell>
                              <TableCell className="font-medium truncate max-w-[120px]">{entry.project}</TableCell>
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
      
       <DayDetailsDialog 
        isOpen={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        date={selectedDayForDialog}
        entries={selectedDayEntries}
        canEdit={true}
        onEdit={(entry) => {
            setIsDetailsDialogOpen(false);
            setEditingEntry(entry);
        }}
        onDelete={(entry) => setDeletingEntry(entry)}
      />

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

    
