
'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '../contexts/AuthContext';
import { MyRoster } from './components/my-roster';
import { TeamRoster } from './components/team-roster';

export default function RosterPage() {
    const { currentUser } = useAuth();
    const canViewTeamRoster = currentUser.role === 'Team Lead' || currentUser.role === 'Super Admin';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">Roster</h1>
                <p className="text-muted-foreground">View and manage your team's work schedule and absences.</p>
            </div>
            <Tabs defaultValue="my-roster" className="space-y-4">
                <TabsList className={`grid w-full ${canViewTeamRoster ? 'grid-cols-2 md:w-[400px]' : 'grid-cols-1 w-[200px]'}`}>
                    <TabsTrigger value="my-roster">My Roster</TabsTrigger>
                    {canViewTeamRoster && <TabsTrigger value="team-roster">Team Roster</TabsTrigger>}
                </TabsList>
                <TabsContent value="my-roster">
                    <MyRoster />
                </TabsContent>
                {canViewTeamRoster && (
                    <TabsContent value="team-roster">
                        <TeamRoster />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
