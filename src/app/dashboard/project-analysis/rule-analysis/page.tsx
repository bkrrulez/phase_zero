'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSegmentedRuleBookData } from '@/app/dashboard/project-analysis/rule-analysis/actions';
import { getProjectAnalysisDetails } from '@/app/dashboard/actions';
import { type RuleBook, type ProjectAnalysis, type Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/app/dashboard/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useAdminPanel } from '@/app/dashboard/contexts/AdminPanelContext';
import { LatexRenderer } from '@/app/dashboard/rule-books/components/latex-renderer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


interface SegmentStat {
    key: string;
    displayIndex: number;
    totalRows: number;
    totalParameters: number;
    completedParameters: number;
    firstRowText?: string;
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
    const { showRowCount } = useAdminPanel();

    const [projectAnalysis, setProjectAnalysis] = React.useState<ProjectAnalysis | null>(null);
    const [project, setProject] = React.useState<Project | null>(null);
    const [segmentedData, setSegmentedData] = React.useState<SegmentedRuleBook[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [isAnalysisComplete, setIsAnalysisComplete] = React.useState(false);
    const [globalStats, setGlobalStats] = React.useState({ total: 0, completed: 0 });
    
    const [expandedBooks, setExpandedBooks] = React.useState<Record<string, boolean>>({});
    const [isPartialAlertOpen, setIsPartialAlertOpen] = React.useState(false);


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
                setSegmentedData(segmentedBooks as any);

                const isComplete = segmentedBooks.every(book => book.totalParameters === 0 || book.totalCompleted === book.totalParameters);
                setIsAnalysisComplete(isComplete);
                
                const globalTotal = segmentedBooks.reduce((acc, book) => acc + book.totalParameters, 0);
                const globalCompleted = segmentedBooks.reduce((acc, book) => acc + book.totalCompleted, 0);
                setGlobalStats({ total: globalTotal, completed: globalCompleted });

                if (segmentedBooks.length > 0) {
                    const initialExpansion: Record<string, boolean> = {};
                    segmentedBooks.forEach((book, index) => {
                        initialExpansion[book.ruleBook.id] = index === 0;
                    });
                    setExpandedBooks(initialExpansion);
                }

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
        if (globalStats.completed === 0) {
            toast({
                variant: 'destructive',
                title: t('fillAtLeastOneParameter'),
            });
            return;
        }

        if (isAnalysisComplete) {
            router.push(`/dashboard/project-analysis/${analysisId}/result`);
        } else {
            setIsPartialAlertOpen(true);
        }
    };
    
    const handleProceedToResult = () => {
        setIsPartialAlertOpen(false);
        router.push(`/dashboard/project-analysis/${analysisId}/result`);
    };

    const toggleBookExpansion = (bookId: string) => {
        setExpandedBooks(prev => ({
            ...prev,
            [bookId]: !prev[bookId]
        }));
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
                        <h1 className="text-3xl font-bold font-headline">{t('parameterAnalysisPageTitle', { name: project?.name || ''})}</h1>
                        <div className="flex items-center gap-x-4 text-muted-foreground text-sm flex-wrap">
                            {projectAnalysis && <p><span className="font-semibold">{t('analysisVersionHeader')}:</span> {String(projectAnalysis.version).padStart(3, '0')}</p>}
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
                 <Button onClick={handleResultClick}>{t('results')}</Button>
            </div>

            {segmentedData.map(({ ruleBook, segments, totalCompleted, totalParameters, totalRows }) => {
                const isComplete = totalParameters > 0 && totalCompleted === totalParameters;
                const overallProgress = totalParameters > 0 ? (totalCompleted / totalParameters) * 100 : 0;
                const isExpanded = !!expandedBooks[ruleBook.id];

                return (
                    <Card key={ruleBook.id}>
                        <CardHeader 
                            className="cursor-pointer select-none hover:bg-muted/30 transition-colors"
                            onClick={() => toggleBookExpansion(ruleBook.id)}
                        >
                            <CardTitle className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span>{ruleBook.versionName}</span>
                                    {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                </div>
                                <div className="flex items-center gap-4 text-sm font-medium">
                                    {showRowCount && <span className="text-muted-foreground">{totalRows} {totalRows === 1 ? t('row') : t('rows')}</span>}
                                    {totalParameters > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span>{totalCompleted} / {totalParameters}</span>
                                            <Progress value={overallProgress} className="w-24 h-2" />
                                            {isComplete && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                                        </div>
                                    )}
                                </div>
                            </CardTitle>
                            <CardDescription>{t('ruleAnalysisFilteredDesc')}</CardDescription>
                        </CardHeader>
                        {isExpanded && (
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {segments.map(segment => {
                                        const progress = segment.totalParameters > 0 ? (segment.completedParameters / segment.totalParameters) * 100 : 0;
                                        const hasNoParameters = segment.totalParameters === 0;
                                        const isSegmentComplete = !hasNoParameters && segment.completedParameters === segment.totalParameters;

                                        return (
                                            <div
                                                key={segment.key}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSegmentClick(ruleBook.id, segment.key);
                                                }}
                                                className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer space-y-2 transition-colors min-h-[120px] flex flex-col justify-between"
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-start">
                                                        <h3 className="text-sm font-bold text-primary">{t('section', { key: segment.displayIndex })}</h3>
                                                        {(isSegmentComplete || hasNoParameters) && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                                                    </div>
                                                    
                                                    {segment.firstRowText && (
                                                        <div className="text-xs text-muted-foreground line-clamp-2" title={segment.firstRowText}>
                                                            <LatexRenderer text={segment.firstRowText} />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-1">
                                                     {showRowCount && <p className="text-[10px] text-muted-foreground/60">{segment.totalRows} {segment.totalRows === 1 ? t('row') : t('rows')}</p>}
                                                    {!hasNoParameters && (
                                                        <div>
                                                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                                                <span>{segment.completedParameters} / {segment.totalParameters}</span>
                                                                <span>{Math.round(progress)}%</span>
                                                            </div>
                                                            <Progress value={progress} className="h-1" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        )}
                    </Card>
                )
            })}

            <AlertDialog open={isPartialAlertOpen} onOpenChange={setIsPartialAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('analysisPartiallyCompleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('analysisPartiallyCompleteDesc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleProceedToResult}>{t('proceedBtn')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
