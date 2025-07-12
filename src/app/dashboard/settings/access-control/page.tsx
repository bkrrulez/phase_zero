
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
import { useLanguage } from '../../contexts/LanguageContext';

export default function AccessControlPage() {
  const { toast } = useToast();
  const { freezeRules, addFreezeRule, removeFreezeRule } = useAccessControl();
  const { teams } = useTeams();
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [isFreezeDialogOpen, setIsFreezeDialogOpen] = React.useState(false);
  const [unfreezingRule, setUnfreezingRule] = React.useState<FreezeRule | null>(null);

  const canManage = currentUser.role === 'Super Admin' || currentUser.role === 'Team Lead';

  const getTeamName = (teamId: string) => {
    if (teamId === 'all-teams') return t('allTeams');
    return teams.find(t => t.id === teamId)?.name || t('unknownTeam');
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
        title: t('calendarFrozen'),
        description: t('calendarFrozenDesc', { teamName }),
    });
  };

  const handleUnfreeze = (rule: FreezeRule) => {
    const teamName = getTeamName(rule.teamId);
    removeFreezeRule(rule, teamName);
    setUnfreezingRule(null);
    toast({
      title: t('calendarUnfrozen'),
      description: t('calendarUnfrozenDesc'),
    });
  };
  
  if (!canManage) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('accessDenied')}</CardTitle>
                <CardDescription>{t('noPermissionPage')}</CardDescription>
            </CardHeader>
            <CardContent>
                <p>{t('contactAdmin')}</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">{t('accessControl')}</h1>
            <p className="text-muted-foreground">{t('accessControlSubtitle')}</p>
          </div>
          <Button onClick={() => setIsFreezeDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> {t('freezeCalendar')}
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t('activeFreezeRules')}</CardTitle>
            <CardDescription>{t('activeFreezeRulesDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('teams')}</TableHead>
                  <TableHead>{t('startDate')}</TableHead>
                  <TableHead>{t('endDate')}</TableHead>
                  <TableHead className="text-right">{t('action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {freezeRules.length > 0 ? (
                  freezeRules.map(rule => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{getTeamName(rule.teamId)}</TableCell>
                      <TableCell>{(rule.recurringDay !== undefined && rule.recurringDay !== null) ? t('recurring') : format(new Date(rule.startDate), 'PP')}</TableCell>
                      <TableCell>{format(new Date(rule.endDate), 'PP')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setUnfreezingRule(rule)}>
                          <Trash2 className="mr-2 h-4 w-4" /> {t('unfreeze')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      {t('noActiveFreezeRules')}
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
            <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('unfreezeConfirmation', { teamName: getTeamName(unfreezingRule?.teamId || '') })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleUnfreeze(unfreezingRule!)}>
              {t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
