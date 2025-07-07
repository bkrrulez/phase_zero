
'use client';

import * as React from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useHolidays } from '../../contexts/HolidaysContext';
import { useMembers } from '../../contexts/MembersContext';
import { currentUser } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Check, X } from 'lucide-react';

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

export function HolidayRequestsTab() {
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
