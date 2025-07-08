
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
import { type Project, type Team } from '@/lib/mock-data';

const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required.'),
  projectIds: z.array(z.string()).optional(),
});

export type TeamFormValues = z.infer<typeof teamSchema>;

interface EditTeamDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaveTeam: (teamId: string, data: TeamFormValues) => void;
  team: Team;
  allProjects: Project[];
}

export function EditTeamDialog({ isOpen, onOpenChange, onSaveTeam, team, allProjects }: EditTeamDialogProps) {
  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: '',
      projectIds: [],
    },
  });

  useEffect(() => {
    if (team) {
      form.reset({
        name: team.name,
        projectIds: team.projectIds || [],
      });
    }
  }, [team, form]);

  function onSubmit(data: TeamFormValues) {
    onSaveTeam(team.id, data);
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
          <DialogDescription>
            Update the details for the team "{team.name}". Team members are managed from the Members settings page.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., The Avengers" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="projectIds"
              render={() => (
                 <FormItem>
                  <FormLabel>Associated Projects</FormLabel>
                  <FormDescription>Select which projects this team will be associated with.</FormDescription>
                  <ScrollArea className="h-32 rounded-md border p-2">
                    {allProjects.map((project) => (
                      <FormField
                        key={project.id}
                        control={form.control}
                        name="projectIds"
                        render={({ field }) => (
                           <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(project.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), project.id])
                                    : field.onChange(field.value?.filter(id => id !== project.id));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{project.name}</FormLabel>
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
