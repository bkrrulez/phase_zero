
'use client';

import * as React from 'react';
import { PlusCircle, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { currentUser, type User, type PublicHoliday, type CustomHoliday } from "@/lib/mock-data";
import { format, differenceInCalendarDays, addDays, isSameDay, startOfYear, endOfYear, max, min } from "date-fns";
import { cn } from "@/lib/utils";
import { useHolidays } from '../contexts/HolidaysContext';
import { useMembers } from '../contexts/MembersContext';
import { useToast } from '@/hooks/use-toast';
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

// This component is moved from team/components
function TeamRequestsTab() {
  const { toast } = useToast();
  const { holidayRequests, approveRequest, rejectRequest } = useHolidays();
  const { teamMembers } = useMembers();

  const pendingRequests = React.useMemo(() => {
    return holidayRequests.filter(req => {
      if (req.status !== 'Pending') return false;
      if (currentUser.role === 'Super Admin') return true;
      if (currentUser.role === 'Team Lead') {
        const member = teamMembers.find(m => m.id === req.userId);
        return member?.reportsTo === currentUser.id;
      }
      return false;
    });
  }, [holidayRequests, teamMembers]);

  const getMemberDetails = (userId: string) => {
    return teamMembers.find(m => m.id === userId);
  };

  const getDurationInDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return differenceInCalendarDays(end, start) + 1;
  };
  
  const handleApprove = (requestId: string) => {
    approveRequest(requestId);
    toast({ title: "Request Approved", description: "The holiday request has been approved." });
  };
  
  const handleReject = (requestId: string) => {
    rejectRequest(requestId);
    toast({ title: "Request Rejected", description: "The holiday request has been rejected.", variant: 'destructive' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Holiday Requests</CardTitle>
        <CardDescription>Review and approve or reject holiday requests from your team.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead className="hidden sm:table-cell">Duration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingRequests.length > 0 ? pendingRequests.map(req => {
              const member = getMemberDetails(req.userId);
              return (
                <TableRow key={req.id}>
                  <TableCell>
                    {member ? (
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                            <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="person avatar" />
                            <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    ) : (
                      'Unknown User'
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {format(new Date(req.startDate), 'PP')} - {format(new Date(req.endDate), 'PP')}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {getDurationInDays(req.startDate, req.endDate)} days
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                        <Button size="sm" onClick={() => handleApprove(req.id)}>
                            <Check className="mr-2 h-4 w-4" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)}>
                            <X className="mr-2 h-4 w-4" /> Reject
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            }) : (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        No pending holiday requests.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function HolidaysPage() {
  const { annualLeaveAllowance, holidayRequests, addHolidayRequest, publicHolidays, customHolidays } = useHolidays();
  const { teamMembers } = useMembers();
  const { toast } = useToast();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = React.useState(false);
  const canViewTeamRequests = currentUser.role === 'Super Admin' || currentUser.role === 'Team Lead';

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
    // Helper function to parse YYYY-MM-DD strings as local dates to avoid timezone issues.
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
  const userHolidayRequests = holidayRequests.filter(req => req.userId === currentUser.id);

  const takenDays = userHolidayRequests
    .filter(req => req.status === 'Approved')
    .reduce((acc, req) => acc + calculateDurationInWorkdays(new Date(req.startDate), new Date(req.endDate), req.userId), 0);

  const remainingDays = userAllowance - takenDays;

  const getDurationText = (days: number) => {
      const formattedDays = parseFloat(days.toFixed(2));
      return formattedDays === 1 ? '1 day' : `${formattedDays} days`;
  }
  
  const handleSaveRequest = (data: { date: { from: Date; to: Date } }) => {
    if (data.date.from && data.date.to) {
        const requestedDuration = calculateDurationInWorkdays(data.date.from, data.date.to, currentUser.id);
        
        if (requestedDuration <= 0) {
            toast({
                variant: 'destructive',
                title: 'Invalid Leave Dates',
                description: 'Your request does not contain any working days. Please select a different date range.',
            });
            return;
        }

        if (requestedDuration > remainingDays) {
            toast({
                variant: 'destructive',
                title: 'Insufficient Leave Allowance',
                description: `You are requesting ${requestedDuration} days but only have ${remainingDays.toFixed(2)} days remaining.`,
            });
            return;
        }

        addHolidayRequest({
            startDate: data.date.from.toISOString(),
            endDate: data.date.to.toISOString(),
        });
        setIsRequestDialogOpen(false);
    }
  };

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
        
        <Tabs defaultValue="my-requests" className="space-y-4">
            <TabsList className={`grid w-full ${canViewTeamRequests ? 'grid-cols-2 md:w-[400px]' : 'grid-cols-1 w-[200px]'}`}>
                <TabsTrigger value="my-requests">My Requests</TabsTrigger>
                {canViewTeamRequests && <TabsTrigger value="team-requests">Team Requests</TabsTrigger>}
            </TabsList>
            <TabsContent value="my-requests">
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
                <Card className="mt-6">
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
                                        {getDurationText(calculateDurationInWorkdays(new Date(req.startDate), new Date(req.endDate), req.userId))}
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
            </TabsContent>
            {canViewTeamRequests && (
                <TabsContent value="team-requests">
                    <TeamRequestsTab />
                </TabsContent>
            )}
        </Tabs>
      </div>
      <RequestHolidayDialog 
        isOpen={isRequestDialogOpen}
        onOpenChange={setIsRequestDialogOpen}
        onSave={handleSaveRequest}
      />
    </>
  )
}
