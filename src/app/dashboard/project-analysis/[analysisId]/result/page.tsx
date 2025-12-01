
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAnalysisResultData, type AnalysisResultData } from './actions';
import { getProjectAnalysisDetails } from '../../../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeft, ArrowDown, ArrowUp } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';
import { RuleBookSegmentViewer, type ViewerProps } from './components/rule-book-segment-viewer';

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const value = payload.value;

  if (percent < 0.05) return null;

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="font-semibold">
      {`${value} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

type SortableColumn = 'ruleBookName' | 'fulfillability';

const ParametersTable = ({ parameters, onRowClick, analysisId }: { parameters: AnalysisResultData['notFulfilledParameters'], onRowClick: (props: ViewerProps) => void, analysisId: string }) => {
    const { t } = useLanguage();
    const [selectedFulfillability, setSelectedFulfillability] = React.useState<string[]>(['Light', 'Medium', 'Heavy']);
    const [sortColumn, setSortColumn] = React.useState<SortableColumn | null>(null);
    const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
    
    const fulfillabilityOptions: MultiSelectOption[] = [
        { value: 'Light', label: t('Light') },
        { value: 'Medium', label: t('Medium') },
        { value: 'Heavy', label: t('Heavy') }
    ];

    const handleSort = (column: SortableColumn) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const renderSortIcon = (column: SortableColumn) => {
        if (sortColumn !== column) {
            return <ArrowUp className="ml-2 h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />;
        }
        return sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
    }

    const sortedParameters = React.useMemo(() => {
        const filtered = parameters.filter(param => selectedFulfillability.includes(param.fulfillability || ''));
        
        if (sortColumn) {
            return [...filtered].sort((a, b) => {
                const valA = (sortColumn === 'ruleBookName' ? a.ruleBookName : a.fulfillability || '').toLowerCase();
                const valB = (sortColumn === 'ruleBookName' ? b.ruleBookName : b.fulfillability || '').toLowerCase();
                
                if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        return filtered;
    }, [parameters, selectedFulfillability, sortColumn, sortDirection]);

    const columns = ['Rule Book Name', 'Structure', 'Section', 'Fulfillability'];

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <MultiSelect 
                    options={fulfillabilityOptions}
                    selected={selectedFulfillability}
                    onChange={setSelectedFulfillability}
                    placeholder="Filter by fulfillability..."
                    className="w-full sm:w-[250px]"
                />
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                       <TableHead 
                            onClick={() => handleSort('ruleBookName')}
                            className="cursor-pointer group"
                        >
                            <div className="flex items-center">
                                {t('Rule Book Name')}
                                {renderSortIcon('ruleBookName')}
                            </div>
                        </TableHead>
                        <TableHead>{t('Structure')}</TableHead>
                        <TableHead>{t('Section')}</TableHead>
                        <TableHead 
                            onClick={() => handleSort('fulfillability')}
                            className="cursor-pointer group"
                        >
                             <div className="flex items-center">
                                {t('Fulfillability')}
                                {renderSortIcon('fulfillability')}
                            </div>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedParameters.length > 0 ? sortedParameters.map((param, index) => (
                        <TableRow key={`${param.entryId}-${index}`}>
                            <TableCell>{param.ruleBookName}</TableCell>
                            <TableCell 
                                className="cursor-pointer hover:underline text-primary max-w-xs truncate"
                                onClick={() => onRowClick({ projectAnalysisId: analysisId, ruleBookId: param.ruleBookId, segmentKey: param.segmentKey, highlightEntryId: param.entryId })}
                            >
                                {param.structure}
                            </TableCell>
                            <TableCell 
                                className="cursor-pointer hover:underline text-primary"
                                onClick={() => onRowClick({ projectAnalysisId: analysisId, ruleBookId: param.ruleBookId, segmentKey: param.segmentKey, highlightEntryId: param.entryId })}
                            >
                                {param.segmentKey}
                            </TableCell>
                            <TableCell>{t(param.fulfillability as any)}</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">No parameters match the selected filter.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};


export default function AnalysisResultPage() {
    const params = useParams();
    const router = useRouter();
    const analysisId = params.analysisId as string;
    const { t } = useLanguage();

    const [projectName, setProjectName] = React.useState('');
    const [resultData, setResultData] = React.useState<AnalysisResultData | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [viewerProps, setViewerProps] = React.useState<ViewerProps | null>(null);

    React.useEffect(() => {
        async function fetchData() {
            if (!analysisId) return;
            setIsLoading(true);
            try {
                const [details, data] = await Promise.all([
                    getProjectAnalysisDetails(analysisId),
                    getAnalysisResultData(analysisId)
                ]);

                if (!details) throw new Error('Project details not found');

                setProjectName(details.project.name);
                setResultData(data);
            } catch (err) {
                console.error(err);
                setError('Failed to load analysis results.');
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [analysisId]);
    
    const handleEndAnalysis = () => {
        router.push('/dashboard/project-analysis');
    }

    const handleRowClick = (props: ViewerProps) => {
        setViewerProps(props);
    }

    if (isLoading) {
        return (
             <div className="space-y-6">
                <Skeleton className="h-10 w-96"/>
                <div className="grid md:grid-cols-2 gap-6">
                    <Skeleton className="h-96"/>
                    <Skeleton className="h-96"/>
                </div>
                 <Skeleton className="h-96 w-full"/>
            </div>
        );
    }
    
    if (error) {
        return <div className="text-center text-destructive p-8">{error}</div>;
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <Button asChild variant="outline" size="icon">
                            <Link href={`/dashboard/project-analysis/${analysisId}/rule-analysis`}>
                                <ArrowLeft className="h-4 w-4" />
                                <span className="sr-only">{t('back')}</span>
                            </Link>
                        </Button>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold font-headline">{t('analysisResultFor', { name: projectName })}</h1>
                            <p className="text-muted-foreground">{t('analysisResultDesc')}</p>
                        </div>
                    </div>
                    <Button onClick={handleEndAnalysis}>{t('endAnalysis')}</Button>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-center">{t('revisedChecklistSummary')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {resultData && resultData.checklistData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={400}>
                                    <PieChart>
                                        <Pie
                                            data={resultData.checklistData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={renderCustomizedLabel}
                                            outerRadius={150}
                                            dataKey="value"
                                            nameKey="name"
                                            startAngle={90}
                                            endAngle={-270}
                                        >
                                            {resultData.checklistData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value, name) => {
                                                const translatedName = t(name as any);
                                                const total = resultData.checklistData.reduce((acc, item) => acc + item.value, 0);
                                                const percentage = total > 0 ? ((value as number / total) * 100).toFixed(1) : 0;
                                                return [`${value} (${percentage}%)`, translatedName];
                                            }}
                                        />
                                        <Legend formatter={(value) => t(value as any)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-96 flex items-center justify-center text-muted-foreground">No data available.</div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-center">{t('satisfiabilityOfUnmetParameters')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {resultData && resultData.fulfillabilityData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={400}>
                                    <PieChart>
                                        <Pie
                                            data={resultData.fulfillabilityData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={renderCustomizedLabel}
                                            outerRadius={150}
                                            dataKey="value"
                                            nameKey="name"
                                            startAngle={90}
                                            endAngle={-270}
                                        >
                                            {resultData.fulfillabilityData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(value, name) => {
                                                const translatedName = t(name as any);
                                                const total = resultData.fulfillabilityData.reduce((acc, item) => acc + item.value, 0);
                                                const percentage = total > 0 ? ((value as number / total) * 100).toFixed(1) : 0;
                                                return [`${value} (${percentage}%)`, translatedName];
                                            }}
                                        />
                                        <Legend formatter={(value) => t(value as any)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-96 flex items-center justify-center text-muted-foreground">No data available.</div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                    <Tabs defaultValue="not-fulfilled">
                        <div className="p-4 border-b">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="not-fulfilled">{t('notFulfilledParametersTab')}</TabsTrigger>
                                <TabsTrigger value="not-verifiable">{t('notVerifiableParametersTab')}</TabsTrigger>
                            </TabsList>
                        </div>
                        <TabsContent value="not-fulfilled" className="mt-0 p-4">
                            {resultData && <ParametersTable parameters={resultData.notFulfilledParameters} onRowClick={handleRowClick} analysisId={analysisId}/>}
                        </TabsContent>
                        <TabsContent value="not-verifiable" className="mt-0 p-4">
                            {resultData && <ParametersTable parameters={resultData.notVerifiableParameters} onRowClick={handleRowClick} analysisId={analysisId}/>}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            <RuleBookSegmentViewer 
                isOpen={!!viewerProps}
                onOpenChange={() => setViewerProps(null)}
                viewerProps={viewerProps}
            />
        </>
    );
}
