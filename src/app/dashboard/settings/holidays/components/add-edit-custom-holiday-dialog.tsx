
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { type CustomHoliday } from '@/lib/mock-data';
import { useTeams } from '@/app/dashboard/contexts/TeamsContext';

const holidaySchema = z.object({
  country: z.string().min(1, 'Country is required.'),
  name: z.string().min(1, 'Holiday name is required.'),
  date: z.date({ required_error: 'A date is required.' }),
  type: z.enum(['Full Day', 'Half Day']),
  appliesTo: z.string().min(1, 'This field is required.'),
});

export type CustomHolidayFormValues = z.infer<typeof holidaySchema>;

interface AddEditCustomHolidayDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: CustomHolidayFormValues) => void;
  holiday: CustomHoliday | null;
}

export function AddEditCustomHolidayDialog({ isOpen, onOpenChange, onSave, holiday }: AddEditCustomHolidayDialogProps) {
  const { teams } = useTeams();
  const form = useForm<CustomHolidayFormValues>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      country: '',
      name: '',
      date: new Date(),
      type: 'Full Day',
      appliesTo: 'all-members'
    },
  });
  
  useEffect(() => {
    if (holiday) {
      form.reset({
        country: holiday.country,
        name: holiday.name,
        date: new Date(holiday.date),
        type: holiday.type,
        appliesTo: holiday.appliesTo,
      });
    } else {
      form.reset({
        country: '',
        name: '',
        date: new Date(),
        type: 'Full Day',
        appliesTo: 'all-members'
      });
    }
  }, [holiday, form]);

  function onSubmit(data: CustomHolidayFormValues) {
    onSave(data);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{holiday ? 'Edit' : 'Add'} Custom Holiday</DialogTitle>
          <DialogDescription>
            {holiday ? 'Update the details for this holiday.' : 'Fill in the details for the new custom holiday.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Global" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Holiday Name</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Company Anniversary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Full Day">Full Day</SelectItem>
                        <SelectItem value="Half Day">Half Day</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="appliesTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Applies To</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select who this applies to" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all-members">All Members</SelectItem>
                        <SelectItem value="all-teams">All Teams</SelectItem>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save Holiday</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
