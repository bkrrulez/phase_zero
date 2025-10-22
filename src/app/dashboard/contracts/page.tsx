
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { ContractsTable } from './components/contracts-table';
import { useLanguage } from '../contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContractEndNotificationTab } from './components/contract-end-notification-tab';

export default function ContractsPage() {
    const { currentUser } = useAuth();
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
            <div>
                <h1 className="text-3xl font-bold font-headline">{t('accessControl')}</h1>
                <p className="text-muted-foreground">{t('contractsSubtitle')}</p>
            </div>
            <Tabs defaultValue="all-contracts">
                <TabsList className="flex flex-col sm:flex-row h-auto sm:h-10 w-full sm:w-auto sm:inline-flex">
                    <TabsTrigger value="all-contracts" className="w-full sm:w-auto">{'Manage Access'}</TabsTrigger>
                    <TabsTrigger value="end-notifications" className="w-full sm:w-auto">{'Access End Notification'}</TabsTrigger>
                </TabsList>
                <TabsContent value="all-contracts" className="mt-4">
                    <ContractsTable />
                </TabsContent>
                <TabsContent value="end-notifications" className="mt-4">
                    <ContractEndNotificationTab />
                </TabsContent>
            </Tabs>
        </div>
    )
}
