
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProjectAnalysisDetails, updateProjectAnalysis } from '../../actions';
import { type ProjectAnalysis, type Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';


interface AnalysisDetails {
    analysis: ProjectAnalysis;
    project: Project;
}

const currentUseOptions = [
    { value: 'General', label: 'General' },
    { value: 'Residential', label: 'Residential' },
    { value: 'Office', label: 'Office' },
    { value: 'Accommodation/ Guest House/ Hotel/ Dormitory', label: 'Accommodation/ Guest House/ Hotel/ Dormitory' },
    { value: 'Inn/ Restaurant/ Cafe', label: 'Inn/ Restaurant/ Cafe' },
    { value: 'Retail Outlet/ Shopping Center', label: 'Retail Outlet/ Shopping Center' },
    { value: 'Educational Institution/ School/ Kindergarten', label: 'Educational Institution/ School/ Kindergarten' },
    { value: 'Business Premises', label: 'Business Premises' },
    { value: 'Garage/ Covered Parking, Parking Deck', label: 'Garage/ Covered Parking, Parking Deck' },
    { value: 'Gas Station', label: 'Gas Station' },
    { value: 'Special Buildings: Hospital/ Nursing Home/ Assembly Halls/ Shelters', label: 'Special Buildings: Hospital/ Nursing Home/ Assembly Halls/ Shelters' },
    { value: 'Non Residential', label: 'Non Residential' },
];

const fulfillabilityOptions: MultiSelectOption[] = [
    { value: 'Light', label: 'Light' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Heavy', label: 'Heavy' },
];

export default function AnalysisDetailPage() {
    const params = useParams();
    const router = useRouter();
    const analysisId = params.analysisId as string;
    const { t, language } = useLanguage();
    const { toast } = useToast();

    const [details, setDetails] = React.useState<AnalysisDetails | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    
    // Form state
    const [newUse, setNewUse] = React.useState<string | undefined>(undefined);
    const [fulfillability, setFulfillability] = React.useState<string[]>([]);

    const fetchDetails = React.useCallback(async (id: string) => {
        setIsLoading(true);
        try {
            const data = await getProjectAnalysisDetails(id);
            if (data) {
                setDetails(data);
                setNewUse(data.analysis.newUse || undefined);
                setFulfillability(data.analysis.fulfillability || []);
            } else {
                setError('Analysis not found.');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to load analysis details.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (analysisId) {
            fetchDetails(analysisId);
        }
    }, [analysisId, fetchDetails]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedAnalysis = await updateProjectAnalysis(analysisId, {
                newUse,
                fulfillability,
            });
            if (updatedAnalysis) {
                toast({ title: "Saved", description: "Analysis details have been saved." });
                // Re-fetch to confirm data persistence and update state
                await fetchDetails(analysisId);
            } else {
                throw new Error('Failed to save data.');
            }
        } catch (err) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: "Could not save analysis details.",
            });
        } finally {
            setIsSaving(false);
        }
    }
    
    if (isLoading) {
        return <Skeleton className="h-96 w-full"/>;
    }

    if (error || !details) {
        return <div className="text-center text-destructive p-8">{error || "Could not load analysis details."}</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-4">
                <Button asChild variant="outline" size="icon">
                    <Link href="/dashboard/project-analysis">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">{t('back')}</span>
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold font-headline">Analysis for {details.project.name}</h1>
                    <p className="text-muted-foreground">Version {String(details.analysis.version).padStart(3, '0')}</p>
                </div>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Analysis Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label>Current Use</Label>
                            <Input value={details.project.currentUse || 'N/A'} disabled />
                        </div>
                        <div className="space-y-2">
                             <Label>New Use</Label>
                             <Select value={newUse} onValueChange={setNewUse}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select new use..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <ScrollArea className="h-48">
                                        {currentUseOptions.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {language === 'de' ? t(opt.value as any) : opt.label}
                                            </SelectItem>
                                        ))}
                                    </ScrollArea>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Fulfillability</Label>
                             <MultiSelect
                                options={fulfillabilityOptions}
                                selected={fulfillability}
                                onChange={setFulfillability}
                                placeholder="Select fulfillability..."
                             />
                        </div>
                     </div>
                </CardContent>
                <CardContent className="flex justify-end gap-2 pt-6">
                    <Button variant="outline" onClick={() => router.back()} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="secondary" disabled={isSaving}>Next</Button>
                </CardContent>
            </Card>
        </div>
    );
}
