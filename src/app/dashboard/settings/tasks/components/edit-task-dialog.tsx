
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { type Task } from '@/lib/types';

const taskSchema = z.object({
  name: z.string().min(1, 'Task name is required.'),
  details: z.string().max(100, 'Details cannot exceed 100 characters.').optional(),
});

export type TaskFormValues = z.infer<typeof taskSchema>;

interface EditTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaveTask: (taskId: string, data: TaskFormValues) => void;
  task: Task;
}

export function EditTaskDialog({ isOpen, onOpenChange, onSaveTask, task }: EditTaskDialogProps) {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: '',
      details: '',
    },
  });

  useEffect(() => {
    if (task) {
      form.reset({
        name: task.name,
        details: task.details || '',
      });
    }
  }, [task, form]);

  const detailsWatcher = form.watch('details');

  function onSubmit(data: TaskFormValues) {
    onSaveTask(task.id, data);
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update the details for the task "{task.name}".
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Feature Development" {...field} />
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
                  <FormLabel>Details (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A short description of the task..." {...field} />
                  </FormControl>
                  <FormDescription>{detailsWatcher?.length || 0} / 100</FormDescription>
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
