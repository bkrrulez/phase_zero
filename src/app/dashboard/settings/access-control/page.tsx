
'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { type FreezeRule } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { FreezeCalendarDialog, type FreezeFormSubmitData } from './components/freeze-calendar-dialog';
import { useAccessControl } from '../../contexts/AccessControlContext';
import { useTeams } from '../../contexts/TeamsContext';
import { useAuth } from '../../contexts/AuthContext';

export default function AccessControlPage() {
  const { toast } = useToast();
  const { freezeRules, addFreezeRule, removeFreezeRule } = useAccessControl();
  const { teams } = useTeams();
  const { currentUser } = useAuth();
  const [isFreezeDialogOpen, setIsFreezeDialogOpen] = React.useState(false);
  const [unfreezingRule, setUnfreezingRule] = React.useState<FreezeRule | null>(null);

  const canManage = currentUser.role === 'Super Admin' || currentUser.role === 'Team Lead';

  const getTeamName = (teamId: string) => {
    if (teamId === 'all-teams') return 'All Teams';
    return teams.find(t => t.id === teamId)?.name || 'Unknown Team';
  };

  const handleFreeze = (data: FreezeFormSubmitData) => {
    const teamName = getTeamName(data.teamId);
    
    const newRuleData: Omit<FreezeRule, 'id'> = {
        teamId: data.teamId,
        startDate: format(data.startDate, 'yyyy-MM-dd'),
        endDate: format(data.endDate, 'yyyy-MM-dd'),
        recurringDay: data.recurringDay
    };

    addFreezeRule(newRuleData);
    setIsFreezeDialogOpen(false);
    toast({
        title: 'Calendar Frozen',
        description: `Calendar has been frozen for ${teamName}.`,
    });
  };

  const handleUnfreeze = (rule: FreezeRule) => {
    const teamName = getTeamName(rule.teamId);
    removeFreezeRule(rule, teamName);
    setUnfreezingRule(null);
    toast({
      title: 'Calendar Unfrozen',
      description: 'The selected freeze rule has been removed.',
    });
  };
  
  if (!canManage) {
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
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Access Control</h1>
            <p className="text-muted-foreground">Freeze calendars to prevent time entry modifications.</p>
          </div>
          <Button onClick={() => setIsFreezeDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Freeze Calendar
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Active Freeze Rules</CardTitle>
            <CardDescription>A list of all currently active calendar freeze rules.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teams</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {freezeRules.length > 0 ? (
                  freezeRules.map(rule => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{getTeamName(rule.teamId)}</TableCell>
                      <TableCell>{(rule.recurringDay !== undefined && rule.recurringDay !== null) ? 'Recurring' : format(new Date(rule.startDate), 'PP')}</TableCell>
                      <TableCell>{format(new Date(rule.endDate), 'PP')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setUnfreezingRule(rule)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Unfreeze
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No calendar freeze rules are currently active.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <FreezeCalendarDialog
        isOpen={isFreezeDialogOpen}
        onOpenChange={setIsFreezeDialogOpen}
        onSave={handleFreeze}
      />

      <AlertDialog open={!!unfreezingRule} onOpenChange={(isOpen) => !isOpen && setUnfreezingRule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unfreeze the calendar for "{getTeamName(unfreezingRule?.teamId || '')}" for the selected period.
              Users will be able to add or edit time entries again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleUnfreeze(unfreezingRule!)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
