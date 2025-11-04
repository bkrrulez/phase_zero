
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Project } from '@/lib/types';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  projectId: z.string().min(1, 'Please select a project.'),
});

export type AddAnalysisFormValues = z.infer<typeof formSchema>;

interface AddAnalysisDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onStartAnalysis: (data: AddAnalysisFormValues) => void;
  projects: Project[];
}

export function AddAnalysisDialog({ isOpen, onOpenChange, onStartAnalysis, projects }: AddAnalysisDialogProps) {
  const router = useRouter();
  const form = useForm<AddAnalysisFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: '',
    },
  });

  function onSubmit(data: AddAnalysisFormValues) {
    onStartAnalysis(data);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Project Analysis</DialogTitle>
          <DialogDescription>
            Select a project to begin a new analysis.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Analysis</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
