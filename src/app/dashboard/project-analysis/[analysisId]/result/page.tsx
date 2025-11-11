
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
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

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


export default function AnalysisResultPage() {
    const params = useParams();
    const router = useRouter();
    const analysisId = params.analysisId as string;
    const { t } = useLanguage();

    const [projectName, setProjectName] = React.useState('');
    const [chartData, setChartData] = React.useState<AnalysisResultData | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

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
                setChartData(data);
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

    if (isLoading) {
        return (
             <div className="space-y-6">
                <Skeleton className="h-10 w-96"/>
                <div className="grid md:grid-cols-2 gap-6">
                    <Skeleton className="h-96"/>
                    <Skeleton className="h-96"/>
                </div>
            </div>
        );
    }
    
    if (error) {
        return <div className="text-center text-destructive p-8">{error}</div>;
    }

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
                        <CardTitle>{t('revisedChecklistSummary')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                         {chartData && chartData.checklistData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={400}>
                                <PieChart>
                                    <Pie
                                        data={chartData.checklistData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={renderCustomizedLabel}
                                        outerRadius={150}
                                        dataKey="value"
                                        nameKey="name"
                                    >
                                        {chartData.checklistData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value, name) => {
                                            const translationKey = name.toLowerCase().replace(/ /g, '');
                                            const translatedName = t(translationKey as any) || name;
                                            const percentage = ((value as number / chartData.checklistData.reduce((acc, item) => acc + item.value, 0)) * 100).toFixed(1);
                                            return [`${value} (${percentage}%)`, translatedName];
                                        }}
                                    />
                                    <Legend 
                                        formatter={(value) => {
                                            const translationKey = value.replace(/ /g, '');
                                            // Ensure the first letter is lowercase for camelCase keys
                                            const finalKey = translationKey.charAt(0).toLowerCase() + translationKey.slice(1);
                                            return t(finalKey as any) || value;
                                        }} 
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-96 flex items-center justify-center text-muted-foreground">No data available.</div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('revisedFulfillabilitySummary')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {chartData && chartData.fulfillabilityData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={400}>
                                <PieChart>
                                    <Pie
                                        data={chartData.fulfillabilityData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={renderCustomizedLabel}
                                        outerRadius={150}
                                        dataKey="value"
                                        nameKey="name"
                                    >
                                        {chartData.fulfillabilityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value, name) => {
                                            const translatedName = t(name as any) || name;
                                            const percentage = ((value as number / chartData.fulfillabilityData.reduce((acc, item) => acc + item.value, 0)) * 100).toFixed(1);
                                            return [`${value} (${percentage}%)`, translatedName];
                                        }}
                                    />
                                     <Legend formatter={(value) => t(value as any) || value} />
                                </PieChart>
                            </ResponsiveContainer>
                         ) : (
                            <div className="h-96 flex items-center justify-center text-muted-foreground">No data available.</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
