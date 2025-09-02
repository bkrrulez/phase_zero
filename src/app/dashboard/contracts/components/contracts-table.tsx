
'use client';

import * as React from 'react';
import { format, startOfDay, isAfter } from 'date-fns';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMembers } from '@/app/dashboard/contexts/MembersContext';
import { useContracts } from '@/app/dashboard/contexts/ContractsContext';
import { useLanguage } from '@/app/dashboard/contexts/LanguageContext';
import { type Contract } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ContractDialog } from './contract-dialog';
import { DeleteContractDialog } from './delete-contract-dialog';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemLog } from '../../contexts/SystemLogContext';
import { addContract as addContractAction, updateContract as updateContractAction, deleteContract as deleteContractAction } from '../../actions';
import { Badge } from '@/components/ui/badge';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';


type ContractStatus = 'Upcoming' | 'Active' | 'Expired';

const getContractStatus = (contract: Contract): ContractStatus => {
    const today = startOfDay(new Date());
    const startDate = new Date(contract.startDate);

    if (isAfter(startDate, today)) {
        return 'Upcoming';
    }
    
    if (contract.endDate) {
        const endDate = new Date(contract.endDate);
        if (isAfter(today, endDate)) {
            return 'Expired';
        }
    }
    
    return 'Active';
};

export function ContractsTable() {
    const { teamMembers, fetchMembers } = useMembers();
    const { contracts, fetchContracts } = useContracts();
    const { t } = useLanguage();
    const { toast } = useToast();
    const { currentUser } = useAuth();
    const { logAction } = useSystemLog();

    const [openCombobox, setOpenCombobox] = React.useState(false);
    const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);
    const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>(['all-status']);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingContract, setEditingContract] = React.useState<Contract | null>(null);
    const [deletingContract, setDeletingContract] = React.useState<Contract | null>(null);
    const [selectedUserIdForNew, setSelectedUserIdForNew] = React.useState<string | undefined>(undefined);

    const statusOptions: MultiSelectOption[] = [
        { value: 'all-status', label: 'All Status' },
        { value: 'Upcoming', label: 'Upcoming' },
        { value: 'Active', label: 'Active' },
        { value: 'Expired', label: 'Expired' },
    ];

    const handleStatusSelectionChange = (newSelection: string[]) => {
      if (newSelection.length === 0) {
        setSelectedStatuses(['all-status']);
        return;
      }
      if (newSelection.length > 1 && newSelection[newSelection.length - 1] === 'all-status') {
        setSelectedStatuses(['all-status']);
      } 
      else if (newSelection.length > 1 && newSelection.includes('all-status')) {
        setSelectedStatuses(newSelection.filter(s => s !== 'all-status'));
      } 
      else {
        setSelectedStatuses(newSelection);
      }
    };


    const getUserName = (userId: string) => {
        return teamMembers.find(m => m.id === userId)?.name || userId;
    }
    
    const sortedContracts = React.useMemo(() => {
        return [...contracts].sort((a, b) => {
            const nameA = getUserName(a.userId).toLowerCase();
            const nameB = getUserName(b.userId).toLowerCase();
            
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;

            const dateA = a.endDate ? new Date(a.endDate).getTime() : Infinity;
            const dateB = b.endDate ? new Date(b.endDate).getTime() : Infinity;
            
            return dateB - dateA;
        });
    }, [contracts, teamMembers]);

    const filteredContracts = React.useMemo(() => {
        let userFiltered = selectedMemberId ? sortedContracts.filter(c => c.userId === selectedMemberId) : sortedContracts;
        
        if (selectedStatuses.includes('all-status')) {
            return userFiltered;
        }

        return userFiltered.filter(c => selectedStatuses.includes(getContractStatus(c)));

    }, [sortedContracts, selectedMemberId, selectedStatuses]);


    const getUserEmail = (userId: string) => {
        return teamMembers.find(m => m.id === userId)?.email || 'N/A';
    }

    const handleOpenAddDialog = () => {
        setEditingContract(null);
        setSelectedUserIdForNew(undefined);
        setIsDialogOpen(true);
    }
    
    const handleOpenEditDialog = (contract: Contract) => {
        if (currentUser.role !== 'Super Admin' && contract.endDate && new Date(contract.endDate) < startOfDay(new Date())) {
            toast({
                variant: "destructive",
                title: "Cannot Edit Expired Contract",
                description: "Contract Expired. Edit/Delete operation is not possible.",
            });
            return;
        }
        setEditingContract(contract);
        setSelectedUserIdForNew(undefined);
        setIsDialogOpen(true);
    }

    const handleSaveContract = async (data: Omit<Contract, 'id'>, contractId?: string) => {
        if (contractId) {
            await updateContractAction(contractId, data);
            toast({ title: "Contract Updated" });
            logAction(`User '${currentUser.name}' updated contract #${contractId}.`);
        } else {
            await addContractAction(data);
            toast({ title: "Contract Added" });
            logAction(`User '${currentUser.name}' added a new contract for user ID ${data.userId}.`);
        }
        await fetchContracts();
        await fetchMembers(); // Also refetch members to update their contract info
        setIsDialogOpen(false);
        setEditingContract(null);
    }

    const handleDeleteContract = async () => {
        if (!deletingContract) return;
        if (currentUser.role !== 'Super Admin' && deletingContract.endDate && new Date(deletingContract.endDate) < startOfDay(new Date())) {
            toast({
                variant: "destructive",
                title: "Cannot Delete Expired Contract",
                description: "This contract has expired and cannot be deleted.",
            });
            setDeletingContract(null);
            return;
        }

        await deleteContractAction(deletingContract.id);
        toast({ title: "Contract Deleted", variant: "destructive" });
        logAction(`User '${currentUser.name}' deleted contract #${deletingContract.id}.`);
        
        await fetchContracts();
        await fetchMembers();
        setDeletingContract(null);
    }
    
    return (
        <>
        <Card>
            <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                    <CardTitle>{t('allContracts')}</CardTitle>
                    <CardDescription>{t('allContractsDesc')}</CardDescription>
                </div>
                <div className="flex w-full md:w-auto gap-2">
                    <MultiSelect
                        options={statusOptions}
                        selected={selectedStatuses}
                        onChange={handleStatusSelectionChange}
                        placeholder="Filter by Status..."
                        className="w-full md:w-[200px]"
                    />
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild>
                            <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCombobox}
                            className="w-full md:w-[250px] justify-between"
                            >
                            {selectedMemberId
                                ? teamMembers.find((member) => member.id === selectedMemberId)?.name
                                : t('filterByUser')}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[250px] p-0">
                            <Command>
                            <CommandInput placeholder={t('searchMemberPlaceholder')} />
                            <CommandList>
                                <CommandEmpty>{t('noMemberFound')}</CommandEmpty>
                                <CommandGroup>
                                <CommandItem onSelect={() => {
                                    setSelectedMemberId(null);
                                    setOpenCombobox(false);
                                }}>
                                    <Check className={cn("mr-2 h-4 w-4",!selectedMemberId ? "opacity-100" : "opacity-0")}/>
                                    All Users
                                </CommandItem>
                                {teamMembers.map((member) => (
                                    <CommandItem
                                    key={member.id}
                                    value={member.name}
                                    onSelect={() => {
                                        setSelectedMemberId(member.id);
                                        setOpenCombobox(false);
                                    }}
                                    >
                                    <Check className={cn("mr-2 h-4 w-4", selectedMemberId === member.id ? "opacity-100" : "opacity-0")}/>
                                    {member.name}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <Button onClick={handleOpenAddDialog}>
                        <PlusCircle className="h-4 w-4 mr-2" /> {t('addContractBtn')}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>{t('nameColumn')}</TableHead>
                            <TableHead>{t('email')}</TableHead>
                            <TableHead>{t('startDate')}</TableHead>
                            <TableHead>{t('endDate')}</TableHead>
                            <TableHead>{t('status')}</TableHead>
                            <TableHead className="text-right">{t('weeklyHours')}</TableHead>
                            <TableHead className="text-right">{t('actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredContracts.length > 0 ? filteredContracts.map(contract => {
                            const isPast = contract.endDate ? new Date(contract.endDate) < startOfDay(new Date()) : false;
                            const canModify = currentUser.role === 'Super Admin' || !isPast;
                            const status = getContractStatus(contract);
                            return (
                                <TableRow key={contract.id} className={cn(isPast && "text-muted-foreground bg-muted/20")}>
                                    <TableCell className="font-mono text-xs">{contract.id}</TableCell>
                                    <TableCell>{getUserName(contract.userId)}</TableCell>
                                    <TableCell>{getUserEmail(contract.userId)}</TableCell>
                                    <TableCell>{format(new Date(contract.startDate), 'PP')}</TableCell>
                                    <TableCell>{contract.endDate ? format(new Date(contract.endDate), 'PP') : 'Ongoing'}</TableCell>
                                    <TableCell>
                                        <Badge variant={status === 'Active' ? 'default' : status === 'Upcoming' ? 'secondary' : 'destructive'} className={cn(status === 'Active' && 'bg-green-600')}>{status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{contract.weeklyHours}h</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleOpenEditDialog(contract)} disabled={!canModify}>Edit</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setDeletingContract(contract)} className={cn(!canModify ? "text-muted-foreground focus:text-muted-foreground" : "text-destructive focus:text-destructive")} disabled={!canModify}>Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )
                        }) : (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    {selectedMemberId ? "No contracts found for the selected user." : "No contracts found for the selected status."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <ContractDialog 
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            onSave={handleSaveContract}
            contract={editingContract}
            users={teamMembers}
            userId={selectedUserIdForNew}
        />
        <DeleteContractDialog
            isOpen={!!deletingContract}
            onOpenChange={() => setDeletingContract(null)}
            onConfirm={handleDeleteContract}
            contract={deletingContract}
        />
        </>
    )
}
