'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { LogoIcon } from "@/components/ui/logo-icon";
import { useToast } from '@/hooks/use-toast';
import { resetUserPassword } from '../dashboard/actions';
import { sendPasswordResetConfirmationEmail } from '@/lib/mail';

const resetPasswordSchema = z.object({
  password: z.string().min(8, { message: "Password must be at least 8 characters long." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const email = searchParams.get('email');

    const form = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    });
    
    useEffect(() => {
        if (!email) {
            toast({
                variant: 'destructive',
                title: 'Invalid Link',
                description: 'The password reset link is missing required information.',
            });
            router.push('/');
        }
    }, [email, router, toast]);


    const handlePasswordReset = async (data: ResetPasswordFormValues) => {
        if (!email) return;

        setIsLoading(true);

        try {
            const result = await resetUserPassword(email, data.password);

            if (result && result.user) {
                await sendPasswordResetConfirmationEmail({ user: result.user, teamLead: result.teamLead });
                toast({
                    title: 'Password Reset Successful',
                    description: 'Your password has been changed. You can now log in with your new password.',
                });
                setIsSuccess(true);
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not reset password. The link may be invalid or expired.',
                });
            }
        } catch (error) {
            console.error('Password reset error:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'An unexpected error occurred. Please try again.',
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    if (isSuccess) {
        return (
            <>
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold font-headline">Success!</CardTitle>
                    <CardDescription>Your password has been successfully reset.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button className="w-full" onClick={() => router.push('/')}>
                        Return to Login
                    </Button>
                </CardContent>
            </>
        )
    }
    
    if (!email) {
        return (
             <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold font-headline text-destructive">Invalid Link</CardTitle>
                <CardDescription>This password reset link is invalid or has expired.</CardDescription>
            </CardHeader>
        )
    }

    return (
        <>
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold font-headline">Reset Your Password</CardTitle>
                <CardDescription>Enter a new password for your account: {email}</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handlePasswordReset)} className="space-y-4">
                        <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                                <Input type="password" {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                                <Input type="password" {...field} disabled={isLoading} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Resetting...' : 'Reset Password'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <div className="flex flex-col min-h-screen bg-background">
                <main className="flex-1 flex items-center justify-center p-4">
                    <Card className="w-full max-w-sm mx-auto shadow-xl">
                        <div className="flex justify-center items-center mt-6 mb-4">
                            <LogoIcon className="w-10 h-10" />
                        </div>
                        <ResetPasswordForm />
                    </Card>
                </main>
                <footer className="p-4 text-center text-xs text-muted-foreground">
                    Created by Bikramjit Chowdhury
                </footer>
            </div>
        </Suspense>
    )
}
