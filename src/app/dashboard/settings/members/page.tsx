
'use client';

import * as React from 'react';
import { format, min as minDate, max as maxDate, isWithinInterval } from "date-fns";
import { MoreHorizontal, PlusCircle, FileUp } from "lucide-react";
import Link from "next/link";
import * as XLSX from 'xlsx-js-style';
import { useSearchParams } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type User } from "@/lib/types";
import { EditMemberDialog, type EditMemberFormValues } from "@/app/dashboard/team/components/edit-contract-dialog";
import { useToast } from "@/hooks/use-toast";
import { AddMemberDialog } from "@/app/dashboard/team/components/add-member-dialog";
import { ChangePasswordDialog } from "@/app/dashboard/team/components/change-password-dialog";
import { updateUserPasswordAndNotify } from "@/app/dashboard/actions";
import { useMembers } from "../../contexts/MembersContext";
import { useTeams } from "../../contexts/TeamsContext";
import { useSystemLog } from '../../contexts/SystemLogContext';
import { useAuth } from '../../contexts/AuthContext';
import { DeleteMemberDialog } from "./components/delete-member-dialog";
import { useLanguage } from '../../contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MemberContractTab } from './components/member-contract-tab';
import { cn } from '@/lib/utils';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';


export default function MembersSettingsPage() {
    const { toast } = useToast();
    const { teamMembers, updateMember, addMember, deleteMember } = useMembers();
    const { teams } = useTeams();
    const { logAction } = useSystemLog();
    const { currentUser } = useAuth();
    const { t } = useLanguage();
    const searchParams = useSearchParams();

    const [editingUser, setEditingUser] = React.useState<User | null>(null);
    const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = React.useState(false);
    const [changingPasswordUser, setChangingPasswordUser] = React.useState<User | null>(null);
    const [isSavingPassword, setIsSavingPassword] = React.useState(false);
    const [deletingUser, setDeletingUser] = React.useState<User | null>(null);
    const [selectedTeams, setSelectedTeams] = React.useState<string[]>(['all']);
    
    React.useEffect(() => {
        const teamIdFromQuery = searchParams.get('teamId');
        if (teamIdFromQuery) {
            setSelectedTeams([teamIdFromQuery]);
        }
    }, [searchParams]);

    const canAddMember = currentUser.role === 'Super Admin';

    const teamOptions = React.useMemo<MultiSelectOption[]>(() => {
        return [
            { value: 'all', label: 'All Teams' },
            { value: 'none', label: 'No Team' },
            ...teams.map(team => ({ value: team.id, label: team.name }))
        ];
    }, [teams]);

    const handleTeamSelectionChange = (newSelection: string[]) => {
      // If the new selection is empty, revert to "all"
      if (newSelection.length === 0) {
        setSelectedTeams(['all']);
        return;
      }
      
      // If "All" was just selected, it should be the only item.
      if (newSelection.length > 1 && newSelection[newSelection.length - 1] === 'all') {
        setSelectedTeams(['all']);
      } 
      // If "All" is in the selection but it wasn't the last one added,
      // it means something else was added, so remove "All".
      else if (newSelection.length > 1 && newSelection.includes('all')) {
        setSelectedTeams(newSelection.filter(s => s !== 'all'));
      } 
      // Otherwise, just update with the new selection.
      else {
        setSelectedTeams(newSelection);
      }
    };
    
    const visibleMembers = React.useMemo(() => {
        let members: User[];
        if (currentUser.role === 'Super Admin') {
            members = teamMembers;
        } else if (currentUser.role === 'Team Lead') {
            members = teamMembers.filter(member => member.id === currentUser.id || member.reportsTo === currentUser.id);
        } else { // User
            members = teamMembers.filter(member => member.id === currentUser.id);
        }

        if (!selectedTeams.includes('all')) {
             members = members.filter(member => {
                let matches = false;
                if (selectedTeams.includes('none') && !member.teamId) {
                    matches = true;
                }
                if (member.teamId && selectedTeams.includes(member.teamId)) {
                    matches = true;
                }
                return matches;
            });
        }
        
        const uniqueMembers = Array.from(new Map(members.map(item => [item.id, item])).values());
        
        uniqueMembers.sort((a, b) => {
            if (a.id === currentUser.id) return -1;
            if (b.id === currentUser.id) return 1;
            return a.name.localeCompare(b.name);
        });

        return uniqueMembers;
    }, [teamMembers, currentUser, selectedTeams]);

    const handleSaveDetails = async (updatedData: EditMemberFormValues) => {
        if (!editingUser) return;
        
        await updateMember(editingUser, updatedData);

        setEditingUser(null);
        toast({
            title: t('memberDetailsUpdated'),
            description: t('memberDetailsUpdatedDesc', { name: updatedData.name }),
        });
        await logAction(`User '${currentUser.name}' updated details for member '${updatedData.name}'.`);
    }

    const handleAddMember = (newUser: Omit<User, 'id'|'avatar'>) => {
        addMember(newUser);
        setIsAddMemberDialogOpen(false);
        toast({
            title: t('memberAdded'),
            description: t('memberAddedDesc', { name: newUser.name }),
        });
        logAction(`User '${currentUser.name}' added a new member: '${newUser.name}'.`);
    };

    const handlePasswordChange = async (password: string) => {
        if (!changingPasswordUser) return;

        setIsSavingPassword(true);
        try {
            await updateUserPasswordAndNotify({ email: changingPasswordUser.email, name: changingPasswordUser.name, password: password });
            toast({
                title: t('passwordChanged'),
                description: t('passwordChangedDesc', { name: changingPasswordUser.name }),
            });
            await logAction(`User '${currentUser.name}' changed password for '${changingPasswordUser.name}'.`);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('error'),
                description: t('smtpError'),
            });
        } finally {
            setIsSavingPassword(false);
            setChangingPasswordUser(null);
        }
    };

    const handleDeleteUser = () => {
        if (!deletingUser) return;
        deleteMember(deletingUser.id);
        toast({
            title: t('userDeleted'),
            description: t('userDeletedDesc', { name: deletingUser.name }),
            variant: "destructive"
        });
        logAction(`User '${currentUser.name}' deleted user '${deletingUser.name}'.`);
        setDeletingUser(null);
    };

    const canEditMember = (member: User) => {
        if (currentUser.role === 'Super Admin') {
            return true;
        }
        if (currentUser.role === 'Team Lead') {
            return member.reportsTo === currentUser.id && member.role === 'User';
        }
        return false;
    };
    
    const canChangePassword = (member: User) => {
        if (currentUser.role === 'Super Admin') return true;
        if (currentUser.id === member.id) return true;
        if (currentUser.role === 'Team Lead' && member.reportsTo === currentUser.id) return true;
        return false;
    };

    const canDeleteMember = (member: User) => {
        if (currentUser.role !== 'Super Admin') return false;
        if (currentUser.id === member.id) return false;
        return true;
    };

    const canDownloadContract = (member: User) => {
        if (!member.contractPdf) return false;
        if (currentUser.role === 'Super Admin') return true;
        if (currentUser.id === member.id) return true;
        if (currentUser.role === 'Team Lead' && member.reportsTo === currentUser.id) return true;
        return false;
    }

    const getAggregatedContractDetails = (member: User) => {
        const now = new Date();
        const activeContracts = member.contracts.filter(c => {
            const start = new Date(c.startDate);
            const end = c.endDate ? new Date(c.endDate) : new Date('9999-12-31');
            return isWithinInterval(now, { start, end });
        });

        if (activeContracts.length === 0) {
            const sortedContracts = [...member.contracts].sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            const mostRecent = sortedContracts[0] || member.contract; 
            return {
                weeklyHours: mostRecent.weeklyHours,
                startDate: mostRecent.startDate,
                endDate: mostRecent.endDate
            };
        }

        const totalWeeklyHours = activeContracts.reduce((sum, c) => sum + c.weeklyHours, 0);
        const earliestStartDate = minDate(activeContracts.map(c => new Date(c.startDate)));
        
        const endDates = activeContracts.map(c => c.endDate ? new Date(c.endDate) : null).filter(Boolean);
        const latestEndDate = endDates.length > 0 ? maxDate(endDates as Date[]) : null;

        return {
            weeklyHours: totalWeeklyHours,
            startDate: format(earliestStartDate, 'yyyy-MM-dd'),
            endDate: latestEndDate ? format(latestEndDate, 'yyyy-MM-dd') : null,
        };
    };

    const handleExport = () => {
        if (visibleMembers.length === 0) return;
    
        const dataForExport = visibleMembers.map(member => {
            const contractDetails = getAggregatedContractDetails(member);
            return {
                [t('member')]: member.name,
                [t('email')]: member.email,
                [t('role')]: member.role,
                [t('team')]: getTeamName(member.teamId),
                [t('weeklyHours')]: contractDetails.weeklyHours,
                [t('contractStart')]: format(new Date(contractDetails.startDate), 'yyyy-MM-dd'),
                [t('contractEnd')]: contractDetails.endDate ? format(new Date(contractDetails.endDate), 'yyyy-MM-dd') : 'Ongoing'
            };
        });
    
        const worksheet = XLSX.utils.json_to_sheet(dataForExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Members");
    
        XLSX.writeFile(workbook, `all_members_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleDownloadContract = (member: User) => {
        if (!member.contractPdf) return;
        const link = document.createElement('a');
        link.href = member.contractPdf;
        link.download = `contract-${member.name.replace(/\s+/g, '-')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getTeamName = (teamId?: string) => {
        if (!teamId) return 'N/A';
        const team = teams.find(t => t.id === teamId);
        return team?.name ?? 'N/A';
    };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">{t('members')}</h1>
            <p className="text-muted-foreground">{t('allMembersSubtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
                <FileUp className="mr-2 h-4 w-4" /> {t('export')}
            </Button>
            {canAddMember && (
                <Button onClick={() => setIsAddMemberDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> {t('addMember')}
                </Button>
            )}
          </div>
        </div>
        <Tabs defaultValue="all-members">
            <TabsList className={cn("grid w-full", currentUser.role === 'Super Admin' ? "grid-cols-2 md:w-[400px]" : "grid-cols-1 md:w-[200px]")}>
                <TabsTrigger value="all-members">{t('allMembers')}</TabsTrigger>
                {currentUser.role === 'Super Admin' && <TabsTrigger value="member-contract">{t('memberContractTab')}</TabsTrigger>}
            </TabsList>
            <TabsContent value="all-members">
                <Card>
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                        <CardTitle>{t('allMembers')}</CardTitle>
                        <CardDescription>{t('allMembersDesc')}</CardDescription>
                    </div>
                    <MultiSelect
                        options={teamOptions}
                        selected={selectedTeams}
                        onChange={handleTeamSelectionChange}
                        placeholder="Filter by team..."
                        className="w-full sm:w-[220px]"
                    />
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('member')}</TableHead>
                                <TableHead className="hidden md:table-cell">{t('role')}</TableHead>
                                <TableHead className="hidden md:table-cell">{t('team')}</TableHead>
                                <TableHead className="hidden md:table-cell text-right">{t('weeklyHours')}</TableHead>
                                <TableHead className="hidden lg:table-cell">{t('contractStart')}</TableHead>
                                <TableHead className="hidden lg:table-cell">{t('contractEnd')}</TableHead>
                                <TableHead><span className="sr-only">{t('actions')}</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleMembers.map(member => {
                                const contractDetails = getAggregatedContractDetails(member);
                                return (
                                <TableRow key={member.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-10 h-10">
                                                <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="person avatar"/>
                                                <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{member.name}</p>
                                                <p className="text-sm text-muted-foreground hidden sm:table-cell">{member.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <Badge variant={member.role === 'Team Lead' || member.role === 'Super Admin' ? "default" : "secondary"}>{member.role}</Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{getTeamName(member.teamId)}</TableCell>
                                    <TableCell className="hidden md:table-cell text-right font-mono">{contractDetails.weeklyHours}h</TableCell>
                                    <TableCell className="hidden lg:table-cell">{format(new Date(contractDetails.startDate), 'PP')}</TableCell>
                                    <TableCell className="hidden lg:table-cell">{contractDetails.endDate ? format(new Date(contractDetails.endDate), 'PP') : 'Ongoing'}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">{t('toggleMenu')}</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/dashboard/reports?tab=individual-report&userId=${member.id}`}>{t('viewReport')}</Link>
                                                </DropdownMenuItem>
                                                 {canDownloadContract(member) && (
                                                    <DropdownMenuItem onClick={() => handleDownloadContract(member)}>
                                                        {t('downloadContract')}
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem 
                                                    onClick={() => setEditingUser(member)}
                                                    disabled={!canEditMember(member)}
                                                >
                                                    {t('viewEditDetails')}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => setChangingPasswordUser(member)}
                                                    disabled={!canChangePassword(member)}
                                                >
                                                    {t('changePassword')}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => setDeletingUser(member)}
                                                    disabled={!canDeleteMember(member)}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    {t('deleteUser')}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )})}
                            {visibleMembers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">{t('noMembers')}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                </Card>
            </TabsContent>
            {currentUser.role === 'Super Admin' && (
                <TabsContent value="member-contract">
                    <MemberContractTab />
                </TabsContent>
            )}
        </Tabs>
      </div>
      {editingUser && (
        <EditMemberDialog 
            user={editingUser}
            isOpen={!!editingUser}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setEditingUser(null);
                }
            }}
            onSave={(data) => handleSaveDetails(editingUser, data)}
            teamMembers={teamMembers}
        />
      )}
      <AddMemberDialog
        isOpen={isAddMemberDialogOpen}
        onOpenChange={setIsAddMemberDialogOpen}
        onAddMember={handleAddMember}
        teamMembers={teamMembers}
      />
      <ChangePasswordDialog
        user={changingPasswordUser}
        isOpen={!!changingPasswordUser}
        onOpenChange={(isOpen) => {
            if (!isOpen) setChangingPasswordUser(null);
        }}
        onSave={handlePasswordChange}
        isSaving={isSavingPassword}
      />
      <DeleteMemberDialog
        isOpen={!!deletingUser}
        onOpenChange={(isOpen) => !isOpen && setDeletingUser(null)}
        onConfirm={handleDeleteUser}
        member={deletingUser}
      />
    </>
  )
}
