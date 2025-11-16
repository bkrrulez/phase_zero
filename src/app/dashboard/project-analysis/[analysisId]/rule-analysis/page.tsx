
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSegmentedRuleBookData } from '@/app/dashboard/project-analysis/rule-analysis/actions';
import { getProjectAnalysisDetails } from '@/app/dashboard/actions';
import { type RuleBook, type ProjectAnalysis, type Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';


interface SegmentStat {
    key: string;
    totalRows: number;
    totalParameters: number;
    completedParameters: number;
}

interface SegmentedRuleBook {
    ruleBook: RuleBook;
    segments: SegmentStat[];
    totalRows: number;
    totalParameters: number;
    totalCompleted: number;
}

export default function RuleAnalysisPage() {
    const params = useParams();
    const router = useRouter();
    const analysisId = params.analysisId as string;
    const { t } = useLanguage();
    const { toast } = useToast();

    const [projectAnalysis, setProjectAnalysis] = React.useState<ProjectAnalysis | null>(null);
    const [project, setProject] = React.useState<Project | null>(null);
    const [segmentedData, setSegmentedData] = React.useState<SegmentedRuleBook[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [isAnalysisComplete, setIsAnalysisComplete] = React.useState(false);


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
                setProject(analysisDetails.project);
                setSegmentedData(segmentedBooks);

                const isComplete = segmentedBooks.every(book => book.totalParameters === 0 || book.totalCompleted === book.totalParameters);
                setIsAnalysisComplete(isComplete);

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

    const handleResultClick = () => {
        if (isAnalysisComplete) {
            router.push(`/dashboard/project-analysis/${analysisId}/result`);
        } else {
            toast({
                variant: 'destructive',
                title: 'Analysis Incomplete',
                description: 'Please analyze the remaining sections.'
            });
        }
    };

    if (isLoading) {
        return <Skeleton className="w-full h-96" />;
    }

    if (error) {
        return <div className="text-center text-destructive p-8">{error}</div>;
    }
    
    const newUseDisplay = (projectAnalysis?.newUse || []).map(u => t(u as any) || u).join(', ');
    const fulfillabilityDisplay = (projectAnalysis?.fulfillability || []).map(f => t(f as any) || f).join(', ');

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <Button asChild variant="outline" size="icon">
                        <Link href={`/dashboard/project-analysis/${analysisId}`}>
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">{t('back')}</span>
                        </Link>
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold font-headline">{t('ruleAnalysis')} {project ? `for ${project.name}` : ''}</h1>
                        <div className="flex items-center gap-x-4 text-muted-foreground text-sm flex-wrap">
                            <p>{t('analysisVersionHeader', { version: String(projectAnalysis?.version || 0).padStart(3, '0') })}</p>
                           {projectAnalysis && (
                                <>
                                    {newUseDisplay && (
                                        <p><span className="font-semibold">{t('newUse')}:</span> {newUseDisplay}</p>
                                    )}
                                    {fulfillabilityDisplay && (
                                        <p><span className="font-semibold">{t('fulfillability')}:</span> {fulfillabilityDisplay}</p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
                 <Button onClick={handleResultClick}>Result</Button>
            </div>

            {segmentedData.map(({ ruleBook, segments, totalCompleted, totalParameters, totalRows }) => {
                const isComplete = totalParameters > 0 && totalCompleted === totalParameters;
                const overallProgress = totalParameters > 0 ? (totalCompleted / totalParameters) * 100 : 0;
                return (
                    <Card key={ruleBook.id}>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>{ruleBook.versionName}</span>
                                <div className="flex items-center gap-4 text-sm font-medium">
                                    <span className="text-muted-foreground">{totalRows} {totalRows === 1 ? 'Row' : 'Rows'}</span>
                                    {totalParameters > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span>{totalCompleted} / {totalParameters}</span>
                                            <Progress value={overallProgress} className="w-24 h-2" />
                                            {isComplete && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                                        </div>
                                    )}
                                </div>
                            </CardTitle>
                            <CardDescription>{t('ruleAnalysisDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {segments.map(segment => {
                                    const progress = segment.totalParameters > 0 ? (segment.completedParameters / segment.totalParameters) * 100 : 0;
                                    const hasNoParameters = segment.totalParameters === 0;
                                    const isSegmentComplete = !hasNoParameters && segment.completedParameters === segment.totalParameters;

                                    return (
                                        <div
                                            key={segment.key}
                                            onClick={() => handleSegmentClick(ruleBook.id, segment.key)}
                                            className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer space-y-2 transition-colors"
                                        >
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-semibold text-lg">{t('section', { key: segment.key })}</h3>
                                                {(isSegmentComplete || hasNoParameters) && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                                            </div>
                                            <p className="text-xs text-muted-foreground">{segment.totalRows} {segment.totalRows === 1 ? 'Row' : 'Rows'}</p>
                                            
                                            {!hasNoParameters && (
                                                <div>
                                                    <p className="text-sm text-muted-foreground">{segment.completedParameters} / {segment.totalParameters} {t('analyzed')}</p>
                                                    <Progress value={progress} className="h-2 mt-1" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    );
}
