
'use client';

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { teamMembers as initialTeamMembers, currentUser, type User, teams } from "@/lib/mock-data";
import { EditMemberDialog } from "@/app/dashboard/team/components/edit-contract-dialog";
import { useToast } from "@/hooks/use-toast";
import { AddMemberDialog } from "@/app/dashboard/team/components/add-member-dialog";
import { ChangePasswordDialog } from "@/app/dashboard/team/components/change-password-dialog";
import { sendPasswordChangeEmail } from "@/lib/mail";

export default function MembersSettingsPage() {
    const { toast } = useToast();
    const [teamMembers, setTeamMembers] = useState(initialTeamMembers);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
    const [changingPasswordUser, setChangingPasswordUser] = useState<User | null>(null);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    
    const visibleMembers = useMemo(() => {
        if (currentUser.role === 'Super Admin') {
            return teamMembers;
        }
        if (currentUser.role === 'Team Lead') {
            return teamMembers.filter(member => member.id === currentUser.id || member.reportsTo === currentUser.id);
        }
        // Employee
        return teamMembers.filter(member => member.id === currentUser.id);
    }, [teamMembers]);

    const handleSaveDetails = (updatedUser: User) => {
        setTeamMembers(prevMembers =>
            prevMembers.map(member => member.id === updatedUser.id ? updatedUser : member)
        );
        setEditingUser(null);
        toast({
            title: "Member Details Updated",
            description: `Successfully updated details for ${updatedUser.name}.`,
        });
    }

    const handleAddMember = (newUser: User) => {
        setTeamMembers(prev => [...prev, newUser]);
        setIsAddMemberDialogOpen(false);
        toast({
            title: "Member Added",
            description: `${newUser.name} has been added to the team.`,
        });
    };

    const handlePasswordChange = async (password: string) => {
        if (!changingPasswordUser) return;

        setIsSavingPassword(true);
        try {
            await sendPasswordChangeEmail({ to: changingPasswordUser.email, name: changingPasswordUser.name });
            toast({
                title: "Password Changed",
                description: `Password for ${changingPasswordUser.name} has been changed and a notification email has been sent.`,
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: "Could not send password change notification. Please check SMTP settings.",
            });
        } finally {
            setIsSavingPassword(false);
            setChangingPasswordUser(null);
        }
    };

    const canEditMember = (member: User) => {
        if (currentUser.role === 'Super Admin') {
            // A super admin can edit themselves, or any user who is not another super admin.
            return currentUser.id === member.id || member.role !== 'Super Admin';
        }
        if (currentUser.role === 'Team Lead') {
            // A team lead can only edit their direct reports (employees).
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

    const canAddMember = currentUser.role === 'Super Admin' || currentUser.role === 'Team Lead';

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
            <h1 className="text-3xl font-bold font-headline">All Members</h1>
            <p className="text-muted-foreground">Manage all members in the system.</p>
          </div>
          {canAddMember && (
            <Button onClick={() => setIsAddMemberDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Member
            </Button>
          )}
        </div>
        <Card>
          <CardHeader>
              <CardTitle>All Members</CardTitle>
              <CardDescription>A list of all members you have permission to view.</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead className="hidden md:table-cell">Role</TableHead>
                          <TableHead className="hidden md:table-cell">Team</TableHead>
                          <TableHead className="hidden md:table-cell text-right">Weekly Contract Hours</TableHead>
                          <TableHead className="hidden lg:table-cell">Contract Start</TableHead>
                          <TableHead className="hidden lg:table-cell">Contract End</TableHead>
                          <TableHead><span className="sr-only">Actions</span></TableHead>
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
                                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                          <DropdownMenuItem asChild>
                                            <Link href={`/dashboard/reports?tab=individual-report&userId=${member.id}`}>View Report</Link>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            onClick={() => setEditingUser(member)}
                                            disabled={!canEditMember(member)}
                                          >
                                            View/Edit Details
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => setChangingPasswordUser(member)}
                                            disabled={!canChangePassword(member)}
                                          >
                                            Change Password
                                          </DropdownMenuItem>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                              </TableCell>
                          </TableRow>
                      ))}
                      {visibleMembers.length === 0 && (
                          <TableRow>
                              <TableCell colSpan={7} className="h-24 text-center">No members to display.</TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
        </Card>
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
    </>
  )
}
