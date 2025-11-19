
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
import { useLanguage } from '../../contexts/LanguageContext';
import { LatexRenderer } from './latex-renderer';

interface ReferenceTableDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  table: ReferenceTable | null;
}

export function ReferenceTableDialog({ isOpen, onOpenChange, table }: ReferenceTableDialogProps) {
    const { t } = useLanguage();
    if (!table) return null;

    const tableData = Array.isArray(table.data) ? table.data : [];
    const headers = (tableData.length > 0 && Array.isArray(tableData[0])) ? tableData[0] : [];
    const bodyRows = tableData.slice(1);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{t('referenceTableTitle', { name: table.name })}</DialogTitle>
                    <DialogDescription>
                        {t('referenceTableDesc')}
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
                            {bodyRows.map((row, rowIndex) => (
                                <TableRow key={rowIndex}>
                                    {Array.isArray(row) && (row as string[]).map((cell, cellIndex) => (
                                        <TableCell key={`${rowIndex}-${cellIndex}`} className="max-w-[200px] break-words align-top">
                                            <LatexRenderer text={String(cell ?? '')} />
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
