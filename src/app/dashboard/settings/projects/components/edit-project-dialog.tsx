
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { type Task, type Project } from '@/lib/mock-data';

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required.'),
  taskIds: z.array(z.string()).optional(),
  budget: z.coerce.number().min(0, { message: 'Budget cannot be a negative number.' }).optional(),
  details: z.string().max(100, 'Details cannot exceed 100 characters.').optional(),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;

interface EditProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaveProject: (projectId: string, data: ProjectFormValues) => void;
  project: Project;
  allTasks: Task[];
}

export function EditProjectDialog({ isOpen, onOpenChange, onSaveProject, project, allTasks }: EditProjectDialogProps) {
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      taskIds: [],
      budget: undefined,
      details: '',
    },
  });

  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        taskIds: project.taskIds || [],
        budget: project.budget,
        details: project.details || '',
      });
    }
  }, [project, form]);

  const detailsWatcher = form.watch('details');

  function onSubmit(data: ProjectFormValues) {
    onSaveProject(project.id, data);
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update the details for the project "{project.name}".
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pl-1 pr-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Website Redesign" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget ($)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="50000" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A short description of the project..." {...field} />
                  </FormControl>
                  <FormDescription>{detailsWatcher?.length || 0} / 100</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="taskIds"
              render={() => (
                 <FormItem>
                  <FormLabel>Associated Tasks</FormLabel>
                  <ScrollArea className="h-32 rounded-md border p-2">
                    {allTasks.map((task) => (
                      <FormField
                        key={task.id}
                        control={form.control}
                        name="taskIds"
                        render={({ field }) => (
                           <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(task.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), task.id])
                                    : field.onChange(field.value?.filter(id => id !== task.id));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{task.name}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                    </ScrollArea>
                   <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
