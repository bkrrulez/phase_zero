
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

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingMessage, setEditingMessage] = React.useState<PushMessage | null>(null);
  const [deletingMessage, setDeletingMessage] = React.useState<PushMessage | null>(null);

  if (currentUser.role !== 'Super Admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>You do not have permission to view this page.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Please contact your administrator if you believe this is an error.</p>
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
      toast({ title: 'Message Updated' });
      logAction(`User '${currentUser.name}' updated push message: "${data.context}".`);
    } else {
      addMessage(messageData);
      toast({ title: 'Message Added' });
      logAction(`User '${currentUser.name}' added new push message: "${data.context}".`);
    }
    
    setIsDialogOpen(false);
    setEditingMessage(null);
  };

  const handleDeleteMessage = (messageId: string) => {
    const message = pushMessages.find(m => m.id === messageId);
    deleteMessage(messageId);
    setDeletingMessage(null);
    toast({ title: 'Message Deleted', variant: 'destructive' });
    if(message) {
      logAction(`User '${currentUser.name}' deleted push message: "${message.context}".`);
    }
  };
  
  const getReceiversText = (receivers: 'all-members' | 'all-teams' | string[]) => {
      if (receivers === 'all-members') return 'All Members';
      if (receivers === 'all-teams') return 'All Teams';
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
            <h1 className="text-3xl font-bold font-headline">Push Messages</h1>
            <p className="text-muted-foreground">Manage notifications for your users.</p>
          </div>
          <Button onClick={handleOpenAddDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Message
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All Messages</CardTitle>
            <CardDescription>A list of all scheduled, active, and expired messages.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Context</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Starts</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead>Receivers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                          <Badge variant={getStatusVariant(status)} className={status === 'Active' ? 'bg-green-600' : ''}>{status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenEditDialog(msg)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeletingMessage(msg)} className="text-destructive focus:text-destructive">
                                Delete
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
                      No messages have been created yet.
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
