
'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { type PublicHoliday } from '@/lib/mock-data';

interface ImportHolidaysDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onImport: (holidays: Omit<PublicHoliday, 'id'>[]) => void;
  selectedYear: number;
}

export function ImportHolidaysDialog({ isOpen, onOpenChange, onImport, selectedYear }: ImportHolidaysDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleImport = () => {
    if (!file) {
      toast({ variant: 'destructive', title: 'No file selected', description: 'Please select a CSV file to import.' });
      return;
    }
    
    setIsParsing(true);

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { data, errors } = results;

        if (errors.length > 0) {
            toast({ variant: 'destructive', title: 'CSV Parsing Error', description: 'Please check the file format and try again.' });
            setIsParsing(false);
            return;
        }

        const requiredHeaders = ['Country', 'Holiday', 'Date', 'Type'];
        const actualHeaders = results.meta.fields || [];
        const missingHeaders = requiredHeaders.filter(h => !actualHeaders.includes(h));

        if (missingHeaders.length > 0) {
            toast({ variant: 'destructive', title: 'Missing Columns', description: `The following columns are missing: ${missingHeaders.join(', ')}` });
            setIsParsing(false);
            return;
        }
        
        const parsedHolidays: Omit<PublicHoliday, 'id'>[] = data.map(row => ({
            country: row.Country,
            name: row.Holiday,
            date: new Date(row.Date).toISOString(),
            type: row.Type === 'Half Day' ? 'Half Day' : 'Full Day',
        })).filter(h => h.country && h.name && h.date && !isNaN(new Date(h.date).getTime()));
        
        onImport(parsedHolidays);
        handleClose();
      },
      error: () => {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to parse the CSV file.' });
        setIsParsing(false);
      }
    });
  };
  
  const handleClose = () => {
    setFile(null);
    if(fileInputRef.current) fileInputRef.current.value = '';
    setIsParsing(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Public Holidays</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import holidays for {selectedYear}. The file must contain columns: Country, Holiday, Date, and Type.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} ref={fileInputRef} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={!file || isParsing}>
            {isParsing ? 'Importing...' : 'Import Holidays'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
