
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type TimeEntry } from '@/lib/mock-data';
import { format } from 'date-fns';

interface DayDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  date: Date;
  entries: TimeEntry[];
}

export function DayDetailsDialog({ isOpen, onOpenChange, date, entries }: DayDetailsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Time Entries for {format(date, 'PPP')}</DialogTitle>
          <DialogDescription>
            A detailed breakdown of manually logged hours for this day.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Start Time</TableHead>
                        <TableHead>End Time</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Task</TableHead>
                        <TableHead>Remarks</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {entries.length > 0 ? entries.map(entry => {
                        const [project, ...taskParts] = entry.task.split(' - ');
                        const task = taskParts.join(' - ');
                        return (
                            <TableRow key={entry.id}>
                                <TableCell>{entry.startTime}</TableCell>
                                <TableCell>{entry.endTime}</TableCell>
                                <TableCell>{project || 'N/A'}</TableCell>
                                <TableCell>{task || 'N/A'}</TableCell>
                                <TableCell className="max-w-[200px] truncate">{entry.remarks || '-'}</TableCell>
                            </TableRow>
                        )
                    }) : (
                         <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">No manual time entries for this day.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
