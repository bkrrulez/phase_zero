
'use client';

import * as React from 'react';
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type User } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { useMembers } from "../contexts/MembersContext";
import { TeamMembers } from './components/team-members';
import { AddMemberDialog } from './components/add-member-dialog';
import { useAuth } from '../contexts/AuthContext';

export default function TeamPage() {
    const { toast } = useToast();
    const { teamMembers, addMember } = useMembers();
    const { currentUser } = useAuth();
    const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = React.useState(false);
    
    const canAddMember = currentUser.role === 'Super Admin' || currentUser.role === 'Team Lead';

    const handleAddMember = (newUser: User) => {
        addMember(newUser);
        setIsAddMemberDialogOpen(false);
        toast({
            title: "Member Added",
            description: `${newUser.name} has been added to the team.`,
        });
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Team</h1>
                        <p className="text-muted-foreground">Manage your team members and their details.</p>
                    </div>
                    {canAddMember && (
                        <Button onClick={() => setIsAddMemberDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Member
                        </Button>
                    )}
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
