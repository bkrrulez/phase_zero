

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProjects } from '../contexts/ProjectsContext';
import { useToast } from '@/hooks/use-toast';
import { getProjectAnalyses, addProjectAnalysis, getLatestProjectAnalysis, addNewProjectAnalysisVersion, deleteProjectAnalysis } from '../actions';
import { type ProjectAnalysis, type Project } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { AddAnalysisDialog, type AddAnalysisFormValues } from './components/add-analysis-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function ProjectAnalysisPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const { projects } = useProjects();
    const { toast } = useToast();

    const [analyses, setAnalyses] = React.useState<ProjectAnalysis[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
    const [confirmingNewVersion, setConfirmingNewVersion] = React.useState<{ projectId: string, nextVersion: number } | null>(null);
    const [deletingAnalysis, setDeletingAnalysis] = React.useState<ProjectAnalysis | null>(null);

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
        const { requiresConfirmation, latestAnalysis } = await addProjectAnalysis(projectId);
        if (requiresConfirmation && latestAnalysis) {
            setConfirmingNewVersion({ projectId, nextVersion: latestAnalysis.version + 1 });
        } else {
            await createNewAnalysis(projectId);
        }
    };
    
    const createNewAnalysis = async (projectId: string) => {
        try {
            const newAnalysis = await addNewProjectAnalysisVersion(projectId);
            if(newAnalysis) {
                toast({
                    title: "Analysis Started",
                    description: `A new analysis version for project has been created.`,
                });
                fetchAnalyses();
                router.push(`/dashboard/project-analysis/${newAnalysis.id}`);
            } else {
                 throw new Error("Failed to create new analysis version");
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

    const handleDeleteAnalysis = async () => {
        if (!deletingAnalysis) return;
        try {
            await deleteProjectAnalysis(deletingAnalysis.id);
            toast({ title: 'Analysis Deleted', description: `Version ${String(deletingAnalysis.version).padStart(3,'0')} has been deleted.`});
            fetchAnalyses();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete analysis.' });
        } finally {
            setDeletingAnalysis(null);
        }
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
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell></TableRow>
                                ) : analyses.length > 0 ? (
                                    analyses.map(analysis => (
                                        <TableRow key={analysis.id} onClick={() => router.push(`/dashboard/project-analysis/${analysis.id}`)} className="cursor-pointer">
                                            <TableCell className="font-medium">{getProjectName(analysis.projectId)}</TableCell>
                                            <TableCell>{String(analysis.version).padStart(3, '0')}</TableCell>
                                            <TableCell>{format(new Date(analysis.startDate), 'PPpp')}</TableCell>
                                            <TableCell>{format(new Date(analysis.lastModificationDate), 'PPpp')}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeletingAnalysis(analysis)}} className="text-destructive focus:text-destructive">
                                                           <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">No analyses started yet.</TableCell></TableRow>
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

            <AlertDialog open={!!deletingAnalysis} onOpenChange={() => setDeletingAnalysis(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete analysis version {String(deletingAnalysis?.version).padStart(3,'0')} for "{getProjectName(deletingAnalysis?.projectId || '')}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAnalysis} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
