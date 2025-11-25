
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminPanel } from '../../contexts/AdminPanelContext';
import { useLanguage } from '../../contexts/LanguageContext';

function AdminPanelContent() {
  const { showRowCount, setShowRowCount, isLoading } = useAdminPanel();
  const { t } = useLanguage();

  const handleRowCountToggle = (isChecked: boolean) => {
    setShowRowCount(isChecked);
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('globalUISettings')}</CardTitle>
        <CardDescription>
          {t('globalUISettingsDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
          <Label htmlFor="row-count-toggle" className="flex flex-col space-y-1">
            <span>{t('rowCountInAnalysis')}</span>
            <span className="font-normal leading-snug text-muted-foreground">
             {t('rowCountInAnalysisDesc')}
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
  const { t } = useLanguage();

  if (currentUser?.role !== 'Super Admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('accessDenied')}</CardTitle>
          <CardDescription>{t('noPermissionPage')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{t('contactAdmin')}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">{t('adminPanel')}</h1>
        <p className="text-muted-foreground">
          {t('adminPanelSubtitle')}
        </p>
      </div>
      <AdminPanelContent />
    </div>
  );
}

    