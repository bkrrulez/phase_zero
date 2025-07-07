
"use client";

import * as React from "react";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useTimeTracking } from "../contexts/TimeTrackingContext";
import { useAuth } from "../contexts/AuthContext";
import { getDate, getDaysInMonth, isSameMonth } from "date-fns";

const chartConfig = {
  hours: {
    label: "Hours",
    color: "hsl(var(--primary))",
  },
};

export function MonthlyHoursChart() {
  const { timeEntries } = useTimeTracking();
  const { currentUser } = useAuth();

  const chartData = React.useMemo(() => {
    if (!currentUser) return [];

    const today = new Date();
    const daysInMonth = getDaysInMonth(today);

    // Create an array for each day of the current month, initialized to 0 hours.
    const dailyTotals = Array.from({ length: daysInMonth }, (_, i) => ({
        date: (i + 1).toString(),
        hours: 0,
    }));

    // Get time entries for the current user for the current month
    const userTimeEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entry.userId === currentUser.id && isSameMonth(entryDate, today);
    });

    // Aggregate hours for each day
    userTimeEntries.forEach(entry => {
        const dayOfMonth = getDate(new Date(entry.date));
        if (dailyTotals[dayOfMonth - 1]) {
          dailyTotals[dayOfMonth - 1].hours += entry.duration;
        }
    });
    
    // Format to 2 decimal places
    return dailyTotals.map(d => ({...d, hours: parseFloat(d.hours.toFixed(2))}));

  }, [timeEntries, currentUser]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Hours</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <RechartsBarChart
            data={chartData}
            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
            accessibilityLayer
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              unit="h"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <Tooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar dataKey="hours" fill="var(--color-hours)" radius={4} />
          </RechartsBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
