
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { currentUser } from "@/lib/mock-data";
import { PublicHolidaysTab } from "./components/public-holidays-tab";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomHolidaysTab } from "./components/custom-holidays-tab";

export default function HolidaysSettingsPage() {
  if (currentUser.role !== 'Super Admin') {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>You do not have permission to view this page.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Please contact your administrator if you believe this is an error.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Holidays Settings</h1>
        <p className="text-muted-foreground">Manage public and custom holidays for your organization.</p>
      </div>
      <Tabs defaultValue="public-holidays">
        <TabsList className="grid grid-cols-2 md:w-[400px]">
          <TabsTrigger value="public-holidays">Public Holidays</TabsTrigger>
          <TabsTrigger value="custom-holidays">Custom Holidays</TabsTrigger>
        </TabsList>
        <TabsContent value="public-holidays" className="mt-4">
          <PublicHolidaysTab />
        </TabsContent>
        <TabsContent value="custom-holidays" className="mt-4">
            <CustomHolidaysTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
