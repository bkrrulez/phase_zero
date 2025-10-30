
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as XLSX from 'xlsx-js-style';
import Papa from 'papaparse';
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
import { useToast } from '@/hooks/use-toast';
import { type ImportSetting } from './import-settings-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const formSchema = z.object({
  name: z.string().min(1, 'Rule book name is required.'),
  file: z.instanceof(FileList).refine(files => files.length > 0, 'A file is required.'),
});

interface ImportRuleBookDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onImport: (name: string, file: File) => void;
  importSettings: ImportSetting[];
}

export function ImportRuleBookDialog({ isOpen, onOpenChange, onImport, importSettings }: ImportRuleBookDialogProps) {
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [importData, setImportData] = React.useState<{ name: string; file: File, rowCount: number } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      file: undefined,
    },
  });

  const checkFileHeaders = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
        const mandatoryColumns = importSettings.filter(s => s.isMandatory).map(s => s.name);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];

            const missingColumns = mandatoryColumns.filter(col => !headers.includes(col));

            if (missingColumns.length > 0) {
                reject(`Missing mandatory columns: ${missingColumns.join(', ')}`);
            } else {
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                resolve(jsonData.length);
            }
        };
        reader.onerror = () => reject('Failed to read file.');

        if (file.type.includes('csv')) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const headers = results.meta.fields || [];
                    const missingColumns = mandatoryColumns.filter(col => !headers.includes(col));
                    if (missingColumns.length > 0) {
                        reject(`Missing mandatory columns: ${missingColumns.join(', ')}`);
                    } else {
                        resolve(results.data.length);
                    }
                },
                error: (err) => reject(err.message)
            });
        } else {
            reader.readAsArrayBuffer(file);
        }
    });
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    const file = data.file[0];
    try {
        const rowCount = await checkFileHeaders(file);
        setImportData({ name: data.name, file, rowCount });
        setIsConfirming(true);
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Import Error',
            description: typeof error === 'string' ? error : 'An unexpected error occurred.',
        });
    }
  };

  const handleConfirmImport = () => {
    if (importData) {
        onImport(importData.name, importData.file);
    }
    setIsConfirming(false);
    setImportData(null);
    form.reset();
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Rule Book</DialogTitle>
            <DialogDescription>
              Provide a name for the rule book and upload the file.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Book Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., OIB-Richtlinie 2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="file"
                render={({ field: { onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel>Upload CSV/Excel</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        onChange={(e) => onChange(e.target.files)}
                        {...fieldProps}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">Import</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Import</AlertDialogTitle>
                <AlertDialogDescription>
                    {importData?.rowCount} rows will be imported from the file. Do you want to continue?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setImportData(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmImport}>Continue</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
