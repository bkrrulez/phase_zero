'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { type ContractEndNotification } from '@/lib/types';
import { useTeams } from '../../contexts/TeamsContext';
import { useMembers } from '../../contexts/MembersContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { X as XIcon } from 'lucide-react';


const notificationSchema = z.object({
  teamIds: z.array(z.string()).min(1, 'Please select at least one team.'),
  recipientUserIds: z.array(z.string()).optional(),
  recipientEmails: z.array(z.string().email()).optional(),
  thresholdDays: z.array(z.number().int().min(1)).min(1, 'Please enter at least one threshold day.'),
}).refine(data => data.recipientUserIds?.length || data.recipientEmails?.length, {
    message: 'You must specify at least one recipient user or email.',
    path: ['recipientUserIds'], 
});

type NotificationFormValues = Omit<ContractEndNotification, 'id'>;

interface AddEditContractEndNotificationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: NotificationFormValues) => void;
  notification: ContractEndNotification | null;
}

export function AddEditContractEndNotificationDialog({
  isOpen,
  onOpenChange,
  onSave,
  notification,
}: AddEditContractEndNotificationDialogProps) {
  const { teams } = useTeams();
  const { teamMembers } = useMembers();

  const form = useForm<z.infer<typeof notificationSchema>>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      teamIds: [],
      recipientUserIds: [],
      recipientEmails: [],
      thresholdDays: [],
    },
  });
  
  const [emailInput, setEmailInput] = React.useState('');
  const [dayInput, setDayInput] = React.useState('');

  React.useEffect(() => {
    if (notification) {
      form.reset({
        teamIds: notification.teamIds,
        recipientUserIds: notification.recipientUserIds,
        recipientEmails: notification.recipientEmails,
        thresholdDays: notification.thresholdDays,
      });
    } else {
      form.reset({
        teamIds: [],
        recipientUserIds: [],
        recipientEmails: [],
        thresholdDays: [],
      });
    }
  }, [notification, form]);
  
  const handleAddEmail = () => {
    const currentEmails = form.getValues('recipientEmails') || [];
    const emailSchema = z.string().email();
    const result = emailSchema.safeParse(emailInput);
    if(result.success && !currentEmails.includes(emailInput)) {
        form.setValue('recipientEmails', [...currentEmails, emailInput]);
        setEmailInput('');
    }
  }
  
  const handleRemoveEmail = (emailToRemove: string) => {
    const currentEmails = form.getValues('recipientEmails') || [];
    form.setValue('recipientEmails', currentEmails.filter(email => email !== emailToRemove));
  }

  const handleAddDay = () => {
    const currentDays = form.getValues('thresholdDays') || [];
    const day = parseInt(dayInput, 10);
     if (!isNaN(day) && day > 0 && !currentDays.includes(day)) {
        form.setValue('thresholdDays', [...currentDays, day].sort((a,b) => a-b));
        setDayInput('');
    }
  }
  
  const handleRemoveDay = (dayToRemove: number) => {
    const currentDays = form.getValues('thresholdDays') || [];
    form.setValue('thresholdDays', currentDays.filter(day => day !== dayToRemove));
  }

  function onSubmit(data: z.infer<typeof notificationSchema>) {
    onSave(data);
    form.reset();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{notification ? 'Edit' : 'Add'} Contract End Notification</DialogTitle>
          <DialogDescription>
            Configure a rule to be notified when contracts are nearing their end date.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pl-1 pr-4">
             <FormField
                control={form.control}
                name="teamIds"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Teams</FormLabel>
                        <Controller
                            control={form.control}
                            name="teamIds"
                            render={({ field }) => (
                                <MultiSelect
                                    options={[{id: 'all-teams', name: 'All Teams'}, ...teams]}
                                    selected={field.value}
                                    onChange={field.onChange}
                                    placeholder="Select teams..."
                                />
                            )}
                        />
                         <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="recipientUserIds"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Recipient Users</FormLabel>
                        <Controller
                            control={form.control}
                            name="recipientUserIds"
                            render={({ field }) => (
                                <MultiSelect
                                    options={teamMembers}
                                    selected={field.value}
                                    onChange={field.onChange}
                                    placeholder="Select users..."
                                />
                            )}
                        />
                         <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="recipientEmails"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Recipient Emails (External)</FormLabel>
                        <div className="flex gap-2">
                             <Input
                                type="email"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                placeholder="add.email@example.com"
                            />
                            <Button type="button" variant="outline" onClick={handleAddEmail}>Add</Button>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {field.value?.map(email => (
                                <Badge key={email} variant="secondary">
                                    {email}
                                    <button type="button" onClick={() => handleRemoveEmail(email)} className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20">
                                        <XIcon className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                         <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="thresholdDays"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Threshold Days</FormLabel>
                        <FormDescription>Notify when a contract will expire in X days. Add multiple values.</FormDescription>
                        <div className="flex gap-2">
                             <Input
                                type="number"
                                value={dayInput}
                                onChange={(e) => setDayInput(e.target.value)}
                                placeholder="E.g., 7"
                            />
                            <Button type="button" variant="outline" onClick={handleAddDay}>Add</Button>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {field.value?.map(day => (
                                <Badge key={day} variant="secondary">
                                    {day} days
                                    <button type="button" onClick={() => handleRemoveDay(day)} className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20">
                                        <XIcon className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                         <FormMessage />
                    </FormItem>
                )}
            />
           
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save Notification</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


// A generic multi-select component
interface MultiSelectProps {
    options: { id: string; name: string }[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder: string;
}

const MultiSelect = ({ options, selected, onChange, placeholder }: MultiSelectProps) => {
    const [open, setOpen] = React.useState(false);

    const handleSelect = (value: string) => {
        const newSelected = selected.includes(value)
            ? selected.filter(item => item !== value)
            : [...selected, value];
        onChange(newSelected);
    };

    const getDisplayName = (id: string) => options.find(opt => opt.id === id)?.name || id;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    <div className="flex-1 text-left font-normal truncate">
                        {selected.length > 0 ? selected.map(getDisplayName).join(', ') : placeholder}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="Search..." />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                            {options.map(option => (
                                <CommandItem
                                    key={option.id}
                                    value={option.name}
                                    onSelect={() => handleSelect(option.id)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selected.includes(option.id) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
