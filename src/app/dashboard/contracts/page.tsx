
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { ContractsTable } from './components/contracts-table';
import { useLanguage } from '../contexts/LanguageContext';

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
            <ContractsTable />
        </div>
    )
}
