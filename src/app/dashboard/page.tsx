
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyDashboard } from "./components/my-dashboard";

export default function DashboardPage() {
    return (
        <Tabs defaultValue="my-dashboard" className="space-y-4">
            <TabsList className="grid w-full grid-cols-1 md:w-[200px]">
                <TabsTrigger value="my-dashboard">My Dashboard</TabsTrigger>
            </TabsList>
            <TabsContent value="my-dashboard">
                <MyDashboard />
            </TabsContent>
        </Tabs>
    )
}
