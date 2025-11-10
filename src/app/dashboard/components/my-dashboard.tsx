
'use client';

import * as React from 'react';
import { Users, BarChartHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMembers } from '../contexts/MembersContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '@/lib/utils';
import { useLanguage } from '../contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';

export function MyDashboard() {
  const { t } = useLanguage();
  const { teamMembers } = useMembers();
  const { currentUser } = useAuth();
  const { isHolidaysNavVisible, isLoading: isSettingsLoading } = useSettings();

  const myTeam = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Super Admin') {
      return teamMembers.filter(m => m.id !== currentUser.id);
    }
    if (currentUser.role === 'Team Lead') {
      return teamMembers.filter(m => m.reportsTo === currentUser.id);
    }
    return [];
  }, [currentUser, teamMembers]);


  if (!currentUser) return null; // Should not happen if AuthProvider works correctly

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">{t('welcome', { name: currentUser.name })}</h1>
            <p className="text-muted-foreground">{t('welcomeSubtitle')}</p>
          </div>
        </div>

        <div className={cn("grid gap-4 md:grid-cols-2", isHolidaysNavVisible ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('teamMembersTitle')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myTeam.length}</div>
              <p className="text-xs text-muted-foreground">
                {currentUser.role === 'User' ? 'Your team' : 'Members in your team'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('role')}</CardTitle>
              <BarChartHorizontal className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentUser.role}
              </div>
              <p className="text-xs text-muted-foreground">
                Your current role in the system
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
