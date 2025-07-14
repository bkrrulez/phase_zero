
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { type DetailedReportData } from '../page';
import { cn } from '@/lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

interface DetailedReportProps {
  data: DetailedReportData[];
}

export function DetailedReport({ data }: DetailedReportProps) {
  const { t } = useLanguage();
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
            <TableHead className="text-right">{t('assignedHours')}</TableHead>
            <TableHead className="text-right">{t('leaveHours')}</TableHead>
            <TableHead className="text-right">{t('expected')}</TableHead>
            <TableHead className="text-right">{t('logged')}</TableHead>
            <TableHead className="text-right">{t('remaining')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? data.map(userRow => (
            <Collapsible asChild key={userRow.user.id} open={openStates[userRow.user.id] ?? false} onOpenChange={() => toggleOpen(userRow.user.id)}>
              <>
                <TableRow className="bg-muted/50">
                  <TableCell>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-9 p-0">
                        {openStates[userRow.user.id] ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        <span className="sr-only">Toggle</span>
                      </Button>
                    </CollapsibleTrigger>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10"><AvatarImage src={userRow.user.avatar} alt={userRow.user.name} data-ai-hint="person avatar"/><AvatarFallback>{userRow.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                      <div><Link href={`/dashboard/reports?tab=individual-report&userId=${userRow.user.id}`} className="font-medium hover:underline">{userRow.user.name}</Link><p className="text-sm text-muted-foreground hidden sm:table-cell">{userRow.user.email}</p></div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant={userRow.user.role === 'Team Lead' || userRow.user.role === 'Super Admin' ? "default" : "secondary"}>{userRow.user.role}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{userRow.assignedHours.toFixed(2)}h</TableCell>
                  <TableCell className="text-right font-mono">{userRow.leaveHours.toFixed(2)}h</TableCell>
                  <TableCell className="text-right font-mono">{userRow.expectedHours.toFixed(2)}h</TableCell>
                  <TableCell className="text-right font-mono">{userRow.loggedHours.toFixed(2)}h</TableCell>
                  <TableCell className={`text-right font-mono ${userRow.remainingHours < 0 ? 'text-destructive' : ''}`}>{userRow.remainingHours.toFixed(2)}h</TableCell>
                </TableRow>
                <CollapsibleContent asChild>
                  <>
                    {userRow.projects.map(projectRow => (
                      <Collapsible asChild key={`${userRow.user.id}-${projectRow.name}`} open={openStates[`${userRow.user.id}-${projectRow.name}`] ?? false} onOpenChange={() => toggleOpen(`${userRow.user.id}-${projectRow.name}`)}>
                        <>
                          <TableRow>
                            <TableCell></TableCell>
                            <TableCell colSpan={4} className="p-0">
                                <CollapsibleTrigger asChild>
                                    <div className="flex items-center pl-4 h-full">
                                        <Button variant="ghost" size="sm" className="w-9 p-0">
                                            {openStates[`${userRow.user.id}-${projectRow.name}`] ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                            <span className="sr-only">Toggle</span>
                                        </Button>
                                        <span className="pl-6 font-medium">{projectRow.name}</span>
                                    </div>
                                </CollapsibleTrigger>
                            </TableCell>
                            <TableCell className="text-right font-mono">{projectRow.loggedHours.toFixed(2)}h</TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                          <CollapsibleContent asChild>
                            <>
                              {projectRow.tasks.map(taskRow => (
                                <TableRow key={`${userRow.user.id}-${projectRow.name}-${taskRow.name}`} className="bg-muted/20">
                                  <TableCell colSpan={5}></TableCell>
                                  <TableCell className="pl-20 text-muted-foreground">{taskRow.name}</TableCell>
                                  <TableCell className="text-right font-mono text-muted-foreground">{taskRow.loggedHours.toFixed(2)}h</TableCell>
                                  <TableCell></TableCell>
                                </TableRow>
                              ))}
                            </>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    ))}
                  </>
                </CollapsibleContent>
              </>
            </Collapsible>
          )) : (
            <TableRow>
              <TableCell colSpan={8} className="text-center h-24">{t('noTeamMembers')}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

