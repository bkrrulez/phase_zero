
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

// Mock types for now
type RuleBook = {
  id: string;
  name: string;
  importedAt: Date;
  rowCount: number;
};

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
  
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [ruleBooks, setRuleBooks] = React.useState<RuleBook[]>([]);
  const [importSettings, setImportSettings] = React.useState<ImportSetting[]>(defaultImportSettings);

  const handleImportRuleBook = (name: string, file: File) => {
    // This is where the file processing logic will go.
    // For now, we'll just simulate a successful import.
    console.log(`Importing ${file.name} as "${name}"`);
    const newRuleBook: RuleBook = {
      id: `rb-${Date.now()}`,
      name,
      importedAt: new Date(),
      rowCount: Math.floor(Math.random() * (500 - 50 + 1) + 50), // Mock row count
    };
    setRuleBooks(prev => [...prev, newRuleBook]);
    setIsImportOpen(false);
  };
  
  const handleSaveSettings = (settings: ImportSetting[]) => {
    setImportSettings(settings);
    setIsSettingsOpen(false);
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
                      <TableCell>{format(book.importedAt, 'PPpp')}</TableCell>
                      <TableCell>{book.rowCount}</TableCell>
                      <TableCell className="text-right">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem className="text-destructive focus:text-destructive">
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
