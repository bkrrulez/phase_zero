
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
import { useLanguage } from '../../contexts/LanguageContext';

const formSchema = z.object({
  name: z.string().min(1, 'Rule book name is required.'),
  file: z.instanceof(FileList).refine(files => files?.length > 0, 'A file is required.'),
});

interface ImportRuleBookDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onImport: (name: string, file: File, isNewVersion: boolean) => void;
  importSettings: ImportSetting[];
}

export function ImportRuleBookDialog({ isOpen, onOpenChange, onImport, importSettings }: ImportRuleBookDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [isVersionConfirming, setIsVersionConfirming] = React.useState(false);
  const [importData, setImportData] = React.useState<{ name: string; file: File, rowCount: number, isNewVersion: boolean } | null>(null);
  const [versionData, setVersionData] = React.useState<{ existingVersions: number } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      file: undefined,
    },
  });
  
  const fileRef = form.register("file");

  const checkFileHeaders = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
        const mandatoryColumns = importSettings.filter(s => s.isMandatory).map(s => s.name);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'main');
            if (!sheetName) {
                reject(new Error(t('missingSheetError')));
                return;
            }
            
            const worksheet = workbook.Sheets[sheetName];
            const headers = (XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[]).map(h => h.trim());

            const missingColumns = mandatoryColumns.filter(col => !headers.includes(col));

            if (missingColumns.length > 0) {
                reject(t('missingColumnsError', { columns: missingColumns.join(', ') }));
            } else {
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                resolve(jsonData.length);
            }
        };
        reader.onerror = () => reject(t('importFailed'));

        reader.readAsArrayBuffer(file);
    });
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    const file = data.file[0];
    try {
        const rowCount = await checkFileHeaders(file);
        setImportData({ name: data.name, file, rowCount, isNewVersion: false });
        // The actual import will be triggered after confirmation
        onImport(data.name, file, false);
    } catch (error) {
        toast({
            variant: 'destructive',
            title: t('importError'),
            description: typeof error === 'string' ? error : t('importErrorDesc'),
        });
    }
  };

  const handleConfirmImport = () => {
    if (importData) {
        onImport(importData.name, importData.file, importData.isNewVersion);
    }
    setIsConfirming(false);
    setImportData(null);
    form.reset();
  }

  const handleVersionConfirm = () => {
    if (importData) {
        onImport(importData.name, importData.file, true); // Set isNewVersion to true
    }
    setIsVersionConfirming(false);
    setImportData(null);
    form.reset();
  }


  React.useEffect(() => {
    const handleImportResponse = (event: Event) => {
        const customEvent = event as CustomEvent;
        if(customEvent.detail.requiresConfirmation) {
            setVersionData({ existingVersions: customEvent.detail.existingVersions });
            setIsVersionConfirming(true);
        } else {
            setImportData(null); // Clear data on successful import
            form.reset();
        }
    };

    window.addEventListener('import-response', handleImportResponse);
    return () => window.removeEventListener('import-response', handleImportResponse);
  }, [form]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('importRuleBookTitle')}</DialogTitle>
            <DialogDescription>
              {t('importRuleBookDesc')}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('ruleBookNameLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., OIB-Richtlinie 2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>{t('ruleBookFileLabel')}</FormLabel>
                <FormControl>
                    <Input
                        type="file"
                        accept=".xlsx, .xls"
                        {...fileRef}
                      />
                </FormControl>
                <FormMessage>{form.formState.errors.file?.message}</FormMessage>
              </FormItem>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit">{t('import')}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isVersionConfirming} onOpenChange={setIsVersionConfirming}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Rule Book Already Exists</AlertDialogTitle>
                <AlertDialogDescription>
                    A rule book named "{importData?.name}" with {versionData?.existingVersions} version(s) already exists. Do you want to import this file as a new version?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => { setIsVersionConfirming(false); setImportData(null); }}>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleVersionConfirm}>{t('confirm')}</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
