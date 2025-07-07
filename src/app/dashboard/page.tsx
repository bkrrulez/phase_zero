
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyDashboard } from "./components/my-dashboard";
import { TeamDashboard } from "./components/team-dashboard";
import { useAuth } from "./contexts/AuthContext";


export default function DashboardPage() {
    const { currentUser } = useAuth();
    const canViewTeamDashboard = currentUser.role === 'Team Lead' || currentUser.role === 'Super Admin';

    return (
        <Tabs defaultValue="my-dashboard" className="space-y-4">
            <TabsList className={`grid w-full ${canViewTeamDashboard ? 'grid-cols-2 md:w-[400px]' : 'grid-cols-1 w-[200px]'}`}>
                <TabsTrigger value="my-dashboard">My Dashboard</TabsTrigger>
                {canViewTeamDashboard && (
                    <TabsTrigger value="team-dashboard">Team Dashboard</TabsTrigger>
                )}
            </TabsList>
            <TabsContent value="my-dashboard">
                <MyDashboard />
            </TabsContent>
            {canViewTeamDashboard && (
                 <TabsContent value="team-dashboard">
                    <TeamDashboard />
                 </TabsContent>
            )}
        </Tabs>
    )
}
