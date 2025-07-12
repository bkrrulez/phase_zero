
'use client';

import * as React from 'react';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type Task } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { AddTaskDialog, type TaskFormValues } from './components/add-task-dialog';
import { EditTaskDialog } from './components/edit-task-dialog';
import { DeleteTaskDialog } from './components/delete-task-dialog';
import { useTasks } from '../../contexts/TasksContext';
import { useSystemLog } from '../../contexts/SystemLogContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function TasksSettingsPage() {
    const { toast } = useToast();
    const { tasks, addTask, updateTask, deleteTask } = useTasks();
    const { logAction } = useSystemLog();
    const { currentUser } = useAuth();
    const { t } = useLanguage();
    
    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
    const [editingTask, setEditingTask] = React.useState<Task | null>(null);
    const [deletingTask, setDeletingTask] = React.useState<Task | null>(null);

    const canManageTasks = currentUser.role === 'Super Admin';

    const handleAddTask = (data: TaskFormValues) => {
        addTask(data);
        setIsAddDialogOpen(false);
        toast({
            title: t('taskAdded'),
            description: t('taskAddedDesc', { name: data.name }),
        });
        logAction(`User '${currentUser.name}' created a new task: '${data.name}'.`);
    };

    const handleSaveTask = (taskId: string, data: TaskFormValues) => {
        updateTask(taskId, data);
        setEditingTask(null);
        toast({
            title: t('taskUpdated'),
            description: t('taskUpdatedDesc', { name: data.name }),
        });
        logAction(`User '${currentUser.name}' updated task: '${data.name}'.`);
    }

    const handleDeleteTask = (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        deleteTask(taskId);
        setDeletingTask(null);
        toast({
            title: t('taskDeleted'),
            description: t('taskDeletedDesc'),
            variant: "destructive"
        });
        if (task) {
          logAction(`User '${currentUser.name}' deleted task: '${task.name}'.`);
        }
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">{t('tasks')}</h1>
                        <p className="text-muted-foreground">{t('tasksSubtitle')}</p>
                    </div>
                    {canManageTasks && (
                        <Button onClick={() => setIsAddDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> {t('addTask')}
                        </Button>
                    )}
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('allTasks')}</CardTitle>
                        <CardDescription>{t('allTasksDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('task')}</TableHead>
                                    <TableHead>{t('details')}</TableHead>
                                    {canManageTasks && <TableHead><span className="sr-only">{t('actions')}</span></TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tasks.map(task => (
                                    <TableRow key={task.id}>
                                        <TableCell className="font-medium">{task.name}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground max-w-[400px] truncate">
                                            {task.details || 'N/A'}
                                        </TableCell>
                                        {canManageTasks && (
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
                                                        <DropdownMenuItem onClick={() => setEditingTask(task)}>
                                                            {t('edit')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            onClick={() => setDeletingTask(task)}
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
                                {tasks.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">{t('noTasksCreated')}</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            {canManageTasks && (
                <>
                    <AddTaskDialog
                        isOpen={isAddDialogOpen}
                        onOpenChange={setIsAddDialogOpen}
                        onAddTask={handleAddTask}
                    />
                    {editingTask && (
                        <EditTaskDialog
                            isOpen={!!editingTask}
                            onOpenChange={(isOpen) => !isOpen && setEditingTask(null)}
                            onSaveTask={handleSaveTask}
                            task={editingTask}
                        />
                    )}
                    <DeleteTaskDialog
                        isOpen={!!deletingTask}
                        onOpenChange={(isOpen) => !isOpen && setDeletingTask(null)}
                        onDelete={handleDeleteTask}
                        task={deletingTask}
                    />
                </>
            )}
        </>
    );
}
