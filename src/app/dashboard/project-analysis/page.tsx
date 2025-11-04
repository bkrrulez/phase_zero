
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProjects } from '../contexts/ProjectsContext';
import { useToast } from '@/hooks/use-toast';
import { getProjectAnalyses, addProjectAnalysis } from '../actions';
import { type ProjectAnalysis, type Project } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { AddAnalysisDialog, type AddAnalysisFormValues } from './components/add-analysis-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function ProjectAnalysisPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const { projects } = useProjects();
    const { toast } = useToast();

    const [analyses, setAnalyses] = React.useState<ProjectAnalysis[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
    const [confirmingNewVersion, setConfirmingNewVersion] = React.useState<{ projectId: string, nextVersion: number } | null>(null);

    const fetchAnalyses = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedAnalyses = await getProjectAnalyses();
            setAnalyses(fetchedAnalyses);
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: "Error",
                description: "Could not fetch project analyses.",
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchAnalyses();
    }, [fetchAnalyses]);

    const handleStartAnalysis = async ({ projectId }: AddAnalysisFormValues) => {
        const existingAnalyses = analyses.filter(a => a.projectId === projectId);
        if (existingAnalyses.length > 0) {
            const nextVersion = Math.max(...existingAnalyses.map(a => a.version)) + 1;
            setConfirmingNewVersion({ projectId, nextVersion });
        } else {
            await createNewAnalysis(projectId);
        }
    };
    
    const createNewAnalysis = async (projectId: string) => {
        try {
            const { analysis } = await addProjectAnalysis(projectId);
            if(analysis) {
                toast({
                    title: "Analysis Started",
                    description: `A new analysis version for project has been created.`,
                });
                router.push(`/dashboard/project-analysis/${analysis.id}`);
            }
        } catch (error) {
             toast({
                variant: 'destructive',
                title: "Error",
                description: "Could not start new analysis.",
            });
        }
        setConfirmingNewVersion(null);
        setIsAddDialogOpen(false);
    }
    
    const getProjectName = (projectId: string) => {
        return projects.find(p => p.id === projectId)?.name || projectId;
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Project Analysis</h1>
                        <p className="text-muted-foreground">Manage and conduct analyses on your projects.</p>
                    </div>
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>All Analyses</CardTitle>
                        <CardDescription>A list of all project analyses that have been started.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Project Name</TableHead>
                                    <TableHead>Analysis Version</TableHead>
                                    <TableHead>Analysis Start Date</TableHead>
                                    <TableHead>Last Modification Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={4} className="h-24 text-center">Loading...</TableCell></TableRow>
                                ) : analyses.length > 0 ? (
                                    analyses.map(analysis => (
                                        <TableRow key={analysis.id} onClick={() => router.push(`/dashboard/project-analysis/${analysis.id}`)} className="cursor-pointer">
                                            <TableCell className="font-medium">{getProjectName(analysis.projectId)}</TableCell>
                                            <TableCell>{String(analysis.version).padStart(3, '0')}</TableCell>
                                            <TableCell>{format(new Date(analysis.startDate), 'PPpp')}</TableCell>
                                            <TableCell>{format(new Date(analysis.lastModificationDate), 'PPpp')}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={4} className="h-24 text-center">No analyses started yet.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            
            <AddAnalysisDialog
                isOpen={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onStartAnalysis={handleStartAnalysis}
                projects={projects}
            />

            <AlertDialog open={!!confirmingNewVersion} onOpenChange={() => setConfirmingNewVersion(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Start New Analysis Version?</AlertDialogTitle>
                        <AlertDialogDescription>
                            An analysis for this project already exists. Do you want to start a new analysis (Version {String(confirmingNewVersion?.nextVersion).padStart(3, '0')})?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => createNewAnalysis(confirmingNewVersion!.projectId)}>Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
