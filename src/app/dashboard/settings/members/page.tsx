
'use client';

import * as React from 'react';
import { format } from "date-fns";
import { MoreHorizontal, PlusCircle, FileUp, Download } from "lucide-react";
import Link from "next/link";
import * as XLSX from 'xlsx-js-style';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type User } from "@/lib/mock-data";
import { EditMemberDialog } from "@/app/dashboard/team/components/edit-contract-dialog";
import { useToast } from "@/hooks/use-toast";
import { AddMemberDialog } from "@/app/dashboard/team/components/add-member-dialog";
import { ChangePasswordDialog } from "@/app/dashboard/team/components/change-password-dialog";
import { sendPasswordChangeEmail } from "@/lib/mail";
import { useMembers } from "../../contexts/MembersContext";
import { useTeams } from "../../contexts/TeamsContext";
import { useSystemLog } from '../../contexts/SystemLogContext';
import { useAuth } from '../../contexts/AuthContext';
import { DeleteMemberDialog } from "./components/delete-member-dialog";
import { useLanguage } from '../../contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MemberContractTab } from './components/member-contract-tab';

export default function MembersSettingsPage() {
    const { toast } = useToast();
    const { teamMembers, updateMember, addMember, deleteMember } = useMembers();
    const { teams } = useTeams();
    const { logAction } = useSystemLog();
    const { currentUser } = useAuth();
    const { t } = useLanguage();
    const [editingUser, setEditingUser] = React.useState<User | null>(null);
    const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = React.useState(false);
    const [changingPasswordUser, setChangingPasswordUser] = React.useState<User | null>(null);
    const [isSavingPassword, setIsSavingPassword] = React.useState(false);
    const [deletingUser, setDeletingUser] = React.useState<User | null>(null);
    
    const visibleMembers = React.useMemo(() => {
        let members: User[];
        if (currentUser.role === 'Super Admin') {
            members = teamMembers;
        } else if (currentUser.role === 'Team Lead') {
            members = teamMembers.filter(member => member.id === currentUser.id || member.reportsTo === currentUser.id);
        } else { // Employee
            members = teamMembers.filter(member => member.id === currentUser.id);
        }
        const uniqueMembers = Array.from(new Map(members.map(item => [item.id, item])).values());
        
        uniqueMembers.sort((a, b) => {
            if (a.id === currentUser.id) return -1;
            if (b.id === currentUser.id) return 1;
            return a.name.localeCompare(b.name);
        });

        return uniqueMembers;
    }, [teamMembers, currentUser]);

    const handleSaveDetails = (updatedUser: User) => {
        updateMember(updatedUser);
        setEditingUser(null);
        toast({
            title: t('memberDetailsUpdated'),
            description: t('memberDetailsUpdatedDesc', { name: updatedUser.name }),
        });
        logAction(`User '${currentUser.name}' updated details for member '${updatedUser.name}'.`);
    }

    const handleAddMember = (newUser: User) => {
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
            await sendPasswordChangeEmail({ to: changingPasswordUser.email, name: changingPasswordUser.name });
            toast({
                title: t('passwordChanged'),
                description: t('passwordChangedDesc', { name: changingPasswordUser.name }),
            });
            logAction(`User '${currentUser.name}' changed password for '${changingPasswordUser.name}'.`);
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
            return member.reportsTo === currentUser.id && member.role === 'Employee';
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

    const canAddMember = currentUser.role === 'Super Admin' || currentUser.role === 'Team Lead';

    const getTeamName = (teamId?: string) => {
        if (!teamId) return 'N/A';
        const team = teams.find(t => t.id === teamId);
        return team?.name ?? 'N/A';
    };

    const handleExport = () => {
        if (visibleMembers.length === 0) return;
    
        const dataForExport = visibleMembers.map(member => ({
            [t('member')]: member.name,
            [t('email')]: member.email,
            [t('role')]: member.role,
            [t('team')]: getTeamName(member.teamId),
            [t('weeklyHours')]: member.contract.weeklyHours,
            [t('contractStart')]: format(new Date(member.contract.startDate), 'yyyy-MM-dd'),
            [t('contractEnd')]: member.contract.endDate ? format(new Date(member.contract.endDate), 'yyyy-MM-dd') : 'N/A'
        }));
    
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
            <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
                <TabsTrigger value="all-members">All Members</TabsTrigger>
                {currentUser.role === 'Super Admin' && <TabsTrigger value="member-contract">Member Contract</TabsTrigger>}
            </TabsList>
            <TabsContent value="all-members">
                <Card>
                <CardHeader>
                    <CardTitle>{t('allMembers')}</CardTitle>
                    <CardDescription>{t('allMembersDesc')}</CardDescription>
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
                            {visibleMembers.map(member => (
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
                                    <TableCell className="hidden md:table-cell text-right font-mono">{member.contract.weeklyHours}h</TableCell>
                                    <TableCell className="hidden lg:table-cell">{format(new Date(member.contract.startDate), 'PP')}</TableCell>
                                    <TableCell className="hidden lg:table-cell">{member.contract.endDate ? format(new Date(member.contract.endDate), 'PP') : 'N/A'}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Toggle menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/dashboard/reports?tab=individual-report&userId=${member.id}`}>{t('viewReport')}</Link>
                                                </DropdownMenuItem>
                                                 {canDownloadContract(member) && (
                                                    <DropdownMenuItem onClick={() => handleDownloadContract(member)}>
                                                        Download Contract
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
                            ))}
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
            onSave={handleSaveDetails}
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
