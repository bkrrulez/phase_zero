'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { teamMembers, timeEntries, holidayRequests, type User } from '@/lib/mock-data';
import { addDays, getDay, isSameMonth } from 'date-fns';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DayContentProps } from 'react-day-picker';

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: new Date(0, i).toLocaleString('default', { month: 'long' }),
}));

export default function UserReportPage({ params }: { params: { userId: string } }) {
  const searchParams = useSearchParams();
  const initialMonth = searchParams.get('month');
  const initialYear = searchParams.get('year');

  const [selectedDate, setSelectedDate] = useState(
    new Date(
      initialYear ? parseInt(initialYear) : new Date().getFullYear(),
      initialMonth ? parseInt(initialMonth) : new Date().getMonth(),
      1
    )
  );

  const user = useMemo(() => teamMembers.find(m => m.id === params.userId), [params.userId]);

  const monthlyData = useMemo(() => {
    if (!user) return { loggedDays: {}, holidays: [] };

    const userTimeEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entry.userId === user.id &&
               entryDate.getFullYear() === selectedDate.getFullYear() &&
               entryDate.getMonth() === selectedDate.getMonth();
    });
    
    const loggedDays = userTimeEntries.reduce<Record<string, number>>((acc, entry) => {
        const day = new Date(entry.date).getDate();
        if (!acc[day]) acc[day] = 0;
        acc[day] += entry.duration;
        return acc;
    }, {});

    const holidays = holidayRequests.filter(req => 
        req.userId === user.id && req.status === 'Approved'
    ).flatMap(req => {
        const start = new Date(req.startDate);
        const end = new Date(req.endDate);
        const dates: Date[] = [];
        for (let dt = start; dt <= end; dt = addDays(dt, 1)) {
            if (isSameMonth(dt, selectedDate)) {
                dates.push(new Date(dt));
            }
        }
        return dates;
    });

    return { loggedDays, holidays };
  }, [user, selectedDate]);


  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold font-headline">User not found</h1>
        <p className="text-muted-foreground">The user you are looking for does not exist.</p>
        <Button variant="link" asChild className="p-0 mt-4">
            <Link href="/dashboard/reports">Go back to reports</Link>
        </Button>
      </div>
    );
  }
  
  const handleMonthChange = (month: string) => {
      setSelectedDate(new Date(selectedDate.getFullYear(), parseInt(month), 1));
  }
  
  const handleYearChange = (year: string) => {
      setSelectedDate(new Date(parseInt(year), selectedDate.getMonth(), 1));
  }

  const DayContent = (props: DayContentProps) => {
    const { date } = props;
    const dayOfMonth = date.getDate();

    if (!isSameMonth(date, selectedDate)) {
        return <div>{dayOfMonth}</div>;
    }

    const hours = monthlyData.loggedDays[dayOfMonth];
    
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center text-center p-1">
          <div>{dayOfMonth}</div>
          {hours !== undefined && (
              <span className="text-xs font-bold text-primary">{hours.toFixed(1)}h</span>
          )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <Button variant="ghost" asChild className="mb-2 -ml-4">
            <Link href={`/dashboard/reports?month=${selectedDate.getMonth()}&year=${selectedDate.getFullYear()}`}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Reports
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person avatar"/>
              <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold font-headline">{user.name}'s Calendar</h1>
              <p className="text-muted-foreground">Monthly overview of logged hours and holidays.</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Select
              value={String(selectedDate.getMonth())}
              onValueChange={handleMonthChange}
          >
              <SelectTrigger className="w-[180px]">
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
              value={String(selectedDate.getFullYear())}
              onValueChange={handleYearChange}
          >
              <SelectTrigger className="w-[120px]">
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
      <Card>
        <CardContent className="p-2 md:p-6">
          <Calendar
            month={selectedDate}
            onMonthChange={setSelectedDate}
            modifiers={{ 
                saturday: (date) => getDay(date) === 6,
                sunday: (date) => getDay(date) === 0,
                holiday: monthlyData.holidays,
                logged: Object.keys(monthlyData.loggedDays).map(day => {
                    return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), parseInt(day))
                })
            }}
            modifiersClassNames={{
              saturday: 'text-muted-foreground/50',
              sunday: 'text-muted-foreground/50',
              holiday: 'bg-green-200 dark:bg-green-800 rounded-md',
              logged: 'border border-primary rounded-md'
            }}
            components={{
              DayContent,
            }}
            classNames={{
                day: "h-20 w-full text-base p-1",
                cell: "p-0",
                head_cell: "w-full",
                row: "w-full flex mt-0",
                months: "w-full",
                month: "w-full space-y-2",
                caption_label: "text-lg font-bold"
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
