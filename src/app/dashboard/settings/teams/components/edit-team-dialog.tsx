
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type User, type Project, type Team } from '@/lib/mock-data';

const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required.'),
  leadId: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
  projectIds: z.array(z.string()).optional(),
});

export type TeamFormValues = z.infer<typeof teamSchema>;

interface EditTeamDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaveTeam: (teamId: string, data: TeamFormValues) => void;
  team: Team;
  allUsers: User[];
  allProjects: Project[];
}

export function EditTeamDialog({ isOpen, onOpenChange, onSaveTeam, team, allUsers, allProjects }: EditTeamDialogProps) {
  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: '',
      leadId: '',
      memberIds: [],
      projectIds: [],
    },
  });

  useEffect(() => {
    if (team) {
      const currentLead = allUsers.find(u => u.teamId === team.id && u.role === 'Team Lead');
      const currentMembers = allUsers.filter(u => u.teamId === team.id && u.role === 'Employee');
      
      form.reset({
        name: team.name,
        leadId: currentLead?.id || '',
        memberIds: currentMembers.map(m => m.id),
        projectIds: team.projectIds || [],
      });
    }
  }, [team, allUsers, form]);

  const availableLeads = allUsers.filter(u => u.role === 'Team Lead' && (!u.teamId || u.teamId === team.id));
  const availableMembers = allUsers.filter(u => u.role === 'Employee' && (!u.teamId || u.teamId === team.id));

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
            Update the details for the team "{team.name}".
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
              name="leadId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Lead</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team lead" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {availableLeads.map(lead => (
                        <SelectItem key={lead.id} value={lead.id}>{lead.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="memberIds"
              render={() => (
                <FormItem>
                  <FormLabel>Team Members</FormLabel>
                  <ScrollArea className="h-32 rounded-md border p-2">
                    {availableMembers.map((member) => (
                      <FormField
                        key={member.id}
                        control={form.control}
                        name="memberIds"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(member.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), member.id])
                                    : field.onChange(field.value?.filter(id => id !== member.id));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{member.name}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                    {availableMembers.length === 0 && <p className='text-sm text-muted-foreground p-2'>No available members</p>}
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="projectIds"
              render={() => (
                 <FormItem>
                  <FormLabel>Projects</FormLabel>
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
