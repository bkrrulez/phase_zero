
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type User } from '@/lib/types';
import { useProjects } from '../../contexts/ProjectsContext';
import { useTeams } from '../../contexts/TeamsContext';
import { useAuth } from '../../contexts/AuthContext';

const addMemberSchema = z.object({
  name: z.string().min(1, 'Full name is required.'),
  email: z.string().email('Invalid email address.'),
  role: z.enum(['User', 'Team Lead', 'Super Admin', 'Expert']),
  reportsTo: z.string().optional(),
  teamId: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().optional().nullable(),
  weeklyHours: z.coerce.number().int().min(0, 'Weekly hours cannot be negative.').max(40, 'Weekly hours cannot exceed 40.'),
  associatedProjectIds: z.array(z.string()).min(1, 'Please select at least one project.'),
}).refine(data => data.role === 'Super Admin' || !!data.reportsTo, {
    message: 'This field is required for Users and Team Leads.',
    path: ['reportsTo'],
}).refine(data => {
    if (data.role === 'User' || data.role === 'Team Lead' || data.role === 'Expert') {
        return !!data.teamId && data.teamId !== 'none';
    }
    return true;
}, {
    message: 'A team must be assigned for this role.',
    path: ['teamId'],
});


type AddMemberFormValues = z.infer<typeof addMemberSchema>;

interface AddMemberDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddMember: (user: Omit<User, 'id' | 'avatar' | 'contract'> & { contracts: Omit<User['contracts'][0], 'id'>[] }) => void;
  teamMembers: User[];
}

export function AddMemberDialog({ isOpen, onOpenChange, onAddMember, teamMembers }: AddMemberDialogProps) {
  const { currentUser } = useAuth();
  const { projects } = useProjects();
  const { teams } = useTeams();
  const form = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'User',
      reportsTo: '',
      teamId: '',
      startDate: '',
      endDate: '',
      weeklyHours: 40,
      associatedProjectIds: [],
    },
  });

  const roleWatcher = form.watch('role');

  React.useEffect(() => {
    if (roleWatcher === 'Super Admin') {
      form.setValue('reportsTo', undefined);
    }
  }, [roleWatcher, form]);
  
  const availableRoles = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Super Admin') {
        return ['User', 'Team Lead', 'Expert', 'Super Admin'];
    }
    if (currentUser.role === 'Team Lead') {
        return ['User', 'Team Lead', 'Expert'];
    }
    return [];
  }, [currentUser]);

  const managers = Array.from(new Map(teamMembers.filter(m => m.role === 'Team Lead' || m.role === 'Super Admin').map(item => [item.id, item])).values());

  function onSubmit(data: AddMemberFormValues) {
    const newUser = {
      name: data.name,
      email: data.email,
      role: data.role,
      reportsTo: data.reportsTo,
      teamId: (data.teamId && data.teamId !== 'none') ? data.teamId : undefined,
      associatedProjectIds: data.associatedProjectIds,
      contracts: [{
        startDate: data.startDate,
        endDate: data.endDate || null,
        weeklyHours: data.weeklyHours,
      }],
    };
    onAddMember(newUser);
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Team Member</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new member to your team.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pl-1 pr-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableRoles.map(role => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                    control={form.control}
                    name="reportsTo"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Reports To</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={roleWatcher === 'Super Admin'}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a manager" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {managers.map(manager => (
                                <SelectItem key={manager.id} value={manager.id}>{manager.name}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
                control={form.control}
                name="teamId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Team</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="none">No Team</SelectItem>
                            {teams.map(team => (
                                <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Contract Start Date</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Contract End Date</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
                control={form.control}
                name="weeklyHours"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Weekly Contract Hours</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
              control={form.control}
              name="associatedProjectIds"
              render={({ field }) => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Associated Projects</FormLabel>
                    <FormDescription>
                      Select the projects this team member will be working on.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                  {projects.map((project) => (
                    <FormItem
                      key={project.id}
                      className="flex flex-row items-start space-x-3 space-y-0"
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(project.id)}
                          onCheckedChange={(checked) => {
                            return checked
                              ? field.onChange([...(field.value || []), project.id])
                              : field.onChange(
                                  field.value?.filter(
                                    (value) => value !== project.id
                                  )
                                )
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {project.name}
                      </FormLabel>
                    </FormItem>
                  ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Add Member</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
