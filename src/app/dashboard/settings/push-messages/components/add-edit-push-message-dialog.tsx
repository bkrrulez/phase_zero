
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { type PushMessage } from '@/lib/mock-data';
import { useTeams } from '@/app/dashboard/contexts/TeamsContext';
import { format } from 'date-fns';

const messageSchema = z.object({
    context: z.string().min(1, 'Context is required.').max(20, 'Context cannot exceed 20 characters.'),
    messageBody: z.string().min(1, 'Message body is required.').max(50, 'Message body cannot exceed 50 characters.'),
    startDateTime: z.string().min(1, 'Start date and time are required.'),
    endDateTime: z.string().min(1, 'End date and time are required.'),
    receiversType: z.enum(['all-members', 'all-teams', 'individual-teams']),
    teamIds: z.array(z.string()).optional(),
}).refine(data => {
    return new Date(data.endDateTime) > new Date(data.startDateTime);
}, {
    message: 'End date and time must be after the start date and time.',
    path: ['endDateTime'],
}).refine(data => {
    return data.receiversType !== 'individual-teams' || (data.teamIds && data.teamIds.length > 0);
}, {
    message: 'Please select at least one team.',
    path: ['teamIds'],
});

export type PushMessageFormValues = {
  context: string;
  messageBody: string;
  startDateTime: string;
  endDateTime: string;
  receivers: 'all-members' | 'all-teams' | string[];
}

interface AddEditPushMessageDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: PushMessageFormValues) => void;
  message: PushMessage | null;
}

export function AddEditPushMessageDialog({ isOpen, onOpenChange, onSave, message }: AddEditPushMessageDialogProps) {
  const { toast } = useToast();
  const { teams } = useTeams();
  
  const form = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      context: '',
      messageBody: '',
      startDateTime: '',
      endDateTime: '',
      receiversType: 'all-members',
      teamIds: [],
    },
  });

  React.useEffect(() => {
    if (message) {
      let receiversType: 'all-members' | 'all-teams' | 'individual-teams' = 'all-members';
      if (message.receivers === 'all-teams') {
          receiversType = 'all-teams';
      } else if (Array.isArray(message.receivers)) {
          receiversType = 'individual-teams';
      }
      
      form.reset({
        context: message.context,
        messageBody: message.messageBody,
        startDateTime: format(new Date(message.startDate), "yyyy-MM-dd'T'HH:mm"),
        endDateTime: format(new Date(message.endDate), "yyyy-MM-dd'T'HH:mm"),
        receiversType,
        teamIds: Array.isArray(message.receivers) ? message.receivers : [],
      });
    } else {
      form.reset({
        context: '',
        messageBody: '',
        startDateTime: '',
        endDateTime: '',
        receiversType: 'all-members',
        teamIds: [],
      });
    }
  }, [message, form]);

  const receiversTypeWatcher = form.watch('receiversType');
  const messageBodyWatcher = form.watch('messageBody');
  const contextWatcher = form.watch('context');

  function onSubmit(data: z.infer<typeof messageSchema>) {
    let receivers: 'all-members' | 'all-teams' | string[];
    if (data.receiversType === 'individual-teams') {
        receivers = data.teamIds || [];
    } else {
        receivers = data.receiversType;
    }

    onSave({
        context: data.context,
        messageBody: data.messageBody,
        startDateTime: data.startDateTime,
        endDateTime: data.endDateTime,
        receivers: receivers,
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{message ? 'Edit' : 'Add'} Push Message</DialogTitle>
          <DialogDescription>
            {message ? 'Update the details for this message.' : 'Fill in the details to create a new message.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
            <FormField
              control={form.control}
              name="context"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Context</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., System Maintenance" {...field} />
                  </FormControl>
                  <FormDescription>{contextWatcher?.length || 0} / 20</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="messageBody"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message Body</FormLabel>
                  <FormControl>
                    <Textarea placeholder="The system will be down for maintenance..." {...field} />
                  </FormControl>
                  <FormDescription>{messageBodyWatcher?.length || 0} / 50</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="receiversType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receivers</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select receivers" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all-members">All Members</SelectItem>
                      <SelectItem value="all-teams">All Teams</SelectItem>
                      <SelectItem value="individual-teams">Individual Teams</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {receiversTypeWatcher === 'individual-teams' && (
              <FormField
                control={form.control}
                name="teamIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Select Teams</FormLabel>
                    <ScrollArea className="h-32 rounded-md border p-2">
                      {teams.map((team) => (
                        <FormField
                          key={team.id}
                          control={form.control}
                          name="teamIds"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(team.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), team.id])
                                      : field.onChange(field.value?.filter((id) => id !== team.id));
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">{team.name}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </ScrollArea>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save Message</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
