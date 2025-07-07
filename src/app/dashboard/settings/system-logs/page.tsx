
'use client';

import * as React from 'react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { currentUser } from '@/lib/mock-data';
import { useSystemLog } from '../../contexts/SystemLogContext';

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: new Date(0, i).toLocaleString('default', { month: 'long' }),
}));
const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

export default function SystemLogsPage() {
  const { logs } = useSystemLog();
  const [filterType, setFilterType] = React.useState<'month' | 'range'>('month');
  const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();

  const filteredLogs = React.useMemo(() => {
    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      if (filterType === 'month') {
        return logDate.getMonth() === selectedMonth && logDate.getFullYear() === selectedYear;
      }
      if (filterType === 'range' && dateRange?.from && dateRange?.to) {
        return isWithinInterval(logDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
      }
      // If range is not fully selected, don't filter anything out yet
      if (filterType === 'range' && (!dateRange?.from || !dateRange?.to)) {
        return true;
      }
      return true;
    });
  }, [logs, filterType, selectedMonth, selectedYear, dateRange]);
  
  if (currentUser.role !== 'Super Admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>You do not have permission to view this page.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Please contact your administrator if you believe this is an error.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">System Logs</h1>
          <p className="text-muted-foreground">View a read-only ledger of all system activities.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Log Viewer</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <CardDescription>
                Filter logs by month or a custom date range. Logs are immutable.
            </CardDescription>
             <div className="flex gap-2">
                <Select value={filterType} onValueChange={(v) => setFilterType(v as 'month' | 'range')}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="month">By Month</SelectItem>
                        <SelectItem value="range">By Range</SelectItem>
                    </SelectContent>
                </Select>

                {filterType === 'month' ? (
                    <>
                        <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
                            <SelectTrigger className="w-[180px]"><SelectValue/></SelectTrigger>
                            <SelectContent>
                                {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                            <SelectTrigger className="w-[120px]"><SelectValue/></SelectTrigger>
                            <SelectContent>
                                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </>
                ) : (
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                            dateRange.to ? (
                                <>
                                {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(dateRange.from, "LLL dd, y")
                            )
                            ) : (
                            <span>Pick a date range</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
                )}
             </div>
          </div>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-[60vh]">
                <Table>
                    <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                            <TableHead className="w-[200px]">Timestamp</TableHead>
                            <TableHead>Log Entry</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLogs.length > 0 ? filteredLogs.map(log => (
                            <TableRow key={log.id}>
                                <TableCell className="font-mono text-xs">{format(new Date(log.timestamp), 'PPpp')}</TableCell>
                                <TableCell>{log.message}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={2} className="h-24 text-center">No logs found for the selected period.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
