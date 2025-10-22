
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useMembers } from '@/app/dashboard/contexts/MembersContext';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { deleteUserContract, uploadUserContract } from '@/app/dashboard/actions';
import { useSystemLog } from '@/app/dashboard/contexts/SystemLogContext';
import { useAuth } from '@/app/dashboard/contexts/AuthContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { type User } from '@/lib/types';
import { useLanguage } from '@/app/dashboard/contexts/LanguageContext';


export function MemberContractTab() {
  const { teamMembers, updateMember } = useMembers();
  const { logAction } = useSystemLog();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [openCombobox, setOpenCombobox] = React.useState(false);
  const [selectedMemberId, setSelectedMemberId] = React.useState('');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [deletingContractForUser, setDeletingContractForUser] = React.useState<User | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const membersWithContracts = teamMembers.filter(m => m.contractPdf);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        toast({
          variant: 'destructive',
          title: t('invalidFileType'),
          description: t('pleaseUploadPdf'),
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedMemberId || !selectedFile) {
      toast({
        variant: 'destructive',
        title: t('missingInformation'),
        description: t('selectMemberAndPdf'),
      });
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        const dataUri = reader.result as string;
        await uploadUserContract(selectedMemberId, dataUri);
        
        const member = teamMembers.find(m => m.id === selectedMemberId);
        if (member) {
          updateMember({ ...member, contractPdf: dataUri });
        }

        toast({
          title: t('uploadSuccessful'),
          description: `Access document uploaded for ${member?.name}.`,
        });
        await logAction(`User '${currentUser.name}' uploaded an access document for '${member?.name}'.`);
        
        // Reset form
        setSelectedMemberId('');
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        setIsUploading(false);
      };
      reader.onerror = () => {
        throw new Error('Could not read the file.');
      };
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: t('uploadFailed'),
        description: "An error occurred while uploading the document.",
      });
      setIsUploading(false);
    }
  };
  
  const handleDelete = async () => {
      if (!deletingContractForUser) return;

      try {
        await deleteUserContract(deletingContractForUser.id);
        updateMember({ ...deletingContractForUser, contractPdf: null });
        toast({
            title: "Access Document Deleted",
            description: `The access document for ${deletingContractForUser.name} has been removed.`,
            variant: 'destructive'
        });
        await logAction(`User '${currentUser.name}' deleted the access document for '${deletingContractForUser.name}'.`);
      } catch (error) {
           toast({
                variant: 'destructive',
                title: t('error'),
                description: "Failed to delete the access document.",
            });
      } finally {
        setDeletingContractForUser(null);
      }
  }


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Access Document</CardTitle>
          <CardDescription>
            Select a member and upload their access document in PDF format. This will overwrite any existing document.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-end gap-4">
          <div className="grid w-full sm:w-auto sm:flex-1 gap-1.5">
            <label>{t('selectMemberLabel')}</label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                    <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between"
                    >
                    {selectedMemberId
                        ? teamMembers.find((member) => member.id === selectedMemberId)?.name
                        : t('selectMemberPlaceholder')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                    <Command>
                    <CommandInput placeholder={t('searchMemberPlaceholder')} />
                    <CommandList>
                        <CommandEmpty>{t('noMemberFound')}</CommandEmpty>
                        <CommandGroup>
                        {teamMembers.map((member) => (
                            <CommandItem
                            key={member.id}
                            value={member.name}
                            onSelect={() => {
                                setSelectedMemberId(member.id);
                                setOpenCombobox(false);
                            }}
                            >
                            <Check
                                className={cn(
                                "mr-2 h-4 w-4",
                                selectedMemberId === member.id ? "opacity-100" : "opacity-0"
                                )}
                            />
                            {member.name}
                            </CommandItem>
                        ))}
                        </CommandGroup>
                    </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
          </div>
          <div className="grid w-full sm:w-auto sm:flex-1 gap-1.5">
            <label>Access Document (PDF)</label>
            <Input type="file" accept="application/pdf" onChange={handleFileChange} ref={fileInputRef} />
          </div>
          <Button onClick={handleUpload} disabled={isUploading}>
            {isUploading ? t('uploading') : 'Upload Document'}
          </Button>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle>Uploaded Access Documents</CardTitle>
              <CardDescription>A list of all members with an uploaded access document.</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>{t('member')}</TableHead>
                          <TableHead>{t('email')}</TableHead>
                          <TableHead className="text-right">{t('actions')}</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {membersWithContracts.map(member => (
                          <TableRow key={member.id}>
                            <TableCell>{member.name}</TableCell>
                            <TableCell>{member.email}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="destructive" size="sm" onClick={() => setDeletingContractForUser(member)}>
                                    <Trash2 className="mr-2 h-4 w-4"/> {t('delete')}
                                </Button>
                            </TableCell>
                          </TableRow>
                      ))}
                      {membersWithContracts.length === 0 && (
                          <TableRow>
                              <TableCell colSpan={3} className="h-24 text-center">No access documents have been uploaded yet.</TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>

      <AlertDialog open={!!deletingContractForUser} onOpenChange={(open) => !open && setDeletingContractForUser(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
                  <AlertDialogDescription>
                      This will permanently delete the access document for "{deletingContractForUser?.name}". This action cannot be undone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">{t('delete')}</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
