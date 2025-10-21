
'use client';

import * as React from 'react';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type Project } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AddProjectDialog, type ProjectFormValues } from './components/add-project-dialog';
import { EditProjectDialog } from './components/edit-project-dialog';
import { DeleteProjectDialog } from './components/delete-project-dialog';
import { useProjects } from '../../contexts/ProjectsContext';
import { useSystemLog } from '../../contexts/SystemLogContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { format } from 'date-fns';

export default function ProjectsSettingsPage() {
    const { toast } = useToast();
    const { projects, addProject, updateProject, deleteProject, getNextProjectNumber } = useProjects();
    const { logAction } = useSystemLog();
    const { currentUser } = useAuth();
    const { t } = useLanguage();
    
    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
    const [editingProject, setEditingProject] = React.useState<Project | null>(null);
    const [deletingProject, setDeletingProject] = React.useState<Project | null>(null);

    const canManageProjects = currentUser.role === 'Super Admin';

    const handleAddProject = async (data: ProjectFormValues) => {
        const nextNumber = await getNextProjectNumber();

        const newProjectData: Omit<Project, 'id'> = {
            name: data.projectName,
            projectNumber: nextNumber,
            projectCreationDate: new Date().toISOString(),
            projectManager: data.projectManager,
            creatorId: data.creator,
            address: data.address,
            projectOwner: data.projectOwner,
            yearOfConstruction: data.yearOfConstruction,
            numberOfFloors: data.numberOfFloors,
            escapeLevel: data.escapeLevel,
            listedBuilding: data.listedBuilding === 'Yes',
            protectionZone: data.protectionZone === 'Yes',
            currentUse: data.currentUse,
        };

        addProject(newProjectData);
        setIsAddDialogOpen(false);
        toast({
            title: t('projectAdded'),
            description: t('projectAddedDesc', { name: data.projectName }),
        });
        logAction(`User '${currentUser.name}' created a new project: '${data.projectName}'.`);
    };

    const handleSaveProject = (projectId: string, data: ProjectFormValues) => {
        const projectToUpdate = projects.find(p => p.id === projectId);
        if (!projectToUpdate) return;
        
        const updatedProjectData: Omit<Project, 'id'> = {
            ...projectToUpdate,
            name: data.projectName,
            projectManager: data.projectManager,
            creatorId: data.creator,
            address: data.address,
            projectOwner: data.projectOwner,
            yearOfConstruction: data.yearOfConstruction,
            numberOfFloors: data.numberOfFloors,
            escapeLevel: data.escapeLevel,
            listedBuilding: data.listedBuilding === 'Yes',
            protectionZone: data.protectionZone === 'Yes',
            currentUse: data.currentUse,
        };

        updateProject(projectId, updatedProjectData);
        setEditingProject(null);
        toast({
            title: t('projectUpdated'),
            description: t('projectUpdatedDesc', { name: data.projectName }),
        });
        logAction(`User '${currentUser.name}' updated project: '${data.projectName}'.`);
    }

    const handleDeleteProject = (projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        deleteProject(projectId);
        setDeletingProject(null);
        toast({
            title: t('projectDeleted'),
            description: t('projectDeletedDesc'),
            variant: "destructive"
        });
        if (project) {
          logAction(`User '${currentUser.name}' deleted project: '${project.name}'.`);
        }
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">{t('projects')}</h1>
                        <p className="text-muted-foreground">{t('projectsSubtitle')}</p>
                    </div>
                    {canManageProjects && (
                        <Button onClick={() => setIsAddDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> {t('addProject')}
                        </Button>
                    )}
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('allProjects')}</CardTitle>
                        <CardDescription>{t('allProjectsDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>{t('projectName')}</TableHead>
                                    <TableHead>{t('address')}</TableHead>
                                    <TableHead>{t('projectManager')}</TableHead>
                                    <TableHead>{t('creationDate')}</TableHead>
                                    {canManageProjects && <TableHead><span className="sr-only">{t('actions')}</span></TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {projects.map(project => (
                                    <TableRow key={project.id}>
                                        <TableCell className="font-mono">{project.projectNumber}</TableCell>
                                        <TableCell className="font-medium">{project.name}</TableCell>
                                        <TableCell>{project.address}</TableCell>
                                        <TableCell>{project.projectManager}</TableCell>
                                        <TableCell>{project.projectCreationDate ? format(new Date(project.projectCreationDate), 'PP') : 'N/A'}</TableCell>
                                        {canManageProjects && (
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">{t('toggleMenu')}</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => setEditingProject(project)}>
                                                            {t('edit')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            onClick={() => setDeletingProject(project)}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            {t('delete')}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                                {projects.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">{t('noProjectsCreated')}</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            {canManageProjects && (
                <>
                    <AddProjectDialog
                        isOpen={isAddDialogOpen}
                        onOpenChange={setIsAddDialogOpen}
                        onAddProject={handleAddProject}
                    />
                    {editingProject && (
                        <EditProjectDialog
                            isOpen={!!editingProject}
                            onOpenChange={(isOpen) => !isOpen && setEditingProject(null)}
                            onSaveProject={handleSaveProject}
                            project={editingProject}
                        />
                    )}
                    <DeleteProjectDialog
                        isOpen={!!deletingProject}
                        onOpenChange={(isOpen) => !isOpen && setDeletingProject(null)}
                        onDelete={handleDeleteProject}
                        project={deletingProject}
                    />
                </>
            )}
        </>
    );
}
