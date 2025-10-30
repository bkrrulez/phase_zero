
'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';

const importSettingSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'Column name is required.'),
    isMandatory: z.boolean(),
    type: z.enum(['Free Text', 'Drop Down', 'Table']),
    values: z.string().optional(),
});

const formSchema = z.object({
  settings: z.array(importSettingSchema),
});

export type ImportSetting = z.infer<typeof importSettingSchema>;

interface ImportSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  settings: ImportSetting[];
  onSave: (settings: ImportSetting[]) => void;
}

export function ImportSettingsDialog({ isOpen, onOpenChange, settings, onSave }: ImportSettingsDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      settings: settings,
    },
  });
  
  React.useEffect(() => {
    form.reset({ settings });
  }, [settings, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'settings',
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    onSave(data.settings);
  };

  const addNewSetting = () => {
    append({
        id: `new-${Date.now()}`,
        name: '',
        isMandatory: false,
        type: 'Free Text',
        values: ''
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div>
                <DialogTitle>Import Settings</DialogTitle>
                <DialogDescription>
                Configure the columns to be imported from your rule book files.
                </DialogDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addNewSetting}>
                <PlusCircle className="mr-2 h-4 w-4"/> Add New
            </Button>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Column Name</TableHead>
                    <TableHead className="w-[120px] text-center">Mandatory</TableHead>
                    <TableHead className="w-[180px]">Column Type</TableHead>
                    <TableHead>Values</TableHead>
                    <TableHead className="w-[80px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                     const columnType = form.watch(`settings.${index}.type`);
                     const isDefault = field.id.startsWith('col-');

                     return (
                        <TableRow key={field.id}>
                        <TableCell>
                            <FormField
                                control={form.control}
                                name={`settings.${index}.name`}
                                render={({ field }) => (
                                    <Input {...field} disabled={isDefault} />
                                )}
                            />
                        </TableCell>
                        <TableCell className="text-center">
                             <FormField
                                control={form.control}
                                name={`settings.${index}.isMandatory`}
                                render={({ field }) => (
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isDefault} />
                                )}
                            />
                        </TableCell>
                        <TableCell>
                             <FormField
                                control={form.control}
                                name={`settings.${index}.type`}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isDefault}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Free Text">Free Text</SelectItem>
                                            <SelectItem value="Drop Down">Drop Down</SelectItem>
                                            <SelectItem value="Table">Table</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </TableCell>
                        <TableCell>
                             <FormField
                                control={form.control}
                                name={`settings.${index}.values`}
                                render={({ field }) => (
                                    <Input {...field} placeholder="Comma-separated values" disabled={columnType === 'Free Text' || columnType === 'Table'} />
                                )}
                            />
                        </TableCell>
                        <TableCell className="text-right">
                           {!isDefault && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                </Button>
                           )}
                        </TableCell>
                        </TableRow>
                     )
                  })}
                </TableBody>
              </Table>
            </div>
            <DialogFooter className="pt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Settings</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
