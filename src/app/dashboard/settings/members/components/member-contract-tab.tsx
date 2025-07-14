
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


export function MemberContractTab() {
  const { teamMembers, updateMember } = useMembers();
  const { logAction } = useSystemLog();
  const { currentUser } = useAuth();
  const { toast } = useToast();

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
          title: 'Invalid File Type',
          description: 'Please upload a PDF file.',
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
        title: 'Missing Information',
        description: 'Please select a member and a PDF file.',
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
          title: 'Upload Successful',
          description: `Contract for ${member?.name} has been uploaded.`,
        });
        await logAction(`User '${currentUser.name}' uploaded a contract for '${member?.name}'.`);
        
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
        title: 'Upload Failed',
        description: 'An error occurred while uploading the contract.',
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
            title: 'Contract Deleted',
            description: `Contract for ${deletingContractForUser.name} has been removed.`,
            variant: 'destructive'
        });
        await logAction(`User '${currentUser.name}' deleted the contract for '${deletingContractForUser.name}'.`);
      } catch (error) {
           toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to delete the contract.',
            });
      } finally {
        setDeletingContractForUser(null);
      }
  }


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Contract</CardTitle>
          <CardDescription>
            Select a member and upload their contract in PDF format. This will overwrite any existing contract.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-end gap-4">
          <div className="grid w-full sm:w-auto sm:flex-1 gap-1.5">
            <label>Select Member</label>
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
                        : "Select member..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                    <Command>
                    <CommandInput placeholder="Search member..." />
                    <CommandList>
                        <CommandEmpty>No member found.</CommandEmpty>
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
            <label>Contract File (PDF)</label>
            <Input type="file" accept="application/pdf" onChange={handleFileChange} ref={fileInputRef} />
          </div>
          <Button onClick={handleUpload} disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Upload Contract'}
          </Button>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle>Uploaded Contracts</CardTitle>
              <CardDescription>A list of all members with an uploaded contract file.</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {membersWithContracts.map(member => (
                          <TableRow key={member.id}>
                            <TableCell>{member.name}</TableCell>
                            <TableCell>{member.email}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="destructive" size="sm" onClick={() => setDeletingContractForUser(member)}>
                                    <Trash2 className="mr-2 h-4 w-4"/> Delete
                                </Button>
                            </TableCell>
                          </TableRow>
                      ))}
                      {membersWithContracts.length === 0 && (
                          <TableRow>
                              <TableCell colSpan={3} className="h-24 text-center">No contracts have been uploaded yet.</TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>

      <AlertDialog open={!!deletingContractForUser} onOpenChange={(open) => !open && setDeletingContractForUser(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This will permanently delete the contract for "{deletingContractForUser?.name}". This action cannot be undone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
