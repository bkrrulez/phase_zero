
'use client';

import * as React from 'react';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type User, type Team } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { AddTeamDialog, type TeamFormValues } from './components/add-team-dialog';
import { EditTeamDialog } from './components/edit-team-dialog';
import { DeleteTeamDialog } from './components/delete-team-dialog';
import { useMembers } from '../../contexts/MembersContext';
import { useTeams } from '../../contexts/TeamsContext';
import { useProjects } from '../../contexts/ProjectsContext';
import { useSystemLog } from '../../contexts/SystemLogContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function TeamsSettingsPage() {
    const { toast } = useToast();
    const { teamMembers } = useMembers();
    const { teams, addTeam, updateTeam, deleteTeam } = useTeams();
    const { projects } = useProjects();
    const { logAction } = useSystemLog();
    const { currentUser } = useAuth();
    const { t } = useLanguage();
    
    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
    const [editingTeam, setEditingTeam] = React.useState<Team | null>(null);
    const [deletingTeam, setDeletingTeam] = React.useState<Team | null>(null);

    const canManageTeams = currentUser.role === 'Super Admin';

    const teamDetails = React.useMemo(() => {
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
        addTeam(data);
        setIsAddDialogOpen(false);
        toast({
            title: t('teamAdded'),
            description: t('teamAddedDesc', { name: data.name }),
        });
        logAction(`User '${currentUser.name}' created a new team: '${data.name}'.`);
    };

    const handleSaveTeam = (teamId: string, data: TeamFormValues) => {
        updateTeam(teamId, data);
        setEditingTeam(null);
        toast({
            title: t('teamUpdated'),
            description: t('teamUpdatedDesc', { name: data.name }),
        });
        logAction(`User '${currentUser.name}' updated team: '${data.name}'.`);
    }

    const handleDeleteTeam = () => {
        if (!deletingTeam) return;
        deleteTeam(deletingTeam.id);
        toast({
            title: t('teamDeleted'),
            description: t('teamDeletedDesc', { name: deletingTeam.name }),
            variant: "destructive"
        });
        logAction(`User '${currentUser.name}' deleted team: '${deletingTeam.name}'.`);
        setDeletingTeam(null);
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">{t('teams')}</h1>
                        <p className="text-muted-foreground">{t('teamsSubtitle')}</p>
                    </div>
                    {canManageTeams && (
                        <Button onClick={() => setIsAddDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> {t('addTeam')}
                        </Button>
                    )}
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('allTeams')}</CardTitle>
                        <CardDescription>{t('allTeamsDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('team')}</TableHead>
                                    <TableHead>{t('teamLead')}</TableHead>
                                    <TableHead>{t('teamMembersTitle')}</TableHead>
                                    <TableHead>{t('projects')}</TableHead>
                                    {canManageTeams && <TableHead><span className="sr-only">{t('actions')}</span></TableHead>}
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
                                                            <span className="sr-only">{t('toggleMenu')}</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => setEditingTeam(team)}>
                                                            {t('edit')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            onClick={() => setDeletingTeam(team)}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            {t('delete')}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                                {teamDetails.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">{t('noTeamsCreated')}</TableCell>
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
                        allProjects={projects}
                    />
                    {editingTeam && (
                        <EditTeamDialog
                            isOpen={!!editingTeam}
                            onOpenChange={(isOpen) => !isOpen && setEditingTeam(null)}
                            onSaveTeam={handleSaveTeam}
                            team={editingTeam}
                            allProjects={projects}
                        />
                    )}
                    <DeleteTeamDialog 
                        isOpen={!!deletingTeam}
                        onOpenChange={(isOpen) => !isOpen && setDeletingTeam(null)}
                        onConfirm={handleDeleteTeam}
                        team={deletingTeam}
                    />
                </>
            )}
        </>
    );
}
