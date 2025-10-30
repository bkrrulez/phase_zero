
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type ReferenceTable } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ReferenceTableDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  table: ReferenceTable | null;
}

export function ReferenceTableDialog({ isOpen, onOpenChange, table }: ReferenceTableDialogProps) {
    if (!table) return null;

    const headers = table.data.length > 0 ? Object.keys(table.data[0]) : [];

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Reference: {table.name}</DialogTitle>
                    <DialogDescription>
                        Detailed information from the referenced table.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {headers.map(header => (
                                    <TableHead key={header} className="max-w-[200px] break-words">{header}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {table.data.map((row, rowIndex) => (
                                <TableRow key={rowIndex}>
                                    {headers.map(header => (
                                        <TableCell key={`${rowIndex}-${header}`} className="max-w-[200px] break-words align-top">
                                            {String(row[header])}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
