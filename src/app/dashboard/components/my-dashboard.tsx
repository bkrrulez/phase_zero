
"use client";

import { useState } from "react";
import { Clock, PlusCircle, Users, BarChart as BarChartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { currentUser, timeEntries as initialTimeEntries, TimeEntry, publicHolidays, customHolidays } from "@/lib/mock-data";
import { MonthlyHoursChart } from "./monthly-chart";
import { format, isSameDay } from "date-fns";
import { LogTimeDialog, type LogTimeFormValues } from "./log-time-dialog";
import { useToast } from "@/hooks/use-toast";

const calculateDuration = (startTime: string, endTime: string): number => {
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    const diff = end.getTime() - start.getTime();
    return diff / (1000 * 60 * 60);
};

export function MyDashboard() {
  const { toast } = useToast();
  const [isLogTimeDialogOpen, setIsLogTimeDialogOpen] = useState(false);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(initialTimeEntries);

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const monthStart = new Date(currentYear, currentMonth, 1);

  const userTimeEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entry.userId === currentUser.id && entryDate.getFullYear() === currentYear && entryDate.getMonth() === currentMonth;
  });

  const manualTotalHours = userTimeEntries.reduce((acc, entry) => acc + entry.duration, 0);

  const dailyHours = currentUser.contract.weeklyHours / 5;

  const allPublicHolidaysThisMonth = publicHolidays.filter(h => {
      const holidayDate = new Date(h.date);
      return holidayDate.getFullYear() === currentYear && holidayDate.getMonth() === currentMonth && holidayDate.getDay() !== 0 && holidayDate.getDay() !== 6;
  });

  const allCustomHolidaysThisMonth = customHolidays.filter(h => {
      const holidayDate = new Date(h.date);
      const applies = (h.appliesTo === 'all-members') ||
                      (h.appliesTo === 'all-teams' && !!currentUser.teamId) ||
                      (h.appliesTo === currentUser.teamId);
      return holidayDate.getFullYear() === currentYear && holidayDate.getMonth() === currentMonth && holidayDate.getDay() !== 0 && holidayDate.getDay() !== 6 && applies;
  });

  const allHolidaysThisMonth = [...allPublicHolidaysThisMonth, ...allCustomHolidaysThisMonth];

  const holidayHours = allHolidaysThisMonth.reduce((acc, h) => {
      return acc + (h.type === 'Full Day' ? dailyHours : dailyHours / 2);
  }, 0);

  const totalHours = manualTotalHours + holidayHours;

  let workDaysSoFar = 0;
  const dayIterator = new Date(monthStart);
  const holidaysSoFar = allHolidaysThisMonth.filter(h => new Date(h.date) <= today);

  while (dayIterator <= today) {
      const dayOfWeek = dayIterator.getDay();
      const isHoliday = holidaysSoFar.some(h => isSameDay(new Date(h.date), dayIterator));

      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday) {
          workDaysSoFar++;
      }
      dayIterator.setDate(dayIterator.getDate() + 1);
  }

  const expectedHours = workDaysSoFar * dailyHours;
  const overtime = totalHours - expectedHours;


  const handleLogTime = (data: LogTimeFormValues) => {
    const newEntry: TimeEntry = {
      id: `t-${Date.now()}`,
      userId: currentUser.id,
      date: data.date.toISOString(),
      startTime: data.startTime,
      endTime: data.endTime,
      task: `${data.project} - ${data.task}`,
      duration: calculateDuration(data.startTime, data.endTime),
    };
    setTimeEntries(prev => [newEntry, ...prev]);
    setIsLogTimeDialogOpen(false);
    toast({
        title: "Time Logged Successfully",
        description: `Logged ${newEntry.duration.toFixed(2)} hours for ${format(new Date(newEntry.date), 'PPP')}.`
    })
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Welcome, {currentUser.name}!</h1>
            <p className="text-muted-foreground">Here's your time tracking summary for this month.</p>
          </div>
          <Button onClick={() => setIsLogTimeDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Log Time
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Holidays Taken</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1 Day</div>
              <p className="text-xs text-muted-foreground">
                24 days remaining
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
              <MonthlyHoursChart />
          </div>
          <div className="lg:col-span-2">
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
                      {userTimeEntries.slice(0, 5).map(entry => (
                      <TableRow key={entry.id}>
                          <TableCell>{format(new Date(entry.date), 'PP')}</TableCell>
                          <TableCell className="font-medium truncate max-w-[120px]">{entry.task}</TableCell>
                          <TableCell className="text-right">{entry.duration.toFixed(2)}h</TableCell>
                      </TableRow>
                      ))}
                  </TableBody>
                  </Table>
              </CardContent>
              </Card>
          </div>
        </div>
      </div>
      <LogTimeDialog
        isOpen={isLogTimeDialogOpen}
        onOpenChange={setIsLogTimeDialogOpen}
        onLogTime={handleLogTime}
      />
    </>
  )
}
