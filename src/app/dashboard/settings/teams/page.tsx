
'use client';

import { useState, useMemo } from 'react';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { currentUser, type User, type Team } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { AddTeamDialog, type TeamFormValues } from './components/add-team-dialog';
import { EditTeamDialog } from './components/edit-team-dialog';
import { useMembers } from '../../contexts/MembersContext';
import { useTeams } from '../../contexts/TeamsContext';
import { useProjects } from '../../contexts/ProjectsContext';

export default function TeamsSettingsPage() {
    const { toast } = useToast();
    const { teamMembers, updateMember } = useMembers();
    const { teams, setTeams } = useTeams();
    const { projects } = useProjects();
    
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);

    const canManageTeams = currentUser.role === 'Super Admin';

    const teamDetails = useMemo(() => {
        return teams.map(team => {
            const lead = teamMembers.find(u => u.teamId === team.id && u.role === 'Team Lead');
            const members = teamMembers.filter(u => u.teamId === team.id && u.role === 'Employee');
            const teamProjects = projects.filter(p => team.projectIds?.includes(p.id));
            return {
                ...team,
                lead,
                members,
                projects: teamProjects,
            }
        });
    }, [teams, teamMembers, projects]);

    const handleAddTeam = (data: TeamFormValues) => {
        const finalLeadId = data.leadId === 'none' ? undefined : data.leadId;
        const newTeam: Team = {
            id: `team-${Date.now()}`,
            name: data.name,
            projectIds: data.projectIds,
        };

        setTeams(prev => [...prev, newTeam]);
        
        const userIdsToUpdate = [
            ...(finalLeadId ? [finalLeadId] : []),
            ...(data.memberIds || [])
        ];

        userIdsToUpdate.forEach(userId => {
            const user = teamMembers.find(u => u.id === userId);
            if (user) {
                updateMember({ ...user, teamId: newTeam.id });
            }
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

        const currentTeamUsers = teamMembers.filter(u => u.teamId === teamId);
        const newTeamUserIds = new Set([
            ...(finalLeadId ? [finalLeadId] : []),
            ...(data.memberIds || [])
        ]);

        newTeamUserIds.forEach(userId => {
            const user = teamMembers.find(u => u.id === userId);
            // Add user to team if they aren't already in it
            if (user && user.teamId !== teamId) {
                updateMember({ ...user, teamId: teamId });
            }
        });

        currentTeamUsers.forEach(user => {
            // Remove user from team if they are no longer selected and are a manageable role
            if (!newTeamUserIds.has(user.id) && (user.role === 'Employee' || user.role === 'Team Lead')) {
                updateMember({ ...user, teamId: undefined });
            }
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
                        allUsers={teamMembers}
                        allProjects={projects}
                    />
                    {editingTeam && (
                        <EditTeamDialog
                            isOpen={!!editingTeam}
                            onOpenChange={(isOpen) => !isOpen && setEditingTeam(null)}
                            onSaveTeam={handleSaveTeam}
                            team={editingTeam}
                            allUsers={teamMembers}
                            allProjects={projects}
                        />
                    )}
                </>
            )}
        </>
    );
}
