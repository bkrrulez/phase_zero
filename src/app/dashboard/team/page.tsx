
'use client';

import * as React from 'react';
import { PlusCircle, FileUp } from "lucide-react";
import * as XLSX from 'xlsx-js-style';
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { type User } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { useMembers } from "../contexts/MembersContext";
import { TeamMembers } from './components/team-members';
import { AddMemberDialog } from './components/add-member-dialog';
import { useAuth } from '../contexts/AuthContext';
import { useSystemLog } from '../contexts/SystemLogContext';
import { useTeams } from '../contexts/TeamsContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function TeamPage() {
    const { toast } = useToast();
    const { teamMembers, addMember } = useMembers();
    const { currentUser } = useAuth();
    const { logAction } = useSystemLog();
    const { teams } = useTeams();
    const { t } = useLanguage();
    const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = React.useState(false);
    
    const canAddMember = currentUser.role === 'Super Admin' || currentUser.role === 'Team Lead';

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

    const handleAddMember = (newUser: User) => {
        addMember(newUser);
        setIsAddMemberDialogOpen(false);
        toast({
            title: t('memberAdded'),
            description: t('memberAddedDesc', { name: newUser.name }),
        });
        logAction(`User '${currentUser.name}' added a new member: '${newUser.name}'.`);
    };

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
        XLSX.utils.book_append_sheet(workbook, worksheet, "Team Members");
    
        XLSX.writeFile(workbook, `team_members_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">{t('team')}</h1>
                        <p className="text-muted-foreground">{t('teamPageSubtitle')}</p>
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
                <TeamMembers />
            </div>
            
            <AddMemberDialog
                isOpen={isAddMemberDialogOpen}
                onOpenChange={setIsAddMemberDialogOpen}
                onAddMember={handleAddMember}
                teamMembers={teamMembers}
            />
        </>
    );
}
