
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Contract, type User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const contractFormSchema = z.object({
  userId: z.string().min(1, 'A user must be selected.'),
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().optional().nullable(),
});

type ContractFormValues = z.infer<typeof contractFormSchema>;

interface ContractDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: Omit<Contract, 'id'>, contractId?: string) => void;
  contract: Contract | null;
  users: User[];
  userId?: string; // Optional userId for pre-selection
}

export function ContractDialog({ isOpen, onOpenChange, onSave, contract, users, userId }: ContractDialogProps) {
  const { toast } = useToast();
  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      userId: '',
      startDate: '',
      endDate: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
        if (contract) {
            form.reset({
                userId: contract.userId,
                startDate: contract.startDate,
                endDate: contract.endDate || '',
            });
        } else {
             form.reset({
                userId: userId || '',
                startDate: '',
                endDate: '',
            });
        }
    }
  }, [contract, isOpen, form, userId]);

  const onSubmit = (data: ContractFormValues) => {
    onSave({
      ...data,
      endDate: data.endDate || null,
    }, contract?.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{contract ? 'Edit' : 'Add'} Access Period</DialogTitle>
          <DialogDescription>
            {contract ? `Editing access period #${contract.id}` : 'Add a new access period for a user.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value} disabled={!!contract}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Start Date</FormLabel>
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
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save Access Period</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
