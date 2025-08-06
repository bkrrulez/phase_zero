
'use client';

import * as React from 'react';
import { useMemo } from 'react';
import { differenceInDays, getDaysInYear, isWithinInterval, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type Project, type TimeEntry } from '@/lib/types';
import { useLanguage } from '../../contexts/LanguageContext';

interface ProjectReportProps {
  projects: Project[];
  timeEntries: TimeEntry[];
  periodType: 'custom' | 'weekly' | 'monthly' | 'yearly';
  selectedYear: number;
  selectedMonth: number;
  selectedWeekIndex: number;
  weeksInMonth: { start: Date; end: Date }[];
  customDateRange?: { from?: Date; to?: Date };
}

export function ProjectReport({ 
    projects, 
    timeEntries, 
    periodType, 
    selectedYear, 
    selectedMonth, 
    selectedWeekIndex, 
    weeksInMonth, 
    customDateRange
}: ProjectReportProps) {
  const { t } = useLanguage();

  const reportData = useMemo(() => {
    let periodStart: Date;
    let periodEnd: Date;
    
    if (periodType === 'custom' && customDateRange?.from && customDateRange.to) {
        periodStart = customDateRange.from;
        periodEnd = customDateRange.to;
    } else if (periodType === 'weekly') {
        const week = weeksInMonth[selectedWeekIndex];
        periodStart = week.start;
        periodEnd = week.end;
    } else if (periodType === 'monthly') {
        periodStart = new Date(selectedYear, selectedMonth, 1);
        periodEnd = new Date(selectedYear, selectedMonth + 1, 0);
    } else { // yearly
        periodStart = new Date(selectedYear, 0, 1);
        periodEnd = new Date(selectedYear, 11, 31);
    }

    const filteredEntries = timeEntries.filter(entry => {
        const entryDate = parseISO(entry.date);
        return isWithinInterval(entryDate, { start: periodStart, end: periodEnd });
    });

    return projects.map(project => {
        const actualHours = filteredEntries
            .filter(entry => entry.task.startsWith(project.name))
            .reduce((acc, entry) => acc + entry.duration, 0);
        
        let intendedHours = 0;
        if (project.hoursPerYear) {
            const daysInPeriod = differenceInDays(periodEnd, periodStart) + 1;
            const daysInYear = getDaysInYear(new Date(selectedYear, 0, 1));
            intendedHours = (project.hoursPerYear / daysInYear) * daysInPeriod;
        }

        return {
            ...project,
            intendedHours: parseFloat(intendedHours.toFixed(2)),
            actualHours: parseFloat(actualHours.toFixed(2)),
        }
    });

  }, [projects, timeEntries, periodType, selectedYear, selectedMonth, selectedWeekIndex, weeksInMonth, customDateRange]);

  return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('project')}</TableHead>
            <TableHead className="text-right">{t('intendedHours')}</TableHead>
            <TableHead className="text-right">{t('actualHours')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reportData.map(project => (
            <TableRow key={project.id}>
              <TableCell className="font-medium">{project.name}</TableCell>
              <TableCell className="text-right font-mono">
                {project.intendedHours > 0 ? `${project.intendedHours.toFixed(2)}h` : 'N/A'}
              </TableCell>
              <TableCell className="text-right font-mono">
                {project.actualHours.toFixed(2)}h
              </TableCell>
            </TableRow>
          ))}
          {reportData.length === 0 && (
              <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">{t('noProjectsCreated')}</TableCell>
              </TableRow>
          )}
        </TableBody>
      </Table>
  );
}
