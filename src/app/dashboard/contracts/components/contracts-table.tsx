
'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, MoreHorizontal, PlusCircle } from 'lucide-react';
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

export function ContractsTable() {
    const { teamMembers } = useMembers();
    const { contracts, isLoading, addContract, updateContract, deleteContract: deleteContractFromContext } = useContracts();
    const { t } = useLanguage();
    const { toast } = useToast();
    const { currentUser } = useAuth();
    const { logAction } = useSystemLog();

    const [openCombobox, setOpenCombobox] = React.useState(false);
    const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingContract, setEditingContract] = React.useState<Contract | null>(null);
    const [deletingContract, setDeletingContract] = React.useState<Contract | null>(null);
    const [selectedUserIdForNew, setSelectedUserIdForNew] = React.useState<string | undefined>(undefined);

    const getUserName = (userId: string) => {
        return teamMembers.find(m => m.id === userId)?.name || userId;
    }
    
    const sortedContracts = React.useMemo(() => {
        return [...contracts].sort((a, b) => {
            const nameA = getUserName(a.userId).toLowerCase();
            const nameB = getUserName(b.userId).toLowerCase();
            
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;

            // If names are equal, sort by end date (descending, nulls first)
            const dateA = a.endDate ? new Date(a.endDate).getTime() : Infinity;
            const dateB = b.endDate ? new Date(b.endDate).getTime() : Infinity;
            
            return dateB - dateA;
        });
    }, [contracts, teamMembers]);

    const filteredContracts = React.useMemo(() => {
        if (!selectedMemberId) return sortedContracts;
        return sortedContracts.filter(c => c.userId === selectedMemberId);
    }, [sortedContracts, selectedMemberId]);


    const getUserEmail = (userId: string) => {
        return teamMembers.find(m => m.id === userId)?.email || 'N/A';
    }

    const handleOpenAddDialog = () => {
        setEditingContract(null);
        setSelectedUserIdForNew(undefined);
        setIsDialogOpen(true);
    }
    
    const handleOpenEditDialog = (contract: Contract) => {
        setEditingContract(contract);
        setSelectedUserIdForNew(undefined);
        setIsDialogOpen(true);
    }

    const handleSaveContract = async (data: Omit<Contract, 'id'>) => {
        if (editingContract) {
            await updateContractAction(editingContract.id, data);
            updateContract(editingContract.id, data);
            toast({ title: "Contract Updated" });
            logAction(`User '${currentUser.name}' updated contract #${editingContract.id}.`);
        } else {
            await addContractAction(data);
            addContract(data); // This might need adjustment if the context isn't set up for this
            toast({ title: "Contract Added" });
            logAction(`User '${currentUser.name}' added a new contract for user ID ${data.userId}.`);
        }
        setIsDialogOpen(false);
        setEditingContract(null);
    }

    const handleDeleteContract = async () => {
        if (!deletingContract) return;
        await deleteContractAction(deletingContract.id);
        deleteContractFromContext(deletingContract.id);
        toast({ title: "Contract Deleted", variant: "destructive" });
        logAction(`User '${currentUser.name}' deleted contract #${deletingContract.id}.`);
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
                            <TableHead className="text-right">{t('weeklyHours')}</TableHead>
                            <TableHead className="text-right">{t('actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredContracts.map(contract => {
                            const isPast = contract.endDate ? new Date(contract.endDate) < new Date() : false;
                            return (
                                <TableRow key={contract.id} className={cn(isPast && "text-muted-foreground")}>
                                    <TableCell className="font-mono text-xs">{contract.id}</TableCell>
                                    <TableCell>{getUserName(contract.userId)}</TableCell>
                                    <TableCell>{getUserEmail(contract.userId)}</TableCell>
                                    <TableCell>{format(new Date(contract.startDate), 'PP')}</TableCell>
                                    <TableCell>{contract.endDate ? format(new Date(contract.endDate), 'PP') : 'Ongoing'}</TableCell>
                                    <TableCell className="text-right">{contract.weeklyHours}h</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleOpenEditDialog(contract)}>Edit</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setDeletingContract(contract)} className="text-destructive">Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                         {filteredContracts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">{t('noContractsFound')}</TableCell>
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
