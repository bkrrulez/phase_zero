
'use client';

import * as React from 'react';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { currentUser, type Project } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { AddProjectDialog, type ProjectFormValues } from './components/add-project-dialog';
import { EditProjectDialog } from './components/edit-project-dialog';
import { DeleteProjectDialog } from './components/delete-project-dialog';
import { useProjects } from '../../contexts/ProjectsContext';
import { useTasks } from '../../contexts/TasksContext';
import { useSystemLog } from '../../contexts/SystemLogContext';

export default function ProjectsSettingsPage() {
    const { toast } = useToast();
    const { projects, addProject, updateProject, deleteProject } = useProjects();
    const { tasks: allTasks } = useTasks();
    const { logAction } = useSystemLog();
    
    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
    const [editingProject, setEditingProject] = React.useState<Project | null>(null);
    const [deletingProject, setDeletingProject] = React.useState<Project | null>(null);

    const canManageProjects = currentUser.role === 'Super Admin';

    const projectDetails = React.useMemo(() => {
        return projects.map(project => {
            const tasks = allTasks.filter(t => project.taskIds?.includes(t.id));
            return {
                ...project,
                tasks,
            }
        });
    }, [projects, allTasks]);
    
    const formatCurrency = (value?: number) => {
        if (value === undefined || value === null) return 'N/A';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }

    const handleAddProject = (data: ProjectFormValues) => {
        addProject(data);
        setIsAddDialogOpen(false);
        toast({
            title: "Project Added",
            description: `The project "${data.name}" has been created.`,
        });
        logAction(`User '${currentUser.name}' created a new project: '${data.name}'.`);
    };

    const handleSaveProject = (projectId: string, data: ProjectFormValues) => {
        updateProject(projectId, data);
        setEditingProject(null);
        toast({
            title: "Project Updated",
            description: `The project "${data.name}" has been updated.`,
        });
        logAction(`User '${currentUser.name}' updated project: '${data.name}'.`);
    }

    const handleDeleteProject = (projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        deleteProject(projectId);
        setDeletingProject(null);
        toast({
            title: "Project Deleted",
            description: "The project has been successfully deleted.",
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
                        <h1 className="text-3xl font-bold font-headline">Projects</h1>
                        <p className="text-muted-foreground">Manage projects, their tasks, and budget.</p>
                    </div>
                    {canManageProjects && (
                        <Button onClick={() => setIsAddDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Project
                        </Button>
                    )}
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>All Projects</CardTitle>
                        <CardDescription>A list of all projects in the organization.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px]">Project</TableHead>
                                    <TableHead>Tasks</TableHead>
                                    <TableHead>Budget</TableHead>
                                    <TableHead>Details</TableHead>
                                    {canManageProjects && <TableHead><span className="sr-only">Actions</span></TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {projectDetails.map(project => (
                                    <TableRow key={project.id}>
                                        <TableCell className="font-medium">{project.name}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                                            {project.tasks.map(t => t.name).join(', ') || 'N/A'}
                                        </TableCell>
                                        <TableCell>{formatCurrency(project.budget)}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                                            {project.details || 'N/A'}
                                        </TableCell>
                                        {canManageProjects && (
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Toggle menu</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => setEditingProject(project)}>
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            onClick={() => setDeletingProject(project)}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                                {projectDetails.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">No projects created yet.</TableCell>
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
                        allTasks={allTasks}
                    />
                    {editingProject && (
                        <EditProjectDialog
                            isOpen={!!editingProject}
                            onOpenChange={(isOpen) => !isOpen && setEditingProject(null)}
                            onSaveProject={handleSaveProject}
                            project={editingProject}
                            allTasks={allTasks}
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
