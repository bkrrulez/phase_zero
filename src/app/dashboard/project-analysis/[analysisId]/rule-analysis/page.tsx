
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSegmentedRuleBookData } from '@/app/dashboard/project-analysis/rule-analysis/actions';
import { getProjectAnalysisDetails } from '@/app/dashboard/actions';
import { type RuleBook, type ProjectAnalysis } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '../../../contexts/LanguageContext';

interface SegmentStat {
    key: string;
    total: number;
    completed: number;
}

interface SegmentedRuleBook {
    ruleBook: RuleBook;
    segments: SegmentStat[];
    totalEntries: number;
    totalCompleted: number;
}

export default function RuleAnalysisPage() {
    const params = useParams();
    const router = useRouter();
    const analysisId = params.analysisId as string;
    const { t } = useLanguage();

    const [projectAnalysis, setProjectAnalysis] = React.useState<ProjectAnalysis | null>(null);
    const [segmentedData, setSegmentedData] = React.useState<SegmentedRuleBook[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        async function fetchData() {
            if (!analysisId) return;
            setIsLoading(true);
            try {
                const [analysisDetails, segmentedBooks] = await Promise.all([
                    getProjectAnalysisDetails(analysisId),
                    getSegmentedRuleBookData(analysisId)
                ]);
                
                if (!analysisDetails) throw new Error('Project analysis not found.');
                
                setProjectAnalysis(analysisDetails.analysis);
                setSegmentedData(segmentedBooks);
            } catch (err) {
                console.error(err);
                setError('Failed to load rule analysis data.');
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [analysisId]);

    const handleSegmentClick = (ruleBookId: string, segmentKey: string) => {
        router.push(`/dashboard/project-analysis/${analysisId}/rule-analysis/${ruleBookId}/${segmentKey}`);
    };

    if (isLoading) {
        return <Skeleton className="w-full h-96" />;
    }

    if (error) {
        return <div className="text-center text-destructive p-8">{error}</div>;
    }
    
    return (
        <div className="space-y-6">
            <div className="flex items-start gap-4">
                <Button asChild variant="outline" size="icon">
                    <Link href={`/dashboard/project-analysis/${analysisId}`}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">{t('back')}</span>
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold font-headline">Rule Analysis</h1>
                    <div className="flex justify-between items-center text-muted-foreground text-sm">
                        <p>For analysis version {String(projectAnalysis?.version).padStart(3, '0')}</p>
                         {projectAnalysis && (projectAnalysis.newUse || projectAnalysis.fulfillability) && (
                            <div className="flex items-center gap-4">
                                {projectAnalysis.newUse && (
                                    <p><span className="font-semibold">New Use:</span> {projectAnalysis.newUse}</p>
                                )}
                                {projectAnalysis.fulfillability && projectAnalysis.fulfillability.length > 0 && (
                                     <p><span className="font-semibold">Fulfillability:</span> {projectAnalysis.fulfillability.join(', ')}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {segmentedData.map(({ ruleBook, segments, totalCompleted, totalEntries }) => (
                <Card key={ruleBook.id}>
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            <span>{ruleBook.versionName}</span>
                            <div className="flex items-center gap-2 text-sm font-medium">
                               <span>{totalCompleted} / {totalEntries}</span>
                               <Progress value={(totalEntries > 0 ? (totalCompleted / totalEntries) * 100 : 0)} className="w-24 h-2" />
                               {totalCompleted === totalEntries && totalEntries > 0 && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                            </div>
                        </CardTitle>
                        <CardDescription>Filtered based on your analysis criteria.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {segments.map(segment => {
                                const progress = segment.total > 0 ? (segment.completed / segment.total) * 100 : 0;
                                return (
                                    <div
                                        key={segment.key}
                                        onClick={() => handleSegmentClick(ruleBook.id, segment.key)}
                                        className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer space-y-2 transition-colors"
                                    >
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-semibold text-lg">Segment {segment.key}</h3>
                                            {progress === 100 && segment.total > 0 && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{segment.completed} / {segment.total} Analyzed</p>
                                        <Progress value={progress} className="h-2" />
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
