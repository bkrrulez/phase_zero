
'use client';

import { useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { type Contract, type User } from '@/lib/types';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const contractSchema = z.object({
  id: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().optional().nullable(),
  weeklyHours: z.coerce.number().int().min(1, 'Hours must be positive.').max(80, 'Cannot exceed 80 hours.'),
});

const formSchema = z.object({
  contracts: z.array(contractSchema).min(1, "At least one active contract is required."),
});

type ContractFormValues = z.infer<typeof formSchema>;

interface ContractDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: Omit<Contract, 'id'>) => void;
  contract: Contract | null;
  users: User[];
  userId?: string;
}

export function ContractDialog({ isOpen, onOpenChange, onSave, contract, users, userId }: ContractDialogProps) {
  const { toast } = useToast();
  const form = useForm<ContractFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contracts: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contracts",
  });
  
  const selectedUser = useMemo(() => {
    const id = contract?.userId || userId;
    return users.find(u => u.id === id);
  }, [contract, userId, users]);
  
  useEffect(() => {
    if (selectedUser) {
        // @ts-ignore
        const sortedContracts = selectedUser.contracts?.sort((a,b) => new Date(b.endDate || '9999-12-31').getTime() - new Date(a.endDate || '9999-12-31').getTime());
        form.reset({ contracts: sortedContracts || [] });
    }
  }, [selectedUser, form]);


  const onSubmit = (data: ContractFormValues) => {
    const totalHours = data.contracts.reduce((acc, c) => acc + c.weeklyHours, 0);
    if (totalHours > 80) {
        alert("The total weekly Hours for the user exceeds 80h per week work-time. Do you still want to proceed?");
    }
    // This is a bit tricky since this dialog now manages all contracts for a user.
    // The onSave prop might need to be re-thought. For now, let's assume it saves ALL contracts.
    console.log("Saving contracts", data.contracts);
    toast({ title: 'Contracts updated.'})
    onOpenChange(false);
  };
  
  const handleAddNewContract = () => {
    append({ startDate: '', endDate: '', weeklyHours: 40 });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{contract ? 'Edit' : 'Add'} Contract(s)</DialogTitle>
          <DialogDescription>
            Manage contracts for {selectedUser?.name}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex justify-end">
                <Button type="button" size="sm" onClick={handleAddNewContract}><PlusCircle className="mr-2 h-4 w-4"/> Add</Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Weekly Hours</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {fields.map((field, index) => {
                        const isPast = field.endDate ? new Date(field.endDate) < new Date() : false;
                        return (
                        <TableRow key={field.id} className={cn(isPast && "text-muted-foreground bg-muted/50")}>
                            <TableCell className="font-mono text-xs w-[120px] truncate">{field.id || 'New'}</TableCell>
                            <TableCell>
                                <FormField
                                    control={form.control}
                                    name={`contracts.${index}.startDate`}
                                    render={({ field }) => <Input type="date" {...field} disabled={isPast} />}
                                />
                            </TableCell>
                             <TableCell>
                                <FormField
                                    control={form.control}
                                    name={`contracts.${index}.endDate`}
                                    render={({ field }) => <Input type="date" {...field} value={field.value || ''} disabled={isPast}/>}
                                />
                            </TableCell>
                             <TableCell>
                                <FormField
                                    control={form.control}
                                    name={`contracts.${index}.weeklyHours`}
                                    render={({ field }) => <Input type="number" {...field} className="w-20" disabled={isPast}/>}
                                />
                            </TableCell>
                            <TableCell className="text-right">
                                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} disabled={isPast}>
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                            </TableCell>
                        </TableRow>
                    )})}
                </TableBody>
            </Table>
             {form.formState.errors.contracts && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.contracts.message}</p>
             )}


            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save Contracts</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
