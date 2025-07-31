
'use client';

import { useState } from "react";
import { format, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ChangePasswordDialog } from "../team/components/change-password-dialog";
import { useAuth } from "../contexts/AuthContext";
import { useMembers } from "../contexts/MembersContext";
import { ChangePhotoDialog } from "./components/change-photo-dialog";
import { useLanguage } from "../contexts/LanguageContext";
import { updateUserPasswordAndNotify, addContract as addContractAction, updateContract as updateContractAction, deleteContract as deleteContractAction } from "../actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { ContractDialog } from "../contracts/components/contract-dialog";
import { DeleteContractDialog } from "../contracts/components/delete-contract-dialog";
import { useContracts } from "../contexts/ContractsContext";
import { useSystemLog } from "../contexts/SystemLogContext";
import { type Contract } from "@/lib/types";


export default function ProfilePage() {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { teamMembers, updateMember, fetchMembers } = useMembers();
  const { t } = useLanguage();
  const { fetchContracts } = useContracts();
  const { logAction } = useSystemLog();

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // State for contract dialogs
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deletingContract, setDeletingContract] = useState<Contract | null>(null);

  const handlePasswordChange = async (password: string) => {
    if (!currentUser) return;
    setIsSavingPassword(true);
    try {
      await updateUserPasswordAndNotify({ email: currentUser.email, name: currentUser.name, password });
      toast({
        title: "Password Changed",
        description: `Your password has been changed and a notification email has been sent.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: "Error",
        description: "Could not send password change notification. Please check SMTP settings.",
      });
    } finally {
      setIsSavingPassword(false);
      setIsPasswordDialogOpen(false);
    }
  };
  
  const handlePhotoSave = (dataUrl: string) => {
    if (currentUser) {
      // Create a minimal update object for EditMemberFormValues
      const updatedData = {
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        reportsTo: currentUser.reportsTo,
        teamId: currentUser.teamId,
        associatedProjectIds: currentUser.associatedProjectIds,
        contracts: currentUser.contracts.map(c => ({...c, endDate: c.endDate || ''}))
      };
      const userToUpdate = {
        ...currentUser,
        avatar: dataUrl,
      };
      updateMember(userToUpdate, updatedData);
      toast({
        title: "Photo Updated",
        description: "Your profile photo has been successfully updated.",
      });
    }
  };

  const handleOpenAddContractDialog = () => {
    setEditingContract(null);
    setIsContractDialogOpen(true);
  };

  const handleOpenEditContractDialog = (contract: Contract) => {
     if (contract.endDate && new Date(contract.endDate) < startOfDay(new Date())) {
        toast({
            variant: "destructive",
            title: "Cannot Edit Expired Contract",
            description: "This contract has expired and cannot be modified.",
        });
        return;
    }
    setEditingContract(contract);
    setIsContractDialogOpen(true);
  }

  const handleSaveContract = async (data: Omit<Contract, 'id'>, contractId?: string) => {
      if (contractId) {
          await updateContractAction(contractId, data);
          toast({ title: "Contract Updated" });
          logAction(`User '${currentUser.name}' updated contract #${contractId} for '${currentUser.name}'.`);
      } else {
          await addContractAction(data);
          toast({ title: "Contract Added" });
          logAction(`User '${currentUser.name}' added a new contract for '${currentUser.name}'.`);
      }
      await fetchMembers(); // Refetches all members to get updated contract info
      setIsContractDialogOpen(false);
      setEditingContract(null);
  };

  const handleDeleteContract = async () => {
      if (!deletingContract) return;
      if (deletingContract.endDate && new Date(deletingContract.endDate) < startOfDay(new Date())) {
        toast({
            variant: "destructive",
            title: "Cannot Delete Expired Contract",
            description: "This contract has expired and cannot be deleted.",
        });
        setDeletingContract(null);
        return;
    }

      await deleteContractAction(deletingContract.id);
      toast({ title: "Contract Deleted", variant: "destructive" });
      logAction(`User '${currentUser.name}' deleted contract #${deletingContract.id} for '${currentUser.name}'.`);
      
      await fetchMembers();
      setDeletingContract(null);
  };


  if (!currentUser) {
    return null; // or a loading spinner
  }

  const sortedContracts = [...currentUser.contracts].sort((a,b) => {
    if (!a.endDate) return -1;
    if (!b.endDate) return 1;
    return new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
  });

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-headline">{t('profile')}</h1>
          <p className="text-muted-foreground">{t('profileSubtitle')}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t('personalInfo')}</CardTitle>
            <CardDescription>{t('personalInfoDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                      <AvatarImage src={currentUser.avatar} data-ai-hint="person avatar" />
                      <AvatarFallback>{currentUser.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <Button variant="outline" type="button" onClick={() => setIsPhotoDialogOpen(true)}>{t('changePhoto')}</Button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('fullName')}</Label>
                <Input id="name" defaultValue={currentUser.name} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('emailAddress')}</Label>
                <Input id="email" type="email" defaultValue={currentUser.email} disabled />
              </div>
               <div className="space-y-2">
                  <Label>{t('role')}</Label>
                  <Input defaultValue={currentUser.role} disabled />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('contractDetails')}</CardTitle>
              <CardDescription>{t('contractDetailsDesc')}</CardDescription>
            </div>
            {currentUser.role === 'Super Admin' && (
                <Button onClick={handleOpenAddContractDialog}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Add Contract
                </Button>
            )}
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('startDate')}</TableHead>
                        <TableHead>{t('endDate')}</TableHead>
                        <TableHead className="text-right">{t('weeklyHours')}</TableHead>
                         {currentUser.role === 'Super Admin' && <TableHead className="text-right">{t('actions')}</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedContracts.length > 0 ? sortedContracts.map((contract) => {
                         const isPast = contract.endDate ? new Date(contract.endDate) < startOfDay(new Date()) : false;
                         return (
                            <TableRow key={contract.id} className={cn(isPast && "text-muted-foreground bg-muted/50")}>
                                <TableCell>{format(new Date(contract.startDate), 'PP')}</TableCell>
                                <TableCell>{contract.endDate ? format(new Date(contract.endDate), 'PP') : 'Ongoing'}</TableCell>
                                <TableCell className="text-right">{contract.weeklyHours}h</TableCell>
                                {currentUser.role === 'Super Admin' && (
                                     <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleOpenEditContractDialog(contract as Contract)} disabled={isPast}>Edit</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setDeletingContract(contract as Contract)} className={cn(isPast ? "text-muted-foreground focus:text-muted-foreground" : "text-destructive focus:text-destructive")} disabled={isPast}>Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                )}
                            </TableRow>
                         )
                    }) : (
                        <TableRow>
                            <TableCell colSpan={currentUser.role === 'Super Admin' ? 4 : 3} className="text-center h-24">No contracts found.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('security')}</CardTitle>
            <CardDescription>{t('securityDesc')}</CardDescription>
          </CardHeader>
          <CardFooter className="border-t p-6">
            <Button type="button" onClick={() => setIsPasswordDialogOpen(true)}>{t('changePassword')}</Button>
          </CardFooter>
        </Card>
      </div>
      <ChangePasswordDialog
        user={currentUser}
        isOpen={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        onSave={handlePasswordChange}
        isSaving={isSavingPassword}
      />
      <ChangePhotoDialog
        isOpen={isPhotoDialogOpen}
        onOpenChange={setIsPhotoDialogOpen}
        onSave={handlePhotoSave}
      />
      <ContractDialog
        isOpen={isContractDialogOpen}
        onOpenChange={setIsContractDialogOpen}
        onSave={handleSaveContract}
        contract={editingContract}
        users={[currentUser]}
        userId={currentUser.id}
      />
      <DeleteContractDialog
        isOpen={!!deletingContract}
        onOpenChange={() => setDeletingContract(null)}
        onConfirm={handleDeleteContract}
        contract={deletingContract}
      />
    </>
  )
}
