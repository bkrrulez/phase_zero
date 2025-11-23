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
            <DialogContent className="max-w-6xl flex flex-col h-[90vh]">
                <DialogHeader>
                    <DialogTitle>{t('referenceTableTitle', { name: table.name })}</DialogTitle>
                    <DialogDescription>
                        {t('referenceTableDesc')}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 relative border rounded-lg overflow-auto">
                  <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                              {headers.map((header, index) => (
                                  <TableHead key={`${header}-${index}`} className="whitespace-nowrap">{header}</TableHead>
                              ))}
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {bodyRows.map((row, rowIndex) => (
                              <TableRow key={rowIndex}>
                                  {Array.isArray(row) && (row as string[]).map((cell, cellIndex) => (
                                      <TableCell key={`${rowIndex}-${cellIndex}`} className="align-top whitespace-nowrap">
                                          <LatexRenderer text={String(cell ?? '')} />
                                      </TableCell>
                                  ))}
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
