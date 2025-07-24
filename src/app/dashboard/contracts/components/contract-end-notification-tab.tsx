
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
import { useContracts } from '../../contexts/ContractsContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTeams } from '../../contexts/TeamsContext';
import { AddEditContractEndNotificationDialog } from './add-edit-contract-end-notification-dialog';
import { type ContractEndNotification } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useMembers } from '../../contexts/MembersContext';
import { sendContractEndNotificationsNow } from '../../actions';

export function ContractEndNotificationTab() {
    const { contractEndNotifications, addContractEndNotification, deleteContractEndNotification } = useContracts();
    const { teamMembers } = useMembers();
    const { teams } = useTeams();
    const { t } = useLanguage();
    const { toast } = useToast();

    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
    const [editingNotification, setEditingNotification] = React.useState<ContractEndNotification | null>(null);
    const [deletingNotification, setDeletingNotification] = React.useState<ContractEndNotification | null>(null);
    const [isSending, setIsSending] = React.useState(false);

    const handleSaveNotification = (data: Omit<ContractEndNotification, 'id'>) => {
        if (editingNotification) {
            // Update logic will go here
        } else {
            addContractEndNotification(data);
        }
        setIsAddEditDialogOpen(false);
        setEditingNotification(null);
    }

    const handleDelete = () => {
        if (!deletingNotification) return;
        deleteContractEndNotification(deletingNotification.id);
        setDeletingNotification(null);
        toast({
            title: "Notification Rule Deleted",
            description: "The notification rule has been successfully deleted.",
            variant: "destructive"
        });
    }

    const handleSendNow = async () => {
        setIsSending(true);
        try {
            const count = await sendContractEndNotificationsNow();
            toast({
                title: "Notifications Sent",
                description: `Notifications were triggered for ${count} users.`
            });
        } catch (error) {
            console.error("Failed to send notifications now", error);
            toast({
                title: "Error",
                description: "Could not process notifications.",
                variant: "destructive"
            });
        } finally {
            setIsSending(false);
        }
    };

    const getTeamNames = (teamIds: string[]) => {
        if (teamIds.includes('all-teams')) return t('allTeams');
        return teamIds.map(id => teams.find(t => t.id === id)?.name || id).join(', ');
    }
    
    const getUserNames = (userIds: string[]) => {
        return userIds.map(id => teamMembers.find(m => m.id === id)?.name || id).join(', ');
    }

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
                        <Button onClick={handleSendNow} disabled={isSending}>
                            {isSending ? "Sending..." : "Send Now"}
                        </Button>
                        <Button onClick={() => {
                            setEditingNotification(null);
                            setIsAddEditDialogOpen(true);
                        }}>
                            <PlusCircle className="h-4 w-4 mr-2" /> Add Notification
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Teams</TableHead>
                                <TableHead>Recipient Users</TableHead>
                                <TableHead>Recipient Emails</TableHead>
                                <TableHead>Threshold Days</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contractEndNotifications.map(notification => (
                                <TableRow key={notification.id}>
                                    <TableCell className="max-w-[200px] truncate">{getTeamNames(notification.teamIds)}</TableCell>
                                    <TableCell className="max-w-[200px] truncate">{getUserNames(notification.recipientUserIds)}</TableCell>
                                    <TableCell className="max-w-[200px] truncate">{notification.recipientEmails.join(', ')}</TableCell>
                                    <TableCell>{notification.thresholdDays.join(', ')}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => setDeletingNotification(notification)}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {contractEndNotifications.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No notification rules have been created yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AddEditContractEndNotificationDialog
                isOpen={isAddEditDialogOpen}
                onOpenChange={setIsAddEditDialogOpen}
                onSave={handleSaveNotification}
                notification={editingNotification}
            />

            <AlertDialog open={!!deletingNotification} onOpenChange={(isOpen) => !isOpen && setDeletingNotification(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this notification rule. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">{t('delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
