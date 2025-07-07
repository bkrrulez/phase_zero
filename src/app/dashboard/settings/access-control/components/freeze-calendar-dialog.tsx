
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, lastDayOfMonth, startOfMonth, subMonths } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { currentUser, teams } from '@/lib/mock-data';

const freezeSchema = z.object({
  teamId: z.string().min(1, 'Please select a team.'),
  timePeriod: z.enum(['month', 'tillDate', 'customRange']),
});

export type FreezeFormValues = z.infer<typeof freezeSchema>;
export type FreezeFormSubmitData = {
  teamId: string;
  startDate: Date;
  endDate: Date;
};

interface FreezeCalendarDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: FreezeFormSubmitData) => void;
}

const lastDayOfPreviousMonth = lastDayOfMonth(subMonths(new Date(), 1));
const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const allMonths = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: new Date(0, i).toLocaleString('default', { month: 'long' }),
}));

export function FreezeCalendarDialog({ isOpen, onOpenChange, onSave }: FreezeCalendarDialogProps) {
  const { toast } = useToast();
  const form = useForm<FreezeFormValues>({
    resolver: zodResolver(freezeSchema),
    defaultValues: { teamId: '', timePeriod: 'month' },
  });

  const [selectedMonth, setSelectedMonth] = useState(lastDayOfPreviousMonth.getMonth());
  const [selectedYear, setSelectedYear] = useState(lastDayOfPreviousMonth.getFullYear());
  const [tillDate, setTillDate] = useState<Date | undefined>(lastDayOfPreviousMonth);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  const timePeriodWatcher = form.watch('timePeriod');

  const availableTeams = useMemo(() => {
    if (currentUser.role === 'Super Admin') return teams;
    if (currentUser.role === 'Team Lead') return teams.filter(t => t.id === currentUser.teamId);
    return [];
  }, []);

  useEffect(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const previousMonthIndex = subMonths(now, 1).getMonth();

    if (selectedYear === currentYear && selectedMonth > previousMonthIndex) {
        setSelectedMonth(previousMonthIndex);
    }
  }, [selectedYear, selectedMonth]);

  const availableMonths = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const previousMonthIndex = subMonths(new Date(), 1).getMonth();

    if (selectedYear === currentYear) {
        return allMonths.filter(m => m.value <= previousMonthIndex);
    }
    
    return allMonths;
  }, [selectedYear]);

  const handleSubmit = () => {
    form.trigger().then(isValid => {
      if (!isValid) return;

      const { teamId, timePeriod } = form.getValues();
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (timePeriod === 'month') {
        const date = new Date(selectedYear, selectedMonth, 1);
        startDate = startOfMonth(date);
        endDate = lastDayOfMonth(date);
      } else if (timePeriod === 'tillDate') {
        startDate = new Date(2000, 0, 1);
        endDate = tillDate;
      } else if (timePeriod === 'customRange') {
        startDate = dateRange?.from;
        endDate = dateRange?.to;
      }

      if (!startDate || !endDate) {
        toast({ variant: 'destructive', title: 'Invalid Date', description: 'Please select a valid date or range.' });
        return;
      }
      if (startDate > endDate) {
        toast({ variant: 'destructive', title: 'Invalid Range', description: 'Start date must be earlier than end date.' });
        return;
      }
      
      onSave({ teamId, startDate, endDate });
      form.reset({ teamId: '', timePeriod: 'month' });
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Freeze Calendar</DialogTitle>
          <DialogDescription>Select a team and time period to prevent time entry.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="teamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team(s)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {currentUser.role === 'Super Admin' && <SelectItem value="all-teams">All Teams</SelectItem>}
                      {availableTeams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timePeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time Period</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a time period" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="tillDate">Till Date</SelectItem>
                      <SelectItem value="customRange">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {timePeriodWatcher === 'month' && (
              <div className="grid grid-cols-2 gap-4">
                <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {availableMonths.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                 <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {timePeriodWatcher === 'tillDate' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !tillDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {tillDate ? format(tillDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={tillDate} onSelect={setTillDate} toDate={lastDayOfPreviousMonth} initialFocus />
                </PopoverContent>
              </Popover>
            )}

            {timePeriodWatcher === 'customRange' && (
               <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !dateRange?.from && "text-muted-foreground")}
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
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    toDate={lastDayOfPreviousMonth}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Freeze</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
