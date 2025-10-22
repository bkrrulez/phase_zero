'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useProjects } from './contexts/ProjectsContext';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';
import { type Project } from '@/lib/types';
import { AddProjectDialog, type ProjectFormValues } from './settings/projects/components/add-project-dialog';
import { EditProjectDialog } from './settings/projects/components/edit-project-dialog';
import { DeleteProjectDialog } from './settings/projects/components/delete-project-dialog';
import { useToast } from '@/hooks/use-toast';
import { useSystemLog } from './contexts/SystemLogContext';
import { FolderIcon } from '@/components/ui/folder-icon';


const AddProjectCard = ({ onClick }: { onClick: () => void }) => {
    const { t } = useLanguage();
    return (
        <div 
            className="group relative overflow-hidden rounded-lg transition-all hover:shadow-md aspect-[5/3] cursor-pointer bg-muted/50 flex items-center justify-center hover:bg-muted/80"
            onClick={onClick}
        >
             <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-background border-2 border-dashed">
                    <Plus className="h-6 w-6" />
                </div>
                <p className="font-medium">{t('addProject')}</p>
            </div>
        </div>
    );
};

const ProjectCard = ({ project, onEdit, onDelete }: { project: Project; onEdit: () => void; onDelete: () => void }) => {
    return (
        <div 
            className="group relative overflow-hidden transition-all hover:shadow-md aspect-[5/3] cursor-pointer"
            onClick={onEdit}
        >
            <FolderIcon className="w-full h-full" project={project} />

            <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground/80 hover:bg-black/20 hover:text-white">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                             Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive focus:text-destructive">
                             Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};


export default function ProjectDashboardPage() {
    const { currentUser } = useAuth();
    const { projects, addProject, updateProject, deleteProject } = useProjects();
    const { toast } = useToast();
    const { logAction } = useSystemLog();
    const { t } = useLanguage();
    const router = useRouter();

    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
    const [editingProject, setEditingProject] = React.useState<Project | null>(null);
    const [deletingProject, setDeletingProject] = React.useState<Project | null>(null);

    const userProjects = React.useMemo(() => {
        if (!currentUser) return [];
        if (currentUser.role === 'Super Admin') {
            return projects;
        }
        return projects.filter(p => currentUser.associatedProjectIds?.includes(p.id));
    }, [projects, currentUser]);

    const handleAddProject = async (data: ProjectFormValues) => {
        const newProjectData: Omit<Project, 'id' | 'projectNumber' | 'projectCreationDate'> = {
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

        await addProject(newProjectData);
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
                <div>
                    <h1 className="text-3xl font-bold font-headline">Project Dashboard</h1>
                    <p className="text-muted-foreground">{t('welcomeSubtitle')}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                    <AddProjectCard onClick={() => setIsAddDialogOpen(true)} />
                    {userProjects.map(project => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            onEdit={() => setEditingProject(project)}
                            onDelete={() => setDeletingProject(project)}
                        />
                    ))}
                </div>
            </div>

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
    );
}
