
'use client';

import * as React from 'react';
import { PlusCircle, FileUp } from "lucide-react";
import * as XLSX from 'xlsx-js-style';
import { format, min as minDate, max as maxDate, isWithinInterval } from "date-fns";
import { Button } from "@/components/ui/button";
import { type User } from "@/lib/types";
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

    const handleAddMember = (newUser: Omit<User, 'id'|'avatar'|'contract' > & { contracts: Omit<User['contracts'][0], 'id'>[] }) => {
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

    const handleExport = (membersToExport: User[]) => {
        if (membersToExport.length === 0) return;
    
        const dataForExport = membersToExport.map(member => {
            const contractDetails = getAggregatedContractDetails(member);
            return {
                [t('member')]: member.name,
                [t('email')]: member.email,
                [t('role')]: member.role,
                [t('team')]: getTeamName(member.teamId),
                [t('weeklyHours')]: contractDetails.weeklyHours,
                [t('contractStart')]: format(new Date(contractDetails.startDate), 'yyyy-MM-dd'),
                [t('contractEnd')]: contractDetails.endDate ? format(new Date(contractDetails.endDate), 'yyyy-MM-dd') : 'Ongoing'
            }
        });
    
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
                     <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button variant="outline" onClick={() => handleExport(teamMembers)} className="w-full sm:w-auto">
                            <FileUp className="mr-2 h-4 w-4" /> {t('export')}
                        </Button>
                        {canAddMember && (
                            <Button onClick={() => setIsAddMemberDialogOpen(true)} className="w-full sm:w-auto">
                                <PlusCircle className="mr-2 h-4 w-4" /> {t('addMember')}
                            </Button>
                        )}
                    </div>
                </div>
                <TeamMembers 
                  onAddMemberClick={() => setIsAddMemberDialogOpen(true)}
                  onExportClick={handleExport}
                />
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
