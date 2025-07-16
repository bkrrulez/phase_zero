
'use client';

import { useEffect } from 'react';
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
import { type User } from '@/lib/mock-data';
import { useProjects } from '../../contexts/ProjectsContext';
import { useTeams } from '../../contexts/TeamsContext';

const editMemberSchema = z.object({
  name: z.string().min(1, 'Full name is required.'),
  email: z.string().email('Invalid email address.'),
  role: z.enum(['Employee', 'Team Lead', 'Super Admin']),
  reportsTo: z.string().optional(),
  teamId: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().optional().nullable(),
  weeklyHours: z.coerce.number().int().min(0, 'Weekly hours cannot be negative.').max(40, 'Weekly hours cannot exceed 40.'),
  associatedProjectIds: z.array(z.string()).min(1, 'Please select at least one project.'),
}).refine(data => data.role === 'Super Admin' || !!data.reportsTo, {
    message: 'This field is required for Employees and Team Leads.',
    path: ['reportsTo'],
}).refine(data => {
    if (data.role === 'Employee' || data.role === 'Team Lead') {
        return !!data.teamId && data.teamId !== 'none';
    }
    return true;
}, {
    message: 'A team must be assigned for this role.',
    path: ['teamId'],
});


type EditMemberFormValues = z.infer<typeof editMemberSchema>;

interface EditMemberDialogProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (user: User) => void;
  teamMembers: User[];
}

export function EditMemberDialog({ user, isOpen, onOpenChange, onSave, teamMembers }: EditMemberDialogProps) {
  const { projects } = useProjects();
  const { teams } = useTeams();
  const form = useForm<EditMemberFormValues>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'Employee',
      reportsTo: '',
      teamId: '',
      startDate: '',
      endDate: '',
      weeklyHours: 40,
      associatedProjectIds: [],
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        role: user.role,
        reportsTo: user.reportsTo || '',
        teamId: user.teamId || '',
        startDate: user.contract.startDate,
        endDate: user.contract.endDate || '',
        weeklyHours: user.contract.weeklyHours,
        associatedProjectIds: user.associatedProjectIds || [],
      });
    }
  }, [user, form]);


  const roleWatcher = form.watch('role');

  useEffect(() => {
    if (roleWatcher === 'Super Admin') {
      form.setValue('reportsTo', undefined);
    }
  }, [roleWatcher, form]);

  const managers = Array.from(new Map(teamMembers.filter(m => (m.role === 'Team Lead' || m.role === 'Super Admin') && m.id !== user?.id).map(item => [item.id, item])).values());

  function onSubmit(data: EditMemberFormValues) {
    if (!user) return;

    const updatedUser: User = {
      ...user,
      name: data.name,
      email: data.email,
      role: data.role,
      reportsTo: data.reportsTo,
      teamId: (data.teamId && data.teamId !== 'none') ? data.teamId : undefined,
      associatedProjectIds: data.associatedProjectIds,
      contract: {
        ...user.contract,
        startDate: data.startDate,
        endDate: data.endDate || null,
        weeklyHours: data.weeklyHours,
      },
    };
    onSave(updatedUser);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Team Member</DialogTitle>
          <DialogDescription>
            View and edit the details for {user?.name}.
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
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Employee">Employee</SelectItem>
                            <SelectItem value="Team Lead">Team Lead</SelectItem>
                            <SelectItem value="Super Admin">Super Admin</SelectItem>
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
                        <Select onValueChange={field.onChange} value={field.value} disabled={roleWatcher === 'Super Admin'}>
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
                            <Input type="date" {...field} value={field.value || ''} />
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
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
