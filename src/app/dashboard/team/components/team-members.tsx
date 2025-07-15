
'use client';

import * as React from 'react';
import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type User } from "@/lib/mock-data";
import { EditMemberDialog } from "./edit-contract-dialog";
import { useToast } from "@/hooks/use-toast";
import { ChangePasswordDialog } from "./change-password-dialog";
import { sendPasswordChangeEmail } from "@/lib/mail";
import { useMembers } from "../../contexts/MembersContext";
import { useTeams } from "../../contexts/TeamsContext";
import { useAuth } from "../../contexts/AuthContext";
import { useSystemLog } from '../../contexts/SystemLogContext';
import { useLanguage } from '../../contexts/LanguageContext';

export function TeamMembers() {
    const { toast } = useToast();
    const { teamMembers, updateMember } = useMembers();
    const { teams } = useTeams();
    const { currentUser } = useAuth();
    const { logAction } = useSystemLog();
    const { t } = useLanguage();
    const [editingUser, setEditingUser] = React.useState<User | null>(null);
    const [changingPasswordUser, setChangingPasswordUser] = React.useState<User | null>(null);
    const [isSavingPassword, setIsSavingPassword] = React.useState(false);
    
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
        
        // Sort to bring current user to the top
        uniqueMembers.sort((a, b) => {
            if (a.id === currentUser.id) return -1;
            if (b.id === currentUser.id) return 1;
            return a.name.localeCompare(b.name); // Keep alphabetical sort for the rest
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

    const canDownloadContract = (member: User) => {
        if (!member.contractPdf) return false;
        if (currentUser.role === 'Super Admin') return true;
        if (currentUser.id === member.id) return true;
        if (currentUser.role === 'Team Lead' && member.reportsTo === currentUser.id) return true;
        return false;
    }

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
      <Card>
          <CardHeader>
              <CardTitle>{t('teamMembersTabTitle')}</CardTitle>
              <CardDescription>{t('teamMembersTabDesc')}</CardDescription>
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
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                              </TableCell>
                          </TableRow>
                      ))}
                      {visibleMembers.length === 0 && (
                          <TableRow>
                              <TableCell colSpan={7} className="h-24 text-center">{t('noMembersToDisplay')}</TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
        </Card>
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
      <ChangePasswordDialog
        user={changingPasswordUser}
        isOpen={!!changingPasswordUser}
        onOpenChange={(isOpen) => {
            if (!isOpen) setChangingPasswordUser(null);
        }}
        onSave={handlePasswordChange}
        isSaving={isSavingPassword}
      />
    </>
  )
}
