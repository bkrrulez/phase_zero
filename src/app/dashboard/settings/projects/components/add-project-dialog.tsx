
'use client';

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
import { type Task } from '@/lib/types';

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required.'),
  taskIds: z.array(z.string()).optional(),
  budget: z.coerce.number().min(0, { message: 'Budget cannot be a negative number.' }).optional(),
  hoursPerYear: z.coerce.number().min(0, { message: 'Hours cannot be a negative number.' }).optional(),
  details: z.string().max(100, 'Details cannot exceed 100 characters.').optional(),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;

interface AddProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddProject: (data: ProjectFormValues) => void;
  allTasks: Task[];
}

export function AddProjectDialog({ isOpen, onOpenChange, onAddProject, allTasks }: AddProjectDialogProps) {
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      taskIds: [],
      budget: undefined,
      hoursPerYear: undefined,
      details: '',
    },
  });

  const detailsWatcher = form.watch('details');

  function onSubmit(data: ProjectFormValues) {
    onAddProject(data);
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new project.
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
                    <Input type="number" placeholder="50000" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="hoursPerYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hours per Year</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="1200" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)} />
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
                  <ScrollArea className="h-56 rounded-md border p-2">
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
              <Button type="submit">Add Project</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
