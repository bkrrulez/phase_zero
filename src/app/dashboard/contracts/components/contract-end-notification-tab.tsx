
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';

export function ContractEndNotificationTab() {

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                     <div className="flex-1">
                        <CardTitle>Contract End Notifications</CardTitle>
                        <CardDescription>
                            Configure rules to automatically notify recipients about expiring contracts.
                        </CardDescription>
                    </div>
                    <div className="flex w-full md:w-auto gap-2">
                        <Button variant="outline">Send Now</Button>
                        <Button>
                            <PlusCircle className="h-4 w-4 mr-2" /> Add Notification
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-48 flex items-center justify-center text-muted-foreground">
                        Notification rules will be displayed here.
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
