
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
import { useLanguage } from '../../contexts/LanguageContext';
import { LatexRenderer } from './latex-renderer';
import { Button } from '@/components/ui/button';

interface ReferenceTableDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  table: ReferenceTable | null;
}

// Helper to render cell content with links
const renderCellWithLinks = (text: string, tables: ReferenceTable[], onClick: (tableName: string) => void, entryId: string) => {
    if (!text || !tables || tables.length === 0) {
        return <LatexRenderer text={text} />;
    }

    const tableNames = tables.map(t => t.name);
    // Create a regex that finds any of the table names
    const regex = new RegExp(`(${tableNames.join('|')})`, 'g');
    const parts = text.split(regex);

    return (
        <div className="whitespace-normal">
            {parts.filter(part => part).map((part, index) => {
                const isTableName = tableNames.includes(part);
                if (isTableName) {
                    return (
                        <Button
                            key={`${entryId}-ref-${part}-${index}`}
                            variant="link"
                            className="p-0 h-auto text-left whitespace-nowrap"
                            onClick={() => onClick(part)}
                        >
                            {part}
                        </Button>
                    );
                }
                return <span key={`${entryId}-text-${part}-${index}`}>{part}</span>;
            })}
        </div>
    );
};


export function ReferenceTableDialog({ isOpen, onOpenChange, table }: ReferenceTableDialogProps) {
    const { t } = useLanguage();
    if (!table) return null;

    const tableData = Array.isArray(table.data) ? table.data : [];
    const headers = (tableData.length > 0 && Array.isArray(tableData[0])) ? tableData[0] : [];
    const bodyRows = tableData.slice(1);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
             <DialogContent className="w-full max-w-4xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>{t('referenceTableTitle', { name: table.name })}</DialogTitle>
                    <DialogDescription>
                        {t('referenceTableDesc')}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-x-auto border-t">
                    <div className="h-full overflow-y-auto">
                        <Table className="min-w-full">
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow>
                                    {headers.map((header, index) => (
                                        <TableHead key={`${header}-${index}`} className="whitespace-nowrap">
                                            {header}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bodyRows.map((row, rowIndex) => (
                                    <TableRow key={rowIndex}>
                                        {Array.isArray(row) && (row as string[]).map((cell, cellIndex) => (
                                            <TableCell key={`${rowIndex}-${cellIndex}`} className="align-top">
                                                <LatexRenderer text={String(cell ?? '')} />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
