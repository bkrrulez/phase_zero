
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
import { cn } from '@/lib/utils';

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
             <DialogContent
              className="max-w-screen-2xl w-[95vw] h-[90vh] flex flex-col p-0"
            >
              <DialogHeader className="p-6 pb-2 shrink-0">
                <DialogTitle>{t('referenceTableTitle', { name: table.name })}</DialogTitle>
                <DialogDescription>
                  {t('referenceTableDesc')}
                </DialogDescription>
              </DialogHeader>

              {/* Horizontal scrollbar always visible */}
              <div className="flex-1 overflow-x-auto border-t">
                {/* Vertical scrolling for content */}
                <div className="min-w-max h-full overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        {headers.map((header, index) => (
                          <TableHead key={index} className={cn("whitespace-nowrap", index === 0 ? "w-[300px]" : "")}>
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bodyRows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {Array.isArray(row) &&
                            row.map((cell, cellIndex) => (
                              <TableCell
                                key={`${rowIndex}-${cellIndex}`}
                                className="align-top whitespace-nowrap"
                              >
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
