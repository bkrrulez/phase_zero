"use client";

import { Bar, BarChart as RechartsBarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { monthlyChartData } from "@/lib/mock-data";

const chartConfig = {
  hours: {
    label: "Hours",
    color: "hsl(var(--primary))",
  },
};

export function MonthlyHoursChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Hours</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <RechartsBarChart
            data={monthlyChartData}
            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
            accessibilityLayer
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `Day ${value}`}
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
