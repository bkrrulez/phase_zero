
'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx-js-style';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { type PublicHoliday } from '@/lib/types';

interface ImportHolidaysDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onImport: (holidays: Omit<PublicHoliday, 'id'>[]) => void;
}

const parseDateString = (dateInput: string | number | Date): Date | null => {
    if (!dateInput) return null;

    // 1. Handle if it's already a valid Date object (from XLSX)
    if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
        const d = dateInput;
        // Normalize to UTC to avoid timezone issues during parsing
        return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    }
    
    // 2. Handle Excel's numeric date format
    if (typeof dateInput === 'number') {
        const date = XLSX.SSF.parse_date_code(dateInput);
        if (date && date.y && date.m && date.d) {
             return new Date(Date.UTC(date.y, date.m - 1, date.d));
        }
    }

    // 3. Handle string format D/M/YYYY or DD/MM/YYYY
    if (typeof dateInput === 'string') {
        const parts = dateInput.split('/');
        if (parts.length === 3) {
            const dayNum = parseInt(parts[0], 10);
            const monthNum = parseInt(parts[1], 10);
            const yearNum = parseInt(parts[2], 10);

            // Final validation of the parsed numbers
            if (!isNaN(dayNum) && !isNaN(monthNum) && !isNaN(yearNum) &&
                yearNum > 1900 && yearNum < 3000 &&
                monthNum >= 1 && monthNum <= 12 &&
                dayNum >= 1 && dayNum <= 31) 
            {
                // Create a UTC date to prevent timezone shifts from changing the date
                const date = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
                // Final check to prevent invalid dates like 31st Feb being rolled over by JS Date object
                if (date.getUTCFullYear() === yearNum && date.getUTCMonth() === monthNum - 1 && date.getUTCDate() === dayNum) {
                    return date;
                }
            }
        }
    }

    return null; // Return null if format is not valid
};


export function ImportHolidaysDialog({ isOpen, onOpenChange, onImport }: ImportHolidaysDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const processData = (data: any[]) => {
    const requiredHeaders = ['Country', 'Holiday', 'Date', 'Type'];
    const actualHeaders = data.length > 0 ? Object.keys(data[0]) : [];
    const missingHeaders = requiredHeaders.filter(h => !actualHeaders.includes(h));

    if (missingHeaders.length > 0) {
        toast({ variant: 'destructive', title: 'Missing Columns', description: `The following columns are missing: ${missingHeaders.join(', ')}` });
        setIsParsing(false);
        return;
    }

    let invalidDateCount = 0;
    const parsedHolidays: Omit<PublicHoliday, 'id'>[] = data
      .map((row, index) => {
        if (!row.Country || !row.Holiday || !row.Date) {
          console.warn(`Skipping row ${index + 2}: Missing required data.`);
          return null;
        }
        const date = parseDateString(row.Date);
        if (!date) {
          console.warn(`Skipping row ${index + 2}: Invalid date format for "${row.Date}". Expected DD/MM/YYYY.`);
          invalidDateCount++;
          return null;
        }
        return {
          country: row.Country,
          name: row.Holiday,
          date: date.toISOString(),
          type: row.Type === 'Half Day' ? 'Half Day' : 'Full Day',
        };
      })
      .filter((h): h is Omit<PublicHoliday, 'id'> => h !== null);
    
    if (invalidDateCount > 0) {
        toast({
            variant: 'destructive',
            title: 'Invalid Date Format',
            description: `${invalidDateCount} row(s) had an invalid date format and were skipped. Please use DD/MM/YYYY.`
        });
    }

    onImport(parsedHolidays);
    handleClose();
  }

  const handleImport = () => {
    if (!file) {
      toast({ variant: 'destructive', title: 'No file selected', description: 'Please select a CSV or XLSX file to import.' });
      return;
    }
    
    setIsParsing(true);
    const reader = new FileReader();

    if (file.name.endsWith('.csv')) {
        reader.onload = (event) => {
            const csvText = event.target?.result;
            Papa.parse<any>(csvText as string, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors.length > 0) {
                        toast({ variant: 'destructive', title: 'CSV Parsing Error', description: 'Please check the file format and try again.' });
                        setIsParsing(false);
                        return;
                    }
                    processData(results.data);
                },
                error: () => {
                    toast({ variant: 'destructive', title: 'Error', description: 'Failed to parse the CSV file.' });
                    setIsParsing(false);
                }
            });
        };
        reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx')) {
        reader.onload = (event) => {
            try {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { raw: false });
                processData(json);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to parse the XLSX file.' });
                setIsParsing(false);
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        toast({ variant: 'destructive', title: 'Unsupported File Type', description: 'Please upload a .csv or .xlsx file.' });
        setIsParsing(false);
    }
  };
  
  const handleClose = () => {
    setFile(null);
    if(fileInputRef.current) fileInputRef.current.value = '';
    setIsParsing(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Public Holidays</DialogTitle>
          <DialogDescription>
            Upload a CSV or XLSX file. The file must contain columns: Country, Holiday, Date (in DD/MM/YYYY format), and Type.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="import-file">Import File</Label>
            <Input id="import-file" type="file" accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileChange} ref={fileInputRef} />
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
