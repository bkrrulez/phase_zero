import { Clock, PlusCircle, Users, BarChart as BarChartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { currentUser, timeEntries } from "@/lib/mock-data";
import { MonthlyHoursChart } from "./components/monthly-chart";
import { format } from "date-fns";

export default function DashboardPage() {
  const userTimeEntries = timeEntries.filter(entry => entry.userId === currentUser.id);
  const totalHours = userTimeEntries.reduce((acc, entry) => acc + entry.duration, 0);
  const weeklyHours = currentUser.contract.weeklyHours;
  const workDaysSoFar = new Set(userTimeEntries.map(e => new Date(e.date).getDate())).size;
  const expectedHours = (weeklyHours / 5) * workDaysSoFar;
  const overtime = totalHours - expectedHours;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Welcome, {currentUser.name}!</h1>
          <p className="text-muted-foreground">Here's your time tracking summary for this month.</p>
        </div>
        <Button>
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
              Based on {weeklyHours}h/week contract
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
  )
}
