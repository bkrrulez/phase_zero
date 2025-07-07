
"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { currentUser, teamMembers, timeEntries } from "@/lib/mock-data";

export function TeamDashboard() {
  const teamPerformance = useMemo(() => {
    const visibleMembers = teamMembers.filter(member => {
        if (currentUser.role === 'Super Admin') {
            return member.id !== currentUser.id;
        }
        if (currentUser.role === 'Team Lead') {
            return member.reportsTo === currentUser.id;
        }
        return false;
    });
    
    return visibleMembers.map(member => {
      const userTimeEntries = timeEntries.filter(entry => entry.userId === member.id);
      const totalHours = userTimeEntries.reduce((acc, entry) => acc + entry.duration, 0);
      const workDaysSoFar = new Set(userTimeEntries.map(e => new Date(e.date).getDate())).size;
      const expectedHours = (member.contract.weeklyHours / 5) * workDaysSoFar;
      const performance = totalHours - expectedHours;
      return {
        ...member,
        totalHours,
        expectedHours,
        performance,
      }
    });
  }, []);

  const usersWithOvertime = teamPerformance
    .filter(u => u.performance > 0)
    .sort((a, b) => b.performance - a.performance);
  
  const usersWithDeficit = teamPerformance
    .filter(u => u.performance < 0)
    .sort((a, b) => a.performance - b.performance);
  
  const totalTeamHours = teamPerformance.reduce((acc, member) => acc + member.totalHours, 0);
  const totalExpectedHours = teamPerformance.reduce((acc, member) => acc + member.expectedHours, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Team Dashboard</h1>
        <p className="text-muted-foreground">An overview of your team's performance this month.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Number of active members</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">{teamPerformance.length}</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Total Hours Logged</CardTitle>
                <CardDescription>Across the whole team this month</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">{totalTeamHours.toFixed(2)}h</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle>Total Expected Hours</CardTitle>
                <CardDescription>Across the whole team this month</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">{totalExpectedHours.toFixed(2)}h</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Team Performance</CardTitle>
                <CardDescription>Overall overtime/deficit</CardDescription>
            </CardHeader>
            <CardContent>
                <p className={`text-3xl font-bold ${(totalTeamHours - totalExpectedHours) < 0 ? 'text-destructive' : ''}`}>
                    { (totalTeamHours - totalExpectedHours) >= 0 ? '+' : '' }
                    {(totalTeamHours - totalExpectedHours).toFixed(2)}h
                </p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUp className="w-5 h-5 text-green-600" /> Users with Overtime
            </CardTitle>
            <CardDescription>Team members who have logged more hours than expected.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead className="text-right">Overtime</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {usersWithOvertime.length > 0 ? usersWithOvertime.map(user => (
                        <TableRow key={user.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-9 h-9">
                                        <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person avatar"/>
                                        <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{user.name}</p>
                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-600">+{user.performance.toFixed(2)}h</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={2} className="h-24 text-center">No users with overtime.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDown className="w-5 h-5 text-destructive" /> Users with Deficit
            </CardTitle>
            <CardDescription>Team members who have logged fewer hours than expected.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead className="text-right">Deficit</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {usersWithDeficit.length > 0 ? usersWithDeficit.map(user => (
                        <TableRow key={user.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-9 h-9">
                                        <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person avatar"/>
                                        <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{user.name}</p>
                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-destructive">{user.performance.toFixed(2)}h</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={2} className="h-24 text-center">No users with a deficit.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
