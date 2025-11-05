
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSegmentDetails, saveAnalysisResult } from '../../../../rule-analysis/actions';
import { type ProjectAnalysis, type RuleBook, type RuleBookEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '../../../../../contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type AnalysisResult = {
    id: string;
    projectAnalysisId: string;
    ruleBookEntryId: string;
    checklistStatus: string;
    revisedFulfillability: string | null;
}

type EntryWithAnalysis = RuleBookEntry & { analysis?: AnalysisResult };

interface SegmentDetails {
    projectAnalysis: ProjectAnalysis;
    ruleBook: RuleBook;
    segmentKey: string;
    entries: EntryWithAnalysis[];
}

const checklistOptions = ['Achievable', 'Unachievable', 'Not relevant', 'Not verifiable'];
const fulfillabilityOptions = ['Light', 'Medium', 'Heavy'];

export default function SegmentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useLanguage();
    const { toast } = useToast();

    const analysisId = params.analysisId as string;
    const ruleBookId = params.ruleBookId as string;
    const segment = params.segment as string;

    const [details, setDetails] = React.useState<SegmentDetails | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [analysisData, setAnalysisData] = React.useState<Record<string, { checklistStatus?: string; revisedFulfillability?: string | null }>>({});

    React.useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const data = await getSegmentDetails({ projectAnalysisId: analysisId, ruleBookId, segmentKey: segment });
                setDetails(data);
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
                setError('Failed to load segment details.');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [analysisId, ruleBookId, segment]);

    const handleAnalysisChange = async (entryId: string, field: 'checklistStatus' | 'revisedFulfillability', value: string | null) => {
        const currentData = analysisData[entryId] || {};
        const newData = { ...currentData, [field]: value };
        
        // If checklist status is not Unachievable/Not verifiable, clear revised fulfillability
        if (field === 'checklistStatus' && !['Unachievable', 'Not verifiable'].includes(value || '')) {
            newData.revisedFulfillability = null;
        }

        setAnalysisData(prev => ({ ...prev, [entryId]: newData }));

        // Autosave
        try {
            await saveAnalysisResult({
                projectAnalysisId: analysisId,
                ruleBookEntryId: entryId,
                checklistStatus: newData.checklistStatus!,
                revisedFulfillability: newData.revisedFulfillability
            });
            toast({ title: 'Auto-saved!', description: 'Your changes have been saved.', duration: 2000 });
        } catch {
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save your changes.' });
        }
    };
    
    const columnOrder = ['Gliederung', 'Text', 'Spaltentyp', 'Checkliste', 'Überarbeitete Erfüllbarkeit'];

    if (loading) return <Skeleton className="h-screen w-full" />;
    if (error) return <div className="text-destructive p-8 text-center">{error}</div>;
    if (!details) return <div className="p-8 text-center">No details found for this segment.</div>;

    const headersFromData = details.entries.length > 0 ? Object.keys(details.entries[0].data) : [];
    
    // Filter out Nutzung and Erfüllbarkeit as they are in the header now
    const displayHeaders = headersFromData.filter(h => h !== 'Nutzung' && h !== 'Erfüllbarkeit' && h !== 'Referenztabelle');

    const headersForSorting = [...displayHeaders, 'Checkliste', 'Überarbeitete Erfüllbarkeit'];

    const sortedHeaders = headersForSorting.sort((a,b) => {
        const indexA = columnOrder.indexOf(a);
        const indexB = columnOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                 <div className="flex items-start gap-4">
                    <Button asChild variant="outline" size="icon">
                        <Link href={`/dashboard/project-analysis/${analysisId}/rule-analysis`}>
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">{t('back')}</span>
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Rule Analysis: Segment {details.segmentKey}</h1>
                        <p className="text-muted-foreground">
                            <span className="font-semibold">Rule Book:</span> {details.ruleBook.versionName} | <span className="font-semibold">New Use:</span> {details.projectAnalysis.newUse} | <span className="font-semibold">Fulfillability:</span> {details.projectAnalysis.fulfillability?.join(', ')}
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="border rounded-lg overflow-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                            {sortedHeaders.map(header => <TableHead key={header}>{t(header as any) || header}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {details.entries.map(entry => {
                            const currentAnalysis = analysisData[entry.id] || {};
                            const showRevisedFulfillability = ['Unachievable', 'Not verifiable'].includes(currentAnalysis.checklistStatus || '');

                            return (
                                <TableRow key={entry.id}>
                                    {sortedHeaders.map(header => (
                                        <TableCell key={header} className="align-top">
                                            {header === 'Checkliste' ? (
                                                entry.data['Spaltentyp'] === 'Parameter' ? (
                                                    <Select
                                                        value={currentAnalysis.checklistStatus}
                                                        onValueChange={value => handleAnalysisChange(entry.id, 'checklistStatus', value)}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                        <SelectContent>
                                                            {checklistOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                ) : <span className="text-muted-foreground">N/A</span>
                                            ) : header === 'Überarbeitete Erfüllbarkeit' ? (
                                                showRevisedFulfillability ? (
                                                    <Select
                                                        value={currentAnalysis.revisedFulfillability || ''}
                                                        onValueChange={value => handleAnalysisChange(entry.id, 'revisedFulfillability', value)}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                        <SelectContent>
                                                            {fulfillabilityOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                ) : <span className="text-muted-foreground">-</span>
                                            ) : (
                                                <div className={cn(header === 'Text' ? 'whitespace-normal' : 'whitespace-nowrap')}>
                                                   {String(entry.data[header] ?? '')}
                                                </div>
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
             <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button onClick={() => router.back()}>Save</Button>
                <Button variant="secondary" onClick={() => router.back()}>Next</Button>
            </div>
        </div>
    );
}
