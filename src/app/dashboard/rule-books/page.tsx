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
  
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [ruleBooks, setRuleBooks] = React.useState<RuleBook[]>([]);
  const [importSettings, setImportSettings] = React.useState<ImportSetting[]>(defaultImportSettings);
  
  const fetchRuleBooks = React.useCallback(async () => {
    const books = await getRuleBooks();
    setRuleBooks(books);
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
                throw new Error("A sheet named 'Main' or 'main' was not found in the file.");
            }
            
            const mainWorksheet = workbook.Sheets[mainSheetName];
            const mainData: any[] = XLSX.utils.sheet_to_json(mainWorksheet, { defval: "" });

            // Validate headers
            const headers = XLSX.utils.sheet_to_json(mainWorksheet, { header: 1 })[0] as string[];
            const mandatoryColumns = importSettings.filter(s => s.isMandatory).map(s => s.name);
            const missingColumns = mandatoryColumns.filter(col => !headers.includes(col));
            if (missingColumns.length > 0) {
                throw new Error(`Missing mandatory columns in 'Main' sheet: ${missingColumns.join(', ')}`);
            }
            
            // Validate table references
            const tableColumnSetting = importSettings.find(s => s.type === 'Table');
            const referenceTables: Record<string, any[]> = {};
            
            if (tableColumnSetting) {
                for (const row of mainData) {
                    const cellValue = row[tableColumnSetting.name];
                    if (cellValue && typeof cellValue === 'string') {
                        if (!workbook.SheetNames.includes(cellValue)) {
                           throw new Error(`Table sheet '${cellValue}' missing in the uploaded file. Please check.`);
                        }
                        if (!referenceTables[cellValue]) {
                            const tableSheet = workbook.Sheets[cellValue];
                            referenceTables[cellValue] = XLSX.utils.sheet_to_json(tableSheet, { defval: "" });
                        }
                    }
                }
            }

            const entries: RuleBookEntry[] = mainData.map(row => ({
                id: '', // Will be generated on the server
                ruleBookId: '', // Will be assigned on the server
                data: row,
            }));

            await addRuleBook({ name, entries, referenceTables });
            
            toast({ title: "Import Successful", description: `${name} with ${entries.length} rows has been imported.` });
            await fetchRuleBooks(); // Refresh the list
            setIsImportOpen(false);

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Import Failed',
                description: error.message || 'An unexpected error occurred during import.',
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
      toast({ title: "Rule Book Deleted", variant: "destructive" });
  }

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
            <p className="text-muted-foreground">Import and manage rule books for your projects.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
              <Settings className="mr-2 h-4 w-4" /> Import Settings
            </Button>
            <Button onClick={() => setIsImportOpen(true)}>
              <UploadCloud className="mr-2 h-4 w-4" /> Import Rule Book
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Imported Rule Books</CardTitle>
            <CardDescription>A list of all imported rule books.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Book Name</TableHead>
                  <TableHead>Import Date</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ruleBooks.length > 0 ? (
                  ruleBooks.map((book) => (
                    <TableRow key={book.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{book.name}</TableCell>
                      <TableCell>{format(new Date(book.importedAt), 'PPpp')}</TableCell>
                      <TableCell>{book.rowCount}</TableCell>
                      <TableCell className="text-right">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleDeleteRuleBook(book.id)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4"/> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No rule books have been imported yet.
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
