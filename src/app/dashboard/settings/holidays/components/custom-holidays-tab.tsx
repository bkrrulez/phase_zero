
'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { teams, type CustomHoliday, type PublicHoliday } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { AddEditCustomHolidayDialog, type CustomHolidayFormValues } from './add-edit-custom-holiday-dialog';
import { DeleteHolidayDialog } from './delete-holiday-dialog';

const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + 5 - i);

interface CustomHolidaysTabProps {
    holidays: CustomHoliday[];
    setHolidays: React.Dispatch<React.SetStateAction<CustomHoliday[]>>;
    publicHolidays: PublicHoliday[];
}

export function CustomHolidaysTab({ holidays, setHolidays, publicHolidays }: CustomHolidaysTabProps) {
    const { toast } = useToast();
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState<CustomHoliday | null>(null);
    const [deletingHoliday, setDeletingHoliday] = useState<CustomHoliday | null>(null);

    const filteredHolidays = useMemo(() => {
        return holidays
            .filter(h => new Date(h.date).getFullYear() === selectedYear)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [holidays, selectedYear]);

    const handleSaveHoliday = (data: CustomHolidayFormValues) => {
        const holidayDateStr = new Date(data.date).toDateString();
        const isPublicHoliday = publicHolidays.some(ph => new Date(ph.date).toDateString() === holidayDateStr);

        if (isPublicHoliday) {
            toast({
                variant: "destructive",
                title: "Date Conflict",
                description: "This date is already a public holiday and cannot be added as a custom holiday.",
            });
            return;
        }


        if (editingHoliday) {
            // Edit
            setHolidays(prev => prev.map(h => h.id === editingHoliday.id ? { ...h, ...data, date: data.date.toISOString() } : h));
            toast({ title: "Holiday Updated", description: `"${data.name}" has been updated.` });
        } else {
            // Add
            const newHoliday: CustomHoliday = {
                id: `ch-${Date.now()}`,
                ...data,
                date: data.date.toISOString(),
            };
            setHolidays(prev => [...prev, newHoliday]);
            toast({ title: "Holiday Added", description: `"${data.name}" has been added.` });
        }
        setIsAddEditDialogOpen(false);
        setEditingHoliday(null);
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
    
    const handleOpenEditDialog = (holiday: CustomHoliday) => {
        setEditingHoliday(holiday);
        setIsAddEditDialogOpen(true);
    }
    
    const getTeamName = (appliesTo: string) => {
        if (appliesTo === 'all-members') return 'All Members';
        if (appliesTo === 'all-teams') return 'All Teams';
        return teams.find(t => t.id === appliesTo)?.name || 'N/A';
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Custom Holidays List</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-2 justify-between">
                        <CardDescription>
                            Manage organization-specific holidays or events.
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
                            <Button onClick={handleOpenAddDialog}><PlusCircle className="mr-2 h-4 w-4"/> Add Custom Holiday</Button>
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
                                <TableHead>Team</TableHead>
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
                                   <TableCell>{getTeamName(holiday.appliesTo)}</TableCell>
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
                                   <TableCell colSpan={7} className="h-24 text-center">No custom holidays found for {selectedYear}.</TableCell>
                               </TableRow>
                           )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AddEditCustomHolidayDialog 
                isOpen={isAddEditDialogOpen}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setIsAddEditDialogOpen(false);
                        setEditingHoliday(null);
                    }
                }}
                onSave={handleSaveHoliday}
                holiday={editingHoliday}
                teams={teams}
            />
            
            <DeleteHolidayDialog 
                isOpen={!!deletingHoliday}
                onOpenChange={(isOpen) => !isOpen && setDeletingHoliday(null)}
                // @ts-ignore - Reusing the dialog, it just needs id and name
                onDelete={() => handleDeleteHoliday(deletingHoliday!.id)}
                holiday={deletingHoliday}
            />
        </>
    )
}
