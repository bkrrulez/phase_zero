
'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PublicHolidaysTab } from "./components/public-holidays-tab";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomHolidaysTab } from "./components/custom-holidays-tab";
import { AnnualLeavesTab } from './components/annual-leaves-tab';
import { useAuth } from '../../contexts/AuthContext';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '../../contexts/SettingsContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function HolidaysSettingsPage() {
  const { currentUser } = useAuth();
  const { isHolidaysNavVisible, setIsHolidaysNavVisible } = useSettings();
  const { t } = useLanguage();

  if (currentUser.role !== 'Super Admin') {
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
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">{t('holidaysSettings')}</h1>
          <p className="text-muted-foreground">{t('holidaysSettingsDesc')}</p>
        </div>
        <div className="flex items-center space-x-2">
            <Switch 
                id="display-holidays" 
                checked={isHolidaysNavVisible}
                onCheckedChange={setIsHolidaysNavVisible}
            />
            <Label htmlFor="display-holidays">{t('displayHolidays')}</Label>
        </div>
      </div>
      <Tabs defaultValue="public-holidays">
        <TabsList className="grid grid-cols-3 md:w-[600px]">
          <TabsTrigger value="public-holidays">{t('publicHolidaysTab')}</TabsTrigger>
          <TabsTrigger value="custom-holidays">{t('customHolidaysTab')}</TabsTrigger>
          <TabsTrigger value="annual-leaves">{t('annualLeavesTab')}</TabsTrigger>
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
