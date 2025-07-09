'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { MoreHorizontal, PlusCircle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type PublicHoliday } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AddEditHolidayDialog, type HolidayFormValues } from './add-edit-holiday-dialog';
import { DeleteHolidayDialog } from './delete-holiday-dialog';
import { ImportHolidaysDialog } from './import-holidays-dialog';
import { useSystemLog } from '@/app/dashboard/contexts/SystemLogContext';
import { useAuth } from '@/app/dashboard/contexts/AuthContext';
import { useHolidays } from '@/app/dashboard/contexts/HolidaysContext';

const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + 5 - i);

export function PublicHolidaysTab() {
    const { publicHolidays, addPublicHoliday, updatePublicHoliday, deletePublicHoliday } = useHolidays();
    const { toast } = useToast();
    const { logAction } = useSystemLog();
    const { currentUser } = useAuth();
    const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear());

    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
    const [editingHoliday, setEditingHoliday] = React.useState<PublicHoliday | null>(null);
    const [deletingHoliday, setDeletingHoliday] = React.useState<PublicHoliday | null>(null);
    const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);

    const filteredHolidays = React.useMemo(() => {
        return publicHolidays
            .filter(h => new Date(h.date).getFullYear() === selectedYear)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [publicHolidays, selectedYear]);

    const handleAddHoliday = async (data: HolidayFormValues) => {
        const newHolidayData = {
            country: data.country,
            name: data.name,
            date: format(data.date, 'yyyy-MM-dd'),
            type: data.type,
        };
        await addPublicHoliday(newHolidayData);
        setIsAddEditDialogOpen(false);
        toast({ title: "Holiday Added", description: `"${data.name}" has been added.` });
        await logAction(`User '${currentUser.name}' added public holiday: '${data.name}'.`);
    };

    const handleEditHoliday = async (holidayId: string, data: HolidayFormValues) => {
        const updatedHolidayData = {
            country: data.country,
            name: data.name,
            date: format(data.date, 'yyyy-MM-dd'),
            type: data.type,
        }
        await updatePublicHoliday(holidayId, updatedHolidayData);
        setEditingHoliday(null);
        setIsAddEditDialogOpen(false);
        toast({ title: "Holiday Updated", description: `"${data.name}" has been updated.` });
        await logAction(`User '${currentUser.name}' updated public holiday: '${data.name}'.`);
    };

    const handleDeleteHoliday = (holidayId: string) => {
        const holiday = publicHolidays.find(h => h.id === holidayId);
        deletePublicHoliday(holidayId);
        setDeletingHoliday(null);
        toast({ title: "Holiday Deleted", variant: "destructive" });
        if (holiday) {
          logAction(`User '${currentUser.name}' deleted public holiday: '${holiday.name}'.`);
        }
    };
    
    const handleOpenAddDialog = () => {
        setEditingHoliday(null);
        setIsAddEditDialogOpen(true);
    }
    
    const handleOpenEditDialog = (holiday: PublicHoliday) => {
        setEditingHoliday(holiday);
        setIsAddEditDialogOpen(true);
    }
    
    const handleImport = async (importedHolidays: Omit<PublicHoliday, 'id'>[]) => {
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

        let successfulImports = 0;
        for (const newHoliday of holidaysForYear) {
            const newHolidayData = { ...newHoliday, date: format(new Date(newHoliday.date), 'yyyy-MM-dd')};
            const existingHoliday = publicHolidays.find(h => new Date(h.date).toDateString() === new Date(newHoliday.date).toDateString() && h.country === newHoliday.country);
            
            try {
                if (existingHoliday) {
                    await updatePublicHoliday(existingHoliday.id, newHolidayData);
                } else {
                    await addPublicHoliday(newHolidayData);
                }
                successfulImports++;
            } catch (error) {
                console.error("Failed to import holiday:", newHoliday.name, error);
            }
        }

        toast({
            title: 'Import Complete',
            description: `${successfulImports} of ${holidaysForYear.length} holidays have been imported for ${selectedYear}.`
        });
        if(successfulImports > 0) {
          await logAction(`User '${currentUser.name}' imported ${successfulImports} public holidays for ${selectedYear}.`);
        }
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
                            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}><Upload className="mr-2 h-4 w-4 rotate-180"/> Import</Button>
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
