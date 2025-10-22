

'use client';

import * as React from 'react';
import Link from 'next/link';
import { Minus, Plus } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type DetailedReportData } from '../page';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTeams } from '../../contexts/TeamsContext';

interface DetailedReportProps {
  data: DetailedReportData[];
}

export function DetailedReport({ data }: DetailedReportProps) {
  const { t } = useLanguage();
  const { teams } = useTeams();
  const [openStates, setOpenStates] = React.useState<Record<string, boolean>>({});

  const toggleOpen = (id: string) => {
    setOpenStates(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const setAllOpen = (isOpen: boolean) => {
    const newStates: Record<string, boolean> = {};
    data.forEach(userRow => {
      newStates[userRow.user.id] = isOpen;
      userRow.projects.forEach(projectRow => {
        newStates[`${userRow.user.id}-${projectRow.name}`] = isOpen;
      });
    });
    setOpenStates(newStates);
  };
  
  const getTeamName = (teamId?: string) => {
    if (!teamId) return 'N/A';
    const team = teams.find(t => t.id === teamId);
    return team?.name ?? 'N/A';
  };


  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setAllOpen(true)}>{t('expandAll')}</Button>
        <Button variant="outline" size="sm" onClick={() => setAllOpen(false)}>{t('collapseAll')}</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>{t('member')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('role')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('team')}</TableHead>
            <TableHead className="text-right">{t('assignedHours')}</TableHead>
            <TableHead className="text-right">{t('leaveHours')}</TableHead>
            <TableHead className="text-right">{t('expected')}</TableHead>
            <TableHead className="text-right">{t('logged')}</TableHead>
            <TableHead className="text-right">{t('remaining')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? data.map(userRow => {
            const isUserOpen = openStates[userRow.user.id] ?? false;
            return (
              <React.Fragment key={userRow.user.id}>
                <TableRow className="bg-muted/50 border-b">
                  <TableCell>
                      <Button variant="ghost" size="sm" className="w-9 p-0" onClick={() => toggleOpen(userRow.user.id)}>
                          {isUserOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          <span className="sr-only">Toggle</span>
                      </Button>
                  </TableCell>
                  <TableCell>
                      <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10"><AvatarImage src={userRow.user.avatar} alt={userRow.user.name} data-ai-hint="person avatar"/><AvatarFallback>{userRow.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                      <div><Link href={`/dashboard/reports?tab=individual-report&userId=${userRow.user.id}`} className="font-medium hover:underline">{userRow.user.name}</Link><p className="text-sm text-muted-foreground hidden sm:table-cell">{userRow.user.email}</p></div>
                      </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant={userRow.user.role === 'Team Lead' || userRow.user.role === 'Super Admin' ? "default" : "secondary"}>{userRow.user.role}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell">{getTeamName(userRow.user.teamId)}</TableCell>
                  <TableCell className="text-right font-mono">{userRow.assignedHours.toFixed(2)}h</TableCell>
                  <TableCell className="text-right font-mono">{userRow.leaveHours.toFixed(2)}h</TableCell>
                  <TableCell className="text-right font-mono">{userRow.expectedHours.toFixed(2)}h</TableCell>
                  <TableCell className="text-right font-mono">{userRow.loggedHours.toFixed(2)}h</TableCell>
                  <TableCell className={`text-right font-mono ${userRow.remainingHours < 0 ? 'text-green-600' : ''}`}>{userRow.remainingHours.toFixed(2)}h</TableCell>
                </TableRow>
                {isUserOpen && userRow.projects.map(projectRow => {
                    return (
                        <React.Fragment key={`${userRow.user.id}-${projectRow.name}`}>
                            <TableRow>
                                <TableCell></TableCell>
                                <TableCell className="pl-12 font-medium">Project - {projectRow.name}</TableCell>
                                <TableCell className="hidden md:table-cell"></TableCell>
                                <TableCell className="hidden md:table-cell"></TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right font-mono">{projectRow.loggedHours.toFixed(2)}h</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </React.Fragment>
                    )
                })}
              </React.Fragment>
            )
          }) : (
            <TableRow>
              <TableCell colSpan={9} className="text-center h-24">{t('noTeamMembers')}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
