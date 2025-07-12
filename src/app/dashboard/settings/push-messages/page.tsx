
'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { MoreHorizontal, PlusCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type PushMessage } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { usePushMessages } from '../../contexts/PushMessagesContext';
import { useTeams } from '../../contexts/TeamsContext';
import { AddEditPushMessageDialog, type PushMessageFormValues } from './components/add-edit-push-message-dialog';
import { DeletePushMessageDialog } from './components/delete-push-message-dialog';
import { useSystemLog } from '../../contexts/SystemLogContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const getStatus = (startDate: string, endDate: string) => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) return 'Scheduled';
  if (now > end) return 'Expired';
  return 'Active';
};

const getStatusVariant = (status: 'Active' | 'Scheduled' | 'Expired'): 'default' | 'secondary' | 'destructive' => {
  switch (status) {
    case 'Active':
      return 'default';
    case 'Scheduled':
      return 'secondary';
    case 'Expired':
      return 'destructive';
  }
};

export default function PushMessagesSettingsPage() {
  const { toast } = useToast();
  const { pushMessages, addMessage, updateMessage, deleteMessage } = usePushMessages();
  const { teams } = useTeams();
  const { logAction } = useSystemLog();
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingMessage, setEditingMessage] = React.useState<PushMessage | null>(null);
  const [deletingMessage, setDeletingMessage] = React.useState<PushMessage | null>(null);

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
    );
  }

  const handleOpenAddDialog = () => {
    setEditingMessage(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (message: PushMessage) => {
    setEditingMessage(message);
    setIsDialogOpen(true);
  };
  
  const handleSaveMessage = (data: PushMessageFormValues) => {
    const messageData = {
      ...data,
      startDate: new Date(data.startDateTime).toISOString(),
      endDate: new Date(data.endDateTime).toISOString(),
    }
    
    if (editingMessage) {
      updateMessage(editingMessage.id, messageData);
      toast({ title: t('messageUpdated') });
      logAction(`User '${currentUser.name}' updated push message: "${data.context}".`);
    } else {
      addMessage(messageData);
      toast({ title: t('messageAdded') });
      logAction(`User '${currentUser.name}' added new push message: "${data.context}".`);
    }
    
    setIsDialogOpen(false);
    setEditingMessage(null);
  };

  const handleDeleteMessage = (messageId: string) => {
    const message = pushMessages.find(m => m.id === messageId);
    deleteMessage(messageId);
    setDeletingMessage(null);
    toast({ title: t('messageDeleted'), variant: 'destructive' });
    if(message) {
      logAction(`User '${currentUser.name}' deleted push message: "${message.context}".`);
    }
  };
  
  const getReceiversText = (receivers: 'all-members' | 'all-teams' | string[]) => {
      if (receivers === 'all-members') return t('allMembers');
      if (receivers === 'all-teams') return t('allTeams');
      if (Array.isArray(receivers)) {
          return receivers.map(teamId => teams.find(t => t.id === teamId)?.name || teamId).join(', ');
      }
      return 'N/A';
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">{t('pushMessages')}</h1>
            <p className="text-muted-foreground">{t('pushMessagesSubtitle')}</p>
          </div>
          <Button onClick={handleOpenAddDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> {t('addMessage')}
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t('allMessages')}</CardTitle>
            <CardDescription>{t('allMessagesDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('context')}</TableHead>
                  <TableHead>{t('message')}</TableHead>
                  <TableHead>{t('starts')}</TableHead>
                  <TableHead>{t('ends')}</TableHead>
                  <TableHead>{t('receivers')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pushMessages.length > 0 ? (
                  pushMessages.map((msg) => {
                    const status = getStatus(msg.startDate, msg.endDate);
                    return (
                      <TableRow key={msg.id}>
                        <TableCell className="font-medium max-w-32 truncate">{msg.context}</TableCell>
                        <TableCell className="max-w-xs truncate">{msg.messageBody}</TableCell>
                        <TableCell>{format(new Date(msg.startDate), 'PPpp')}</TableCell>
                        <TableCell>{format(new Date(msg.endDate), 'PPpp')}</TableCell>
                        <TableCell className="max-w-32 truncate">{getReceiversText(msg.receivers)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(status)} className={status === 'Active' ? 'bg-green-600' : ''}>{t(status.toLowerCase())}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenEditDialog(msg)}>{t('edit')}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeletingMessage(msg)} className="text-destructive focus:text-destructive">
                                {t('delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {t('noMessagesCreated')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AddEditPushMessageDialog
        isOpen={isDialogOpen}
        onOpenChange={(isOpen) => {
            if (!isOpen) {
                setIsDialogOpen(false);
                setEditingMessage(null);
            }
        }}
        onSave={handleSaveMessage}
        message={editingMessage}
      />
      
      <DeletePushMessageDialog
        isOpen={!!deletingMessage}
        onOpenChange={(isOpen) => !isOpen && setDeletingMessage(null)}
        onDelete={() => handleDeleteMessage(deletingMessage!.id)}
        message={deletingMessage}
      />
    </>
  );
}
