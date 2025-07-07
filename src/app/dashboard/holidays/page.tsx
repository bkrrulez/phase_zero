
'use client';

import * as React from 'react';
import { PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { currentUser, type User } from "@/lib/mock-data";
import { format, differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useHolidays } from '../contexts/HolidaysContext';
import { RequestHolidayDialog } from './components/request-holiday-dialog';

const getStatusVariant = (status: "Pending" | "Approved" | "Rejected"): "secondary" | "default" | "destructive" => {
    switch (status) {
        case "Approved":
            return "default";
        case "Pending":
            return "secondary";
        case "Rejected":
            return "destructive";
    }
};

export default function HolidaysPage() {
  const { annualLeaveAllowance, holidayRequests, addHolidayRequest } = useHolidays();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = React.useState(false);

  const getProratedAllowance = React.useCallback((user: User) => {
    const { startDate, endDate } = user.contract;
    if (!endDate) {
        return annualLeaveAllowance;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    const contractDuration = differenceInCalendarDays(end, start) + 1;
    // Prorate based on a 365-day year.
    const prorated = (annualLeaveAllowance / 365) * contractDuration;
    return Math.round(prorated * 2) / 2; // Round to nearest 0.5
  }, [annualLeaveAllowance]);

  const userAllowance = getProratedAllowance(currentUser);
  const userHolidayRequests = holidayRequests.filter(req => req.userId === currentUser.id);

  const getDurationInDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    // +1 to include both start and end dates
    return differenceInCalendarDays(end, start) + 1;
  }
  
  const getDurationText = (days: number) => {
      return days === 1 ? '1 day' : `${days} days`;
  }

  const takenDays = userHolidayRequests
    .filter(req => req.status === 'Approved')
    .reduce((acc, req) => acc + getDurationInDays(req.startDate, req.endDate), 0);

  const remainingDays = userAllowance - takenDays;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Holidays</h1>
            <p className="text-muted-foreground">Manage your holiday requests and allowance.</p>
          </div>
          <Button onClick={() => setIsRequestDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Request Holiday
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader>
                    <CardTitle>Total Allowance</CardTitle>
                    <CardDescription>Based on your contract</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">{getDurationText(userAllowance)}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Taken</CardTitle>
                    <CardDescription>This year</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">{getDurationText(takenDays)}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Remaining</CardTitle>
                    <CardDescription>This year</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">{getDurationText(remainingDays)}</p>
                </CardContent>
            </Card>
        </div>
        <Card>
          <CardHeader>
              <CardTitle>My Requests</CardTitle>
              <CardDescription>A list of your submitted holiday requests.</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Dates</TableHead>
                          <TableHead className="hidden sm:table-cell">Duration</TableHead>
                          <TableHead>Status</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {userHolidayRequests.map(req => (
                          <TableRow key={req.id}>
                             <TableCell className="font-medium">
                                  {format(new Date(req.startDate), 'LLL dd, y')} - {format(new Date(req.endDate), 'LLL dd, y')}
                             </TableCell>
                             <TableCell className="hidden sm:table-cell">
                                 {getDurationText(getDurationInDays(req.startDate, req.endDate))}
                             </TableCell>
                             <TableCell>
                                  <Badge variant={getStatusVariant(req.status)} className={cn(getStatusVariant(req.status) === 'default' && 'bg-green-600')}>{req.status}</Badge>
                             </TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
          </CardContent>
        </Card>
      </div>
      <RequestHolidayDialog 
        isOpen={isRequestDialogOpen}
        onOpenChange={setIsRequestDialogOpen}
        onSave={(data) => {
            if (data.date.from && data.date.to) {
                addHolidayRequest({
                    startDate: data.date.from.toISOString(),
                    endDate: data.date.to.toISOString(),
                });
                setIsRequestDialogOpen(false);
            }
        }}
      />
    </>
  )
}
