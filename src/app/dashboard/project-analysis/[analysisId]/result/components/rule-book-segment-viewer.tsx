
'use client';

import * as React from 'react';
import { getSegmentDetails } from '@/app/dashboard/project-analysis/rule-analysis/actions';
import { type RuleBookEntry, type ReferenceTable } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/app/dashboard/contexts/LanguageContext';
import { LatexRenderer } from '@/app/dashboard/rule-books/components/latex-renderer';
import { Button } from '@/components/ui/button';
import { ReferenceTableDialog } from '@/app/dashboard/rule-books/components/reference-table-dialog';
import { cn } from '@/lib/utils';

interface SegmentDetails {
    entries: RuleBookEntry[];
    referenceTables: ReferenceTable[];
}

interface ViewerProps {
    projectAnalysisId: string;
    ruleBookId: string;
    segmentKey: string;
    highlightEntryId?: string;
}

interface ViewerDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    viewerProps: ViewerProps | null;
}

export function RuleBookSegmentViewer({ isOpen, onOpenChange, viewerProps }: ViewerDialogProps) {
    const { t } = useLanguage();
    const [details, setDetails] = React.useState<SegmentDetails | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [selectedTable, setSelectedTable] = React.useState<ReferenceTable | null>(null);
    const highlightRef = React.useRef<HTMLTableRowElement>(null);

    const { projectAnalysisId, ruleBookId, segmentKey, highlightEntryId } = viewerProps || {};

    React.useEffect(() => {
        if (isOpen && projectAnalysisId && ruleBookId && segmentKey) {
            const fetchDetails = async () => {
                setLoading(true);
                try {
                    const data = await getSegmentDetails({ projectAnalysisId, ruleBookId, segmentKey });
                    setDetails(data);
                } catch (err) {
                    console.error(err);
                    setError('Failed to load segment details.');
                } finally {
                    setLoading(false);
                }
            };
            fetchDetails();
        }
    }, [isOpen, projectAnalysisId, ruleBookId, segmentKey]);

    React.useEffect(() => {
        if (!loading && highlightRef.current) {
            highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [loading]);
    
    const handleOpenReferenceTable = (tableName: string) => {
        const table = details?.referenceTables.find((t) => t.name === tableName);
        if (table) setSelectedTable(table);
    };

    const renderCellWithLinks = (text: string, tables: ReferenceTable[], onClick: (tableName: string) => void, entryId: string) => {
        if (!text || !tables || tables.length === 0) {
            return <LatexRenderer text={text} />;
        }
        const tableNames = tables.map(t => t.name);
        const regex = new RegExp(`(${tableNames.join('|')})`, 'g');
        const parts = text.split(regex);

        return (
            <div className="whitespace-normal">
                {parts.filter(part => part).map((part, index) => {
                    const isTableName = tableNames.includes(part);
                    if (isTableName) {
                        return (
                            <Button key={`${entryId}-ref-${part}-${index}`} variant="link" className="p-0 h-auto text-left" onClick={() => onClick(part)}>
                                {part}
                            </Button>
                        );
                    }
                    return <span key={`${entryId}-text-${part}-${index}`}>{part}</span>;
                })}
            </div>
        );
    };

    const headers = details?.entries.length ? Object.keys(details.entries[0].data) : [];
    const columnOrder = ['Gliederung', 'Text', 'Referenztabelle'];
    const sortedHeaders = [...headers].sort((a,b) => {
        const indexA = columnOrder.indexOf(a);
        const indexB = columnOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    return (
        <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-screen-2xl w-[95vw] h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2 shrink-0">
                    <DialogTitle>Rule Book Section: {segmentKey}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-x-auto border-t">
                    <div className="min-w-max h-full overflow-y-auto">
                        {loading ? (
                            <Skeleton className="h-full w-full" />
                        ) : error ? (
                            <div className="text-destructive p-4">{error}</div>
                        ) : (
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10">
                                    <TableRow>
                                        {sortedHeaders.map(header => <TableHead key={header}>{t(header as any) || header}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {details?.entries.map(entry => (
                                        <TableRow 
                                            key={entry.id} 
                                            ref={entry.id === highlightEntryId ? highlightRef : null}
                                            className={cn(entry.id === highlightEntryId && 'bg-blue-100 dark:bg-blue-900/50')}
                                        >
                                            {sortedHeaders.map(header => (
                                                <TableCell key={header}>
                                                    {header === 'Referenztabelle'
                                                        ? renderCellWithLinks(String(entry.data[header] ?? ''), details.referenceTables, handleOpenReferenceTable, entry.id)
                                                        : <LatexRenderer text={String(entry.data[header] ?? '')} />
                                                    }
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
        <ReferenceTableDialog
            isOpen={!!selectedTable}
            onOpenChange={() => setSelectedTable(null)}
            table={selectedTable}
        />
        </>
    );
}

