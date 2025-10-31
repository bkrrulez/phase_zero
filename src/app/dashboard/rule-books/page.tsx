
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, UploadCloud, Settings, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { format } from 'date-fns';
import { ImportSettingsDialog, type ImportSetting } from './components/import-settings-dialog';
import { ImportRuleBookDialog } from './components/import-rule-book-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { type RuleBook, type RuleBookEntry } from '@/lib/types';
import { getRuleBooks, addRuleBook, deleteRuleBook } from './actions';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx-js-style';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

const defaultImportSettings: ImportSetting[] = [
  { id: 'col-1', name: 'Gliederung', isMandatory: true, type: 'Free Text', values: '' },
  { id: 'col-2', name: 'Text', isMandatory: true, type: 'Free Text', values: '' },
  { id: 'col-3', name: 'Nutzung', isMandatory: true, type: 'Drop Down', values: '' },
  { id: 'col-4', name: 'Spaltentyp', isMandatory: true, type: 'Drop Down', values: '' },
  { id: 'col-5', name: 'Erfüllbarkeit', isMandatory: true, type: 'Drop Down', values: '' },
  { id: 'col-6', name: 'Checkliste', isMandatory: true, type: 'Drop Down', values: '' },
  { id: 'col-7', name: 'Referenztabelle', isMandatory: false, type: 'Table', values: '' },
];


export default function RuleBooksPage() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [ruleBooks, setRuleBooks] = React.useState<RuleBook[]>([]);
  const [importSettings, setImportSettings] = React.useState<ImportSetting[]>(defaultImportSettings);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const fetchRuleBooks = React.useCallback(async () => {
    setIsLoading(true);
    const books = await getRuleBooks();
    setRuleBooks(books);
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    fetchRuleBooks();
  }, [fetchRuleBooks]);


  const handleImportRuleBook = async (name: string, file: File) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            
            const mainSheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'main');
            if (!mainSheetName) {
                throw new Error(t('missingSheetError'));
            }
            
            const mainWorksheet = workbook.Sheets[mainSheetName];
            const sheetHeaders = (XLSX.utils.sheet_to_json(mainWorksheet, { header: 1 })[0] as string[]).map(h => h.trim());
            
            const normalizedSheetHeaders = sheetHeaders.map(h => h.toLowerCase());
            const normalizedMandatoryColumns = importSettings
                .filter(s => s.isMandatory)
                .map(s => s.name.toLowerCase());

            const missingColumns = normalizedMandatoryColumns.filter(col => !normalizedSheetHeaders.includes(col));
            if (missingColumns.length > 0) {
                const originalCaseMissing = importSettings
                    .filter(s => missingColumns.includes(s.name.toLowerCase()))
                    .map(s => s.name);
                throw new Error(t('missingColumnsError', { columns: originalCaseMissing.join(', ') }));
            }

            const mainData: any[] = XLSX.utils.sheet_to_json(mainWorksheet, { defval: "" });
            
            const referenceTables: Record<string, any[]> = {};
            const tableColumnSetting = importSettings.find(s => s.type === 'Table');
            
            if (tableColumnSetting) {
                for (const row of mainData) {
                    const cellValue = row[tableColumnSetting.name];
                    if (cellValue && typeof cellValue === 'string') {
                         const tableNames = cellValue.split(',').map(name => name.trim());
                        
                        for (const tableName of tableNames) {
                            if (tableName && !referenceTables[tableName]) {
                                const actualSheetName = workbook.SheetNames.find(sn => sn.toLowerCase() === tableName.toLowerCase());
                                if (!actualSheetName) {
                                    throw new Error(t('missingTableSheetError', { name: tableName }));
                                }

                                const tableSheet = workbook.Sheets[actualSheetName];
                                referenceTables[tableName] = XLSX.utils.sheet_to_json(tableSheet, { defval: "" });
                            }
                        }
                    }
                }
            }
            
            const plainEntries: Omit<RuleBookEntry, 'id' | 'ruleBookId'>[] = mainData.map(row => ({
                data: JSON.parse(JSON.stringify(row)),
            }));
            
            const plainReferenceTables = JSON.parse(JSON.stringify(referenceTables));

            await addRuleBook({ name, entries: plainEntries, referenceTables: plainReferenceTables });
            
            toast({ title: t('importSuccess'), description: t('importSuccessDesc', { name, count: plainEntries.length }) });
            await fetchRuleBooks(); // Refresh the list
            setIsImportOpen(false);

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: t('importFailed'),
                description: error.message || t('importErrorDesc'),
            });
        }
    };
  };
  
  const handleSaveSettings = (settings: ImportSetting[]) => {
    setImportSettings(settings);
    setIsSettingsOpen(false);
  }

  const handleDeleteRuleBook = async (bookId: string) => {
      await deleteRuleBook(bookId);
      await fetchRuleBooks();
      toast({ title: t('ruleBookDeleted'), variant: "destructive" });
  }

  const handleRowClick = (bookId: string) => {
    router.push(`/dashboard/rule-books/${bookId}`);
  };

  if (currentUser?.role !== 'Super Admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('accessDenied')}</CardTitle>
          <CardDescription>{t('noPermissionPage')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">{t('ruleBooks')}</h1>
            <p className="text-muted-foreground">{t('ruleBooksSubtitle')}</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
              <Settings className="mr-2 h-4 w-4" /> {t('importSettings')}
            </Button>
            <Button onClick={() => setIsImportOpen(true)}>
              <UploadCloud className="mr-2 h-4 w-4" /> {t('importRuleBook')}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('importedRuleBooks')}</CardTitle>
            <CardDescription>{t('importedRuleBooksDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ruleBookName')}</TableHead>
                  <TableHead>{t('importDate')}</TableHead>
                  <TableHead>{t('rows')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={`skeleton-${i}`}>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : ruleBooks.length > 0 ? (
                  ruleBooks.map((book) => (
                    <TableRow key={book.id} onClick={() => handleRowClick(book.id)} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{book.name}</TableCell>
                      <TableCell>{format(new Date(book.importedAt), 'PPpp')}</TableCell>
                      <TableCell>{book.rowCount}</TableCell>
                      <TableCell className="text-right">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4"/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteRuleBook(book.id); }} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4"/> {t('delete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      {t('noRuleBooks')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ImportSettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        settings={importSettings}
        onSave={handleSaveSettings}
      />
      <ImportRuleBookDialog
        isOpen={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImport={handleImportRuleBook}
        importSettings={importSettings}
      />
    </>
  );
}
