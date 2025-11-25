
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
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SegmentDetails {
    entries: RuleBookEntry[];
}

export interface ViewerProps {
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
    
    const headers = ['Structure', 'Text', 'Project Checklist', 'Project-based Fulfillability'];
    
    const checklistOptions = [
        { key: 'fulfilled', value: 'Fulfilled' },
        { key: 'notFulfilled', value: 'Not Fulfilled' },
        { key: 'notRelevant', value: 'Not relevant' },
        { key: 'notVerifiable', value: 'Not verifiable' },
    ];
    const fulfillabilityOptions = ['Light', 'Medium', 'Heavy'];

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-screen-2xl w-[95vw] h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2 shrink-0">
                    <DialogTitle>{t('ruleAnalysisSectionTitle', { key: segmentKey || '' })}</DialogTitle>
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
                                        {headers.map(header => <TableHead key={header}>{t(header as any) || header}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {details?.entries.map(entry => (
                                        <TableRow 
                                            key={entry.id} 
                                            ref={entry.id === highlightEntryId ? highlightRef : null}
                                            className={cn(entry.id === highlightEntryId && 'bg-blue-100 dark:bg-blue-900/50')}
                                        >
                                            <TableCell><LatexRenderer text={String(entry.data['Gliederung'] ?? '')} /></TableCell>
                                            <TableCell><LatexRenderer text={String(entry.data['Text'] ?? '')} /></TableCell>
                                            <TableCell>
                                                {entry.data['Spaltentyp'] === 'Parameter' ? (
                                                    <Select value={entry.analysis?.checklistStatus || ''}>
                                                        <SelectTrigger><SelectValue placeholder={t('selectPlaceholder')} /></SelectTrigger>
                                                        <SelectContent>
                                                            {checklistOptions.map(opt => <SelectItem key={opt.key} value={opt.value}>{t(opt.key as any)}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                ) : <span className="text-muted-foreground">-</span>}
                                            </TableCell>
                                            <TableCell>
                                                {['Not Fulfilled', 'Not verifiable'].includes(entry.analysis?.checklistStatus || '') ? (
                                                     <Select value={entry.analysis?.revisedFulfillability || ''}>
                                                        <SelectTrigger><SelectValue placeholder={t('selectPlaceholder')} /></SelectTrigger>
                                                        <SelectContent>
                                                            {fulfillabilityOptions.map(opt => <SelectItem key={opt} value={opt}>{t(opt as any)}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                ) : <span className="text-muted-foreground">-</span>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
