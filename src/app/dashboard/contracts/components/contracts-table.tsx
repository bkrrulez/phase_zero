
'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMembers } from '@/app/dashboard/contexts/MembersContext';
import { useContracts } from '@/app/dashboard/contexts/ContractsContext';
import { useLanguage } from '@/app/dashboard/contexts/LanguageContext';

export function ContractsTable() {
    const { teamMembers } = useMembers();
    const { contracts } = useContracts();
    const { t } = useLanguage();

    const [openCombobox, setOpenCombobox] = React.useState(false);
    const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);
    
    const filteredContracts = React.useMemo(() => {
        if (!selectedMemberId) return contracts;
        return contracts.filter(c => c.userId === selectedMemberId);
    }, [contracts, selectedMemberId]);

    const getUserName = (userId: string) => {
        return teamMembers.find(m => m.id === userId)?.name || userId;
    }

    const getUserEmail = (userId: string) => {
        return teamMembers.find(m => m.id === userId)?.email || 'N/A';
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
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>{t('name')}</TableHead>
                            <TableHead>{t('email')}</TableHead>
                            <TableHead>{t('startDate')}</TableHead>
                            <TableHead>{t('endDate')}</TableHead>
                            <TableHead className="text-right">{t('weeklyHours')}</TableHead>
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
                                </TableRow>
                            )
                        })}
                         {filteredContracts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">{t('noContractsFound')}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        </>
    )
}
