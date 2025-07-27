'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';
import { resetUserPassword } from '../dashboard/actions';
import { sendPasswordResetConfirmationEmail } from '@/lib/mail';
import { Eye, EyeOff } from 'lucide-react';

const resetPasswordSchema = z.object({
  password: z.string().min(8, { message: "Password must be at least 8 characters long." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
                                <div className="relative">
                                    <Input type={showPassword ? 'text' : 'password'} {...field} disabled={isLoading} className="pr-10"/>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                                        onClick={() => setShowPassword(prev => !prev)}
                                        disabled={isLoading}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff /> : <Eye />}
                                    </Button>
                                </div>
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
                                <div className="relative">
                                    <Input type={showConfirmPassword ? 'text' : 'password'} {...field} disabled={isLoading} className="pr-10"/>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                                        onClick={() => setShowConfirmPassword(prev => !prev)}
                                        disabled={isLoading}
                                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                    >
                                        {showConfirmPassword ? <EyeOff /> : <Eye />}
                                    </Button>
                                </div>
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