
'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { sendPasswordChangeEmail } from "@/lib/mail";
import { ChangePasswordDialog } from "../team/components/change-password-dialog";
import { useAuth } from "../contexts/AuthContext";
import { useMembers } from "../contexts/MembersContext";
import { ChangePhotoDialog } from "./components/change-photo-dialog";
import { useLanguage } from "../contexts/LanguageContext";

export default function ProfilePage() {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { updateMember } = useMembers();
  const { t } = useLanguage();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handlePasswordChange = async (password: string) => {
    if (!currentUser) return;
    setIsSavingPassword(true);
    try {
      await sendPasswordChangeEmail({ to: currentUser.email, name: currentUser.name });
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
      updateMember({ ...currentUser, avatar: dataUrl });
      toast({
        title: "Photo Updated",
        description: "Your profile photo has been successfully updated.",
      });
    }
  };

  if (!currentUser) {
    return null; // or a loading spinner
  }

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
                <Input id="name" defaultValue={currentUser.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('emailAddress')}</Label>
                <Input id="email" type="email" defaultValue={currentUser.email} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('contractDetails')}</CardTitle>
            <CardDescription>{t('contractDetailsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label>{t('role')}</Label>
                  <Input defaultValue={currentUser.role} disabled />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="weekly-hours">{t('weeklyHours')}</Label>
                  <Input id="weekly-hours" type="number" defaultValue={currentUser.contract.weeklyHours} disabled={currentUser.role === 'Employee'} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-date">{t('employmentStartDate')}</Label>
                <Input id="start-date" type="date" defaultValue={currentUser.contract.startDate} disabled={currentUser.role === 'Employee'} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">{t('employmentEndDate')}</Label>
                <Input id="end-date" type="date" defaultValue={currentUser.contract.endDate ?? ''} disabled={currentUser.role === 'Employee'} />
              </div>
            </div>
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
    </>
  )
}
