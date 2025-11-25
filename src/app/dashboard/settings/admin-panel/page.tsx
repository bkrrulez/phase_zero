
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminPanel } from '../../contexts/AdminPanelContext';

function AdminPanelContent() {
  const { showRowCount, setShowRowCount, isLoading } = useAdminPanel();

  const handleRowCountToggle = (isChecked: boolean) => {
    setShowRowCount(isChecked);
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global UI Settings</CardTitle>
        <CardDescription>
          These settings affect the user interface for all users of the application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
          <Label htmlFor="row-count-toggle" className="flex flex-col space-y-1">
            <span>Row count in Parameter Analysis page</span>
            <span className="font-normal leading-snug text-muted-foreground">
              Display the total number of rows for each section in the parameter analysis view.
            </span>
          </Label>
          <Switch
            id="row-count-toggle"
            checked={showRowCount}
            onCheckedChange={handleRowCountToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}


export default function AdminPanelPage() {
  const { currentUser } = useAuth();

  if (currentUser?.role !== 'Super Admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>You do not have permission to view this page.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Please contact an administrator if you believe this is an error.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage global application settings and features.
        </p>
      </div>
      <AdminPanelContent />
    </div>
  );
}

    