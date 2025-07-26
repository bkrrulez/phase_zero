
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
                <h1 className="text-3xl font-bold font-headline">{t('contracts')}</h1>
                <p className="text-muted-foreground">{t('contractsSubtitle')}</p>
            </div>
            <Tabs defaultValue="all-contracts">
                <TabsList className="grid w-full max-w-md grid-cols-1 sm:grid-cols-2 gap-y-2 sm:gap-y-0">
                    <TabsTrigger value="all-contracts">{t('allContracts')}</TabsTrigger>
                    <TabsTrigger value="end-notifications">{t('contractEndNotifications')}</TabsTrigger>
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


