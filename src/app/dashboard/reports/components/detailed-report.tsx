
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
                  <TableCell className="text-right font-mono">{userRow.assignedHours.toFixed(2)}h</TableCell>
                  <TableCell className="text-right font-mono">{userRow.leaveHours.toFixed(2)}h</TableCell>
                  <TableCell className="text-right font-mono">{userRow.expectedHours.toFixed(2)}h</TableCell>
                  <TableCell className="text-right font-mono">{userRow.loggedHours.toFixed(2)}h</TableCell>
                  <TableCell className={`text-right font-mono ${userRow.remainingHours < 0 ? 'text-destructive' : ''}`}>{userRow.remainingHours.toFixed(2)}h</TableCell>
                </TableRow>
                {isUserOpen && (
                  <TableRow>
                      <TableCell colSpan={8} className="p-0">
                          <div className="p-4">
                              {userRow.projects.map(projectRow => (
                              <Collapsible asChild key={`${userRow.user.id}-${projectRow.name}`} open={openStates[`${userRow.user.id}-${projectRow.name}`] ?? false} onOpenChange={() => toggleOpen(`${userRow.user.id}-${projectRow.name}`)}>
                                  <div className='pl-6'>
                                      <div className="flex items-center">
                                          <CollapsibleTrigger asChild>
                                              <div className="flex items-center h-full">
                                                  <Button variant="ghost" size="sm" className="w-9 p-0">
                                                      {openStates[`${userRow.user.id}-${projectRow.name}`] ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                                      <span className="sr-only">Toggle</span>
                                                  </Button>
                                              </div>
                                          </CollapsibleTrigger>
                                          <Table className="w-full">
                                              <TableRow className="border-none hover:bg-transparent">
                                                  <TableCell className="font-medium">{projectRow.name}</TableCell>
                                                  <TableCell className="text-right font-mono w-[116px]">{projectRow.loggedHours.toFixed(2)}h</TableCell>
                                              </TableRow>
                                          </Table>
                                      </div>
                                      <CollapsibleContent asChild>
                                          <div className='pl-10'>
                                              <Table>
                                                  <TableBody>
                                                  {projectRow.tasks.map(taskRow => (
                                                      <TableRow key={`${userRow.user.id}-${projectRow.name}-${taskRow.name}`} className="bg-muted/20 border-none hover:bg-muted/40">
                                                      <TableCell className="text-muted-foreground">{taskRow.name}</TableCell>
                                                      <TableCell className="text-right font-mono text-muted-foreground w-[116px]">{taskRow.loggedHours.toFixed(2)}h</TableCell>
                                                      </TableRow>
                                                  ))}
                                                  </TableBody>
                                              </Table>
                                          </div>
                                      </CollapsibleContent>
                                  </div>
                              </Collapsible>
                              ))}
                          </div>
                      </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            )
          }) : (
            <TableRow>
              <TableCell colSpan={8} className="text-center h-24">{t('noTeamMembers')}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
