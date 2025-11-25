
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSegmentDetails, saveAnalysisResult, getOrderedSegments } from '@/app/dashboard/project-analysis/rule-analysis/actions';
import { type ProjectAnalysis, type RuleBook, type RuleBookEntry, type ReferenceTable } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '../../../../../contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LatexRenderer } from '@/app/dashboard/rule-books/components/latex-renderer';
import { ReferenceTableDialog } from '@/app/dashboard/rule-books/components/reference-table-dialog';


type AnalysisResult = {
    id: string;
    projectAnalysisId: string;
    ruleBookEntryId: string;
    checklistStatus: string;
    revisedFulfillability: string | null;
}

type EntryWithAnalysis = RuleBookEntry & { analysis?: AnalysisResult };

interface SectionDetails {
    projectAnalysis: ProjectAnalysis;
    ruleBook: RuleBook;
    segmentKey: string;
    entries: EntryWithAnalysis[];
    referenceTables: ReferenceTable[];
}

const checklistOptions = [
    { key: 'fulfilled', value: 'Fulfilled' },
    { key: 'notFulfilled', value: 'Not Fulfilled' },
    { key: 'notRelevant', value: 'Not relevant' },
    { key: 'notVerifiable', value: 'Not verifiable' },
];
const fulfillabilityOptions = ['Light', 'Medium', 'Heavy'];


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
                            className="p-0 h-auto text-left"
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


