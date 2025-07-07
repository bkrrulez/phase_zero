'use client';

import { useState, useMemo } from 'react';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { teamMembers as initialTeamMembers, teams as initialTeams, projects as allProjects, currentUser, type User, type Team } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { AddTeamDialog, type TeamFormValues } from './components/add-team-dialog';
import { EditTeamDialog } from './components/edit-team-dialog';

export default function TeamsSettingsPage() {
    const { toast } = useToast();
    const [teams, setTeams] = useState<Team[]>(initialTeams);
    const [users, setUsers] = useState<User[]>(initialTeamMembers);
    
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);

    const canManageTeams = currentUser.role === 'Super Admin';

    const teamDetails = useMemo(() => {
        return teams.map(team => {
            const lead = users.find(u => u.teamId === team.id && u.role === 'Team Lead');
            const members = users.filter(u => u.teamId === team.id && u.role === 'Employee');
            const projects = allProjects.filter(p => team.projectIds?.includes(p.id));
            return {
                ...team,
                lead,
                members,
                projects,
            }
        });
    }, [teams, users]);

    const handleAddTeam = (data: TeamFormValues) => {
        const finalLeadId = data.leadId === 'none' ? undefined : data.leadId;
        const newTeam: Team = {
            id: `team-${Date.now()}`,
            name: data.name,
            projectIds: data.projectIds,
        };

        setTeams(prev => [...prev, newTeam]);
        
        setUsers(prevUsers => {
            return prevUsers.map(user => {
                if (user.id === finalLeadId || data.memberIds?.includes(user.id)) {
                    return { ...user, teamId: newTeam.id };
                }
                return user;
            });
        });

        setIsAddDialogOpen(false);
        toast({
            title: "Team Added",
            description: `The team "${data.name}" has been created.`,
        });
    };

    const handleSaveTeam = (teamId: string, data: TeamFormValues) => {
        const finalLeadId = data.leadId === 'none' ? undefined : data.leadId;
        
        setTeams(prevTeams => 
            prevTeams.map(team => 
                team.id === teamId ? { ...team, name: data.name, projectIds: data.projectIds } : team
            )
        );

        setUsers(prevUsers => {
            return prevUsers.map(user => {
                // User is the new lead
                if (user.id === finalLeadId) {
                    return { ...user, teamId };
                }
                // User is a new member
                if (data.memberIds?.includes(user.id)) {
                    return { ...user, teamId };
                }
                // User was part of the team, but no longer is
                if (user.teamId === teamId && user.id !== finalLeadId && !data.memberIds?.includes(user.id)) {
                    return { ...user, teamId: undefined };
                }
                return user;
            });
        });

        setEditingTeam(null);
        toast({
            title: "Team Updated",
            description: `The team "${data.name}" has been updated.`,
        });
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Teams</h1>
                        <p className="text-muted-foreground">Manage teams, their members, and projects.</p>
                    </div>
                    {canManageTeams && (
                        <Button onClick={() => setIsAddDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Team
                        </Button>
                    )}
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>All Teams</CardTitle>
                        <CardDescription>A list of all teams in the organization.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Team</TableHead>
                                    <TableHead>Team Lead</TableHead>
                                    <TableHead>Team Members</TableHead>
                                    <TableHead>Projects</TableHead>
                                    {canManageTeams && <TableHead><span className="sr-only">Actions</span></TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {teamDetails.map(team => (
                                    <TableRow key={team.id}>
                                        <TableCell className="font-medium">{team.name}</TableCell>
                                        <TableCell>{team.lead?.name || 'N/A'}</TableCell>
                                        <TableCell>{team.members.length}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">
                                            {team.projects.map(p => p.name).join(', ') || 'N/A'}
                                        </TableCell>
                                        {canManageTeams && (
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
                                                        <DropdownMenuItem onClick={() => setEditingTeam(team)}>
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive">
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                                {teamDetails.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">No teams created yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            {canManageTeams && (
                <>
                    <AddTeamDialog
                        isOpen={isAddDialogOpen}
                        onOpenChange={setIsAddDialogOpen}
                        onAddTeam={handleAddTeam}
                        allUsers={users}
                        allProjects={allProjects}
                    />
                    {editingTeam && (
                        <EditTeamDialog
                            isOpen={!!editingTeam}
                            onOpenChange={(isOpen) => !isOpen && setEditingTeam(null)}
                            onSaveTeam={handleSaveTeam}
                            team={editingTeam}
                            allUsers={users}
                            allProjects={allProjects}
                        />
                    )}
                </>
            )}
        </>
    );
}
