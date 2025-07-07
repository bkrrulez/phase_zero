
'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { MoreHorizontal, PlusCircle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type PublicHoliday } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { AddEditHolidayDialog, type HolidayFormValues } from './add-edit-holiday-dialog';
import { DeleteHolidayDialog } from './delete-holiday-dialog';
import { ImportHolidaysDialog } from './import-holidays-dialog';

const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + 5 - i);

interface PublicHolidaysTabProps {
    holidays: PublicHoliday[];
    setHolidays: React.Dispatch<React.SetStateAction<PublicHoliday[]>>;
}

export function PublicHolidaysTab({ holidays, setHolidays }: PublicHolidaysTabProps) {
    const { toast } = useToast();
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState<PublicHoliday | null>(null);
    const [deletingHoliday, setDeletingHoliday] = useState<PublicHoliday | null>(null);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

    const filteredHolidays = useMemo(() => {
        return holidays
            .filter(h => new Date(h.date).getFullYear() === selectedYear)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [holidays, selectedYear]);

    const handleAddHoliday = (data: HolidayFormValues) => {
        const newHoliday: PublicHoliday = {
            id: `ph-${Date.now()}`,
            country: data.country,
            name: data.name,
            date: data.date.toISOString(),
            type: data.type,
        };
        setHolidays(prev => [...prev, newHoliday]);
        setIsAddEditDialogOpen(false);
        toast({ title: "Holiday Added", description: `"${data.name}" has been added.` });
    };

    const handleEditHoliday = (holidayId: string, data: HolidayFormValues) => {
        setHolidays(prev => prev.map(h => h.id === holidayId ? { ...h, ...data, date: data.date.toISOString() } : h));
        setEditingHoliday(null);
        setIsAddEditDialogOpen(false);
        toast({ title: "Holiday Updated", description: `"${data.name}" has been updated.` });
    };

    const handleDeleteHoliday = (holidayId: string) => {
        setHolidays(prev => prev.filter(h => h.id !== holidayId));
        setDeletingHoliday(null);
        toast({ title: "Holiday Deleted", variant: "destructive" });
    };
    
    const handleOpenAddDialog = () => {
        setEditingHoliday(null);
        setIsAddEditDialogOpen(true);
    }
    
    const handleOpenEditDialog = (holiday: PublicHoliday) => {
        setEditingHoliday(holiday);
        setIsAddEditDialogOpen(true);
    }
    
    const handleImport = (importedHolidays: Omit<PublicHoliday, 'id'>[]) => {
        const holidaysForYear = importedHolidays.filter(h => new Date(h.date).getFullYear() === selectedYear);

        if (holidaysForYear.length !== importedHolidays.length) {
            toast({
                variant: 'destructive',
                title: 'Import Error',
                description: 'Some holidays were for a different year and have been ignored.'
            });
        }
        
        if (holidaysForYear.length === 0) {
            toast({
                title: 'No Holidays Imported',
                description: 'The file contained no valid holidays for the selected year.'
            });
            setIsImportDialogOpen(false);
            return;
        }

        setHolidays(prev => {
            const updatedHolidays = [...prev];
            holidaysForYear.forEach(newHoliday => {
                const existingIndex = updatedHolidays.findIndex(h => new Date(h.date).toDateString() === new Date(newHoliday.date).toDateString() && h.country === newHoliday.country);
                if (existingIndex !== -1) {
                    // Overwrite existing holiday
                    updatedHolidays[existingIndex] = { ...updatedHolidays[existingIndex], name: newHoliday.name, type: newHoliday.type };
                } else {
                    // Append new holiday
                    updatedHolidays.push({ ...newHoliday, id: `ph-${Date.now()}-${Math.random()}` });
                }
            });
            return updatedHolidays;
        });

        toast({
            title: 'Import Successful',
            description: `${holidaysForYear.length} holidays have been imported for ${selectedYear}.`
        });
        setIsImportDialogOpen(false);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Public Holidays List</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-2 justify-between">
                        <CardDescription>
                            Manage the list of official public holidays for different countries.
                        </CardDescription>
                        <div className="flex gap-2 items-center">
                             <Select
                                value={String(selectedYear)}
                                onValueChange={(value) => setSelectedYear(Number(value))}
                            >
                                <SelectTrigger className="w-full sm:w-[120px]">
                                    <SelectValue placeholder="Select year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(year => (
                                        <SelectItem key={year} value={String(year)}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}><Upload className="mr-2 h-4 w-4"/> Import</Button>
                            <Button onClick={handleOpenAddDialog}><PlusCircle className="mr-2 h-4 w-4"/> Add Holiday</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Country</TableHead>
                                <TableHead>Holiday</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Day</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {filteredHolidays.length > 0 ? filteredHolidays.map(holiday => (
                               <TableRow key={holiday.id}>
                                   <TableCell>{holiday.country}</TableCell>
                                   <TableCell className="font-medium">{holiday.name}</TableCell>
                                   <TableCell>{format(new Date(holiday.date), 'PP')}</TableCell>
                                   <TableCell>{format(new Date(holiday.date), 'EEEE')}</TableCell>
                                   <TableCell>{holiday.type}</TableCell>
                                   <TableCell>
                                       <DropdownMenu>
                                           <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                    <MoreHorizontal className="h-4 w-4"/>
                                                </Button>
                                           </DropdownMenuTrigger>
                                           <DropdownMenuContent align="end">
                                               <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                               <DropdownMenuItem onClick={() => handleOpenEditDialog(holiday)}>Edit</DropdownMenuItem>
                                               <DropdownMenuItem onClick={() => setDeletingHoliday(holiday)} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                                           </DropdownMenuContent>
                                       </DropdownMenu>
                                   </TableCell>
                               </TableRow>
                           )) : (
                               <TableRow>
                                   <TableCell colSpan={6} className="h-24 text-center">No public holidays found for {selectedYear}.</TableCell>
                               </TableRow>
                           )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AddEditHolidayDialog 
                isOpen={isAddEditDialogOpen}
                onOpenChange={(isOpen) => !isOpen && setIsAddEditDialogOpen(false)}
                onAdd={handleAddHoliday}
                onEdit={handleEditHoliday}
                holiday={editingHoliday}
            />

            <DeleteHolidayDialog 
                isOpen={!!deletingHoliday}
                onOpenChange={(isOpen) => !isOpen && setDeletingHoliday(null)}
                onDelete={handleDeleteHoliday}
                holiday={deletingHoliday}
            />
            
            <ImportHolidaysDialog
                isOpen={isImportDialogOpen}
                onOpenChange={setIsImportDialogOpen}
                onImport={handleImport}
                selectedYear={selectedYear}
            />
        </>
    )
}
