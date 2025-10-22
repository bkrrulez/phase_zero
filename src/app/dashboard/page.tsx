
'use client';

import * as React from 'react';
import { MoreHorizontal, Plus, Check, ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
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
            className="relative w-full"
            style={{ paddingBottom: '60%' }} // 5:3 aspect ratio
            onClick={onClick}
        >
            <div 
                className="absolute inset-0 group overflow-hidden rounded-lg transition-all cursor-pointer bg-muted/50 hover:bg-muted/80"
            >
                 <svg viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <circle cx="50" cy="26" r="10" stroke="hsl(var(--foreground) / 0.3)" strokeWidth="1" strokeDasharray="3 3" />
                    <path d="M47 26 L53 26 M50 23 L50 29" stroke="hsl(var(--foreground) / 0.5)" strokeWidth="1.5" strokeLinecap="round" />
                    <text
                        x="50"
                        y="48"
                        textAnchor="middle"
                        className="text-[8px] font-medium fill-muted-foreground"
                    >
                        {t('addProject')}
                    </text>
                </svg>
            </div>
        </div>
    );
};

const ProjectCard = ({ project, onEdit, onDelete }: { project: Project; onEdit: () => void; onDelete: () => void }) => {
    return (
        <div 
            className="relative w-full"
            style={{ paddingBottom: '60%' }} // 5:3 aspect ratio
        >
            <div 
                className="absolute inset-0 group overflow-hidden transition-all hover:shadow-md cursor-pointer"
                onClick={onEdit}
            >
                <FolderIcon className="w-full h-full" project={project} />

                <div className="absolute top-1 right-1 z-10">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-black hover:bg-black/20 hover:text-white">
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
        </div>
    );
};


export default function ProjectDashboardPage() {
    const { currentUser } = useAuth();
    const { projects, addProject, updateProject, deleteProject } = useProjects();
    const { toast } = useToast();
    const { logAction } = useSystemLog();
    const { t } = useLanguage();
    
    type SortByType = 'creationDate' | 'name' | 'projectNumber';
    const [sortBy, setSortBy] = React.useState<SortByType>('creationDate');
    const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');

    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
    const [editingProject, setEditingProject] = React.useState<Project | null>(null);
    const [deletingProject, setDeletingProject] = React.useState<Project | null>(null);

    const handleSortChange = (sortKey: SortByType) => {
        if (sortBy === sortKey) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(sortKey);
            setSortDirection('desc'); // Default to descending for new sort key
        }
    };

    const userProjects = React.useMemo(() => {
        if (!currentUser) return [];
        
        let filteredProjects: Project[];
        if (currentUser.role === 'Super Admin') {
            filteredProjects = [...projects];
        } else {
            filteredProjects = projects.filter(p => currentUser.associatedProjectIds?.includes(p.id));
        }

        filteredProjects.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'name') {
                comparison = a.name.localeCompare(b.name);
            } else if (sortBy === 'projectNumber') {
                comparison = a.projectNumber.localeCompare(b.projectNumber);
            } else { // creationDate
                comparison = new Date(b.projectCreationDate).getTime() - new Date(a.projectCreationDate).getTime();
            }

            return sortDirection === 'asc' ? -comparison : comparison;
        });
        
        return filteredProjects;
    }, [projects, currentUser, sortBy, sortDirection]);

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
    
    const renderSortIcon = () => {
        const Icon = sortDirection === 'asc' ? ArrowUp : ArrowDown;
        return <Icon className="ml-2 h-4 w-4" />;
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">{t('projectDashboard')}</h1>
                        <p className="text-muted-foreground">{t('welcomeSubtitle')}</p>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                Sort By
                                {renderSortIcon()}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSortChange('creationDate')}>
                                <Check className={`mr-2 h-4 w-4 ${sortBy === 'creationDate' ? 'opacity-100' : 'opacity-0'}`} />
                                By Creation Date
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSortChange('name')}>
                                 <Check className={`mr-2 h-4 w-4 ${sortBy === 'name' ? 'opacity-100' : 'opacity-0'}`} />
                                By Name
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSortChange('projectNumber')}>
                                 <Check className={`mr-2 h-4 w-4 ${sortBy === 'projectNumber' ? 'opacity-100' : 'opacity-0'}`} />
                                By Project Number
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6">
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

