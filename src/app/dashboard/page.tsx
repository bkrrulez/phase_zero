
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
        <Card 
            className="aspect-[5/3] flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors bg-muted/50"
            style={{height: 'auto', aspectRatio: '5/3.5'}}
            onClick={onClick}
        >
            <CardContent className="p-0 flex flex-col items-center gap-2">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-background">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-muted-foreground">{t('addProject')}</p>
            </CardContent>
        </Card>
    );
};

const ProjectCard = ({ project, onEdit, onDelete }: { project: Project; onEdit: () => void; onDelete: () => void }) => {
    return (
        <Card 
            className="group relative overflow-hidden transition-all hover:shadow-md border-0"
            style={{height: 'auto', aspectRatio: '5/3.5'}}
        >
            <div 
                className="absolute inset-0 transition-colors cursor-pointer"
                onClick={onEdit}
             >
                <FolderIcon className="w-full h-full" />
             </div>

            <div className="absolute top-0 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-black/10 hover:text-white">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onEdit}>
                            <Edit className="mr-2 h-4 w-4"/> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4"/> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            
            <CardContent className="p-4 h-full flex flex-col justify-between relative text-white">
                <div className="flex justify-between items-start">
                    <span className="text-xs font-mono opacity-80">#{project.projectNumber}</span>
                </div>
                <div className="text-center">
                    <p className="font-bold text-lg truncate">{project.name}</p>
                </div>
                <div>
                     <p className="text-sm opacity-80 truncate">{project.address}</p>
                </div>
            </CardContent>
        </Card>
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
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
