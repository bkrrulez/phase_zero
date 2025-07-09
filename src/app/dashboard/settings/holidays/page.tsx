
'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PublicHolidaysTab } from "./components/public-holidays-tab";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomHolidaysTab } from "./components/custom-holidays-tab";
import { AnnualLeavesTab } from './components/annual-leaves-tab';
import { useAuth } from '../../contexts/AuthContext';

export default function HolidaysSettingsPage() {
  const { currentUser } = useAuth();

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
        <TabsList className="grid grid-cols-3 md:w-[600px]">
          <TabsTrigger value="public-holidays">Public Holidays</TabsTrigger>
          <TabsTrigger value="custom-holidays">Custom Holidays</TabsTrigger>
          <TabsTrigger value="annual-leaves">Annual Leaves</TabsTrigger>
        </TabsList>
        <TabsContent value="public-holidays" className="mt-4">
          <PublicHolidaysTab />
        </TabsContent>
        <TabsContent value="custom-holidays" className="mt-4">
            <CustomHolidaysTab />
        </TabsContent>
        <TabsContent value="annual-leaves" className="mt-4">
          <AnnualLeavesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