export default function SegmentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useLanguage();
    const { toast } = useToast();

    const analysisId = params.analysisId as string;
    const ruleBookId = params.ruleBookId as string;
    const segment = params.segment as string;

    const [details, setDetails] = React.useState<SectionDetails | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [analysisData, setAnalysisData] = React.useState<Record<string, { checklistStatus?: string; revisedFulfillability?: string | null }>>({});
    const [orderedSegments, setOrderedSegments] = React.useState<{ ruleBookId: string; segmentKey: string; }[]>([]);
    
    const [showNoMoreSegmentsAlert, setShowNoMoreSegmentsAlert] = React.useState(false);
    const [selectedTable, setSelectedTable] = React.useState<ReferenceTable | null>(null);


    const translatedFulfillabilityOptions = React.useMemo(() => {
        return fulfillabilityOptions.map(opt => ({value: opt, label: t(opt as any)}));
    }, [t]);

    React.useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const [data, segmentsOrder] = await Promise.all([
                    getSegmentDetails({ projectAnalysisId: analysisId, ruleBookId, segmentKey: segment }),
                    getOrderedSegments(analysisId)
                ]);

                setDetails(data);
                setOrderedSegments(segmentsOrder);
                
                const initialAnalysisData: Record<string, any> = {};
                data.entries.forEach(entry => {
                    if (entry.analysis) {
                        initialAnalysisData[entry.id] = {
                            checklistStatus: entry.analysis.checklistStatus,
                            revisedFulfillability: entry.analysis.revisedFulfillability,
                        };
                    }
                });
                setAnalysisData(initialAnalysisData);
            } catch (err) {
                console.error(err);
                setError('Failed to load section details.');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [analysisId, ruleBookId, segment]);

    const handleAnalysisChange = async (entryId: string, field: 'checklistStatus' | 'revisedFulfillability', value: string | null) => {
        const currentData = analysisData[entryId] || {};
        const newData = { ...currentData, [field]: value };
        
        if (field === 'checklistStatus' && !['Not Fulfilled', 'Not verifiable'].includes(value || '')) {
            newData.revisedFulfillability = null;
        }

        setAnalysisData(prev => ({ ...prev, [entryId]: newData }));

        try {
            await saveAnalysisResult({
                projectAnalysisId: analysisId,
                ruleBookId: ruleBookId,
                ruleBookEntryId: entryId,
                segmentKey: segment, // Pass the current segment key
                checklistStatus: newData.checklistStatus!,
                revisedFulfillability: newData.revisedFulfillability
            });
            toast({ title: t('save') + "d!", description: 'Your changes have been saved.', duration: 2000 });
        } catch(e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save your changes. Check console for details.' });
        }
    };
    
    const handleNext = () => {
        const currentIndex = orderedSegments.findIndex(
            s => s.ruleBookId === ruleBookId && s.segmentKey === segment
        );

        if (currentIndex !== -1 && currentIndex < orderedSegments.length - 1) {
            const nextSegment = orderedSegments[currentIndex + 1];
            router.push(`/dashboard/project-analysis/${analysisId}/rule-analysis/${nextSegment.ruleBookId}/${nextSegment.segmentKey}`);
        } else {
            setShowNoMoreSegmentsAlert(true);
        }
    };
    
    const handleOpenReferenceTable = (tableName: string) => {
        const table = details?.referenceTables.find((t) => t.name === tableName);
        if (table) setSelectedTable(table);
    };

    const handleCloseAlert = () => {
        setShowNoMoreSegmentsAlert(false);
        router.push(`/dashboard/project-analysis/${analysisId}/rule-analysis`);
    };

    if (loading) return <Skeleton className="h-screen w-full" />;
    if (error) return <div className="text-destructive p-8 text-center">{error}</div>;
    if (!details) return <div className="p-8 text-center">No details found for this section.</div>;

    const headersFromData = details.entries.length > 0 ? Object.keys(details.entries[0].data) : [];
    
    const hasReferenceTableContent = details.entries.some(entry => entry.data['Referenztabelle'] && String(entry.data['Referenztabelle']).trim() !== '');

    const columnsToHide = ['Usage', 'Column Type', 'Fulfillability', 'Checklist', 'Nutzung', 'Spaltentyp', 'Erfüllbarkeit', 'Checkliste'];
    if (!hasReferenceTableContent) {
        columnsToHide.push('Referenztabelle');
    }

    const displayHeaders = headersFromData.filter(
        h => !columnsToHide.includes(h)
    );
    
    const columnOrder: string[] = ['Gliederung', 'Text', 'Referenztabelle'];

    const sortedHeaders = displayHeaders.sort((a,b) => {
        const indexA = columnOrder.indexOf(a);
        const indexB = columnOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    const finalHeaders = [...sortedHeaders, 'projectChecklist', 'projectBasedFulfillability'];
    
    const getColumnStyle = (header: string): React.CSSProperties => {
        const style: React.CSSProperties = { width: 'auto' };

        if (header === 'Text') {
            style.maxWidth = '55ch';
        } else {
            style.maxWidth = '30ch';
        }
        return style;
    };

    const newUseDisplay = (details.projectAnalysis.newUse || []).map(u => t(u as any) || u).join(', ');
    const fulfillabilityDisplay = (details.projectAnalysis.fulfillability || []).map(f => t(f as any) || f).join(', ');

    return (
        <>
        <div className="flex flex-col gap-6" style={{ height: 'calc(100vh - 200px)' }}>
            <div className="flex items-start justify-between gap-4 shrink-0">
                 <div className="flex items-start gap-4">
                    <Button asChild variant="outline" size="icon">
                        <Link href={`/dashboard/project-analysis/${analysisId}/rule-analysis`}>
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">{t('back')}</span>
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold font-headline">{t('ruleAnalysisSectionTitle', {key: details.segmentKey})}</h1>
                        <div className="flex items-center gap-x-4 text-muted-foreground text-sm flex-wrap">
                            <p><span className="font-semibold">{t('sectionRuleBook')}:</span> {details.ruleBook.versionName}</p>
                            {newUseDisplay && <p><span className="font-semibold">{t('newUse')}:</span> {newUseDisplay}</p>}
                            {fulfillabilityDisplay && <p><span className="font-semibold">{t('fulfillability')}:</span> {fulfillabilityDisplay}</p>}
                        </div>
                    </div>
                </div>
                 <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => router.back()}>{t('cancel')}</Button>
                    <Button onClick={handleNext}>{t('next')}</Button>
                </div>
            </div>
            
            <div style={{ position: 'relative', flex: '1 1 0%', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', overflow: 'auto' }}>
                <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead className="sticky top-0 bg-card z-10">
                        <TableRow>
                            {finalHeaders.map(header => <TableHead key={header} className="border-b" style={getColumnStyle(header)}>{t(header as any) || header}</TableHead>)}
                        </TableRow>
                    </thead>
                    <TableBody>
                        {details.entries.map(entry => {
                            const currentAnalysis = analysisData[entry.id] || {};
                            const showRevisedFulfillability = ['Not Fulfilled', 'Not verifiable'].includes(currentAnalysis.checklistStatus || '');

                            return (
                                <TableRow key={entry.id}>
                                    {finalHeaders.map(header => {
                                        const cellValue = String(entry.data[header] ?? '');
                                        return (
                                            <TableCell key={`${entry.id}-${header}`} className="align-top border-b" style={getColumnStyle(header)}>
                                                {header === 'projectChecklist' ? (
                                                    entry.data['Spaltentyp'] === 'Parameter' ? (
                                                        <Select
                                                            value={currentAnalysis.checklistStatus}
                                                            onValueChange={value => handleAnalysisChange(entry.id, 'checklistStatus', value)}
                                                        >
                                                            <SelectTrigger><SelectValue placeholder={t('selectPlaceholder')} /></SelectTrigger>
                                                            <SelectContent>
                                                                {checklistOptions.map(opt => <SelectItem key={opt.key} value={opt.value}>{t(opt.key as any)}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : <span className="text-muted-foreground">-</span>
                                                ) : header === 'projectBasedFulfillability' ? (
                                                    showRevisedFulfillability ? (
                                                        <Select
                                                            value={currentAnalysis.revisedFulfillability || ''}
                                                            onValueChange={value => handleAnalysisChange(entry.id, 'revisedFulfillability', value)}
                                                        >
                                                            <SelectTrigger><SelectValue placeholder={t('selectPlaceholder')} /></SelectTrigger>
                                                            <SelectContent>
                                                                {translatedFulfillabilityOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : <span className="text-muted-foreground">-</span>
                                                ) : header === 'Referenztabelle' ? (
                                                    renderCellWithLinks(cellValue, details.referenceTables, handleOpenReferenceTable, entry.id)
                                                ) : (
                                                    <LatexRenderer text={cellValue} />
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </table>
            </div>
        </div>
        <AlertDialog open={showNoMoreSegmentsAlert} onOpenChange={setShowNoMoreSegmentsAlert}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Analysis Complete</AlertDialogTitle>
                    <AlertDialogDescription>
                        No more sections left for analysis.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={handleCloseAlert}>OK</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <ReferenceTableDialog
            isOpen={!!selectedTable}
            onOpenChange={() => setSelectedTable(null)}
            table={selectedTable}
        />
        </>
    );
}
