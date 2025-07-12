
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoIcon } from "@/components/ui/logo-icon";
import { useToast } from '@/hooks/use-toast';
import { ForgotPasswordDialog } from './components/forgot-password-dialog';
import { verifyUserCredentials } from './dashboard/actions';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotDialogOpen, setIsForgotDialogOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
        const user = await verifyUserCredentials(email, password);

        if (user) {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem('currentUserId', JSON.stringify(user.id));
            }
            router.push('/dashboard');
        } else {
            toast({
              variant: 'destructive',
              title: 'Login Failed',
              description: 'Invalid email or password.',
            });
        }
    } catch (error) {
        console.error("Login error:", error);
        toast({
          variant: 'destructive',
          title: 'Login Error',
          description: 'An unexpected error occurred. Please try again.',
        });
    }


    setIsLoading(false);
  };

  return (
    <>
      <div className="flex flex-col min-h-screen bg-background">
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm mx-auto shadow-xl">
            <CardHeader className="text-center">
              <div className="flex justify-center items-center mb-4">
                <LogoIcon className="w-10 h-10" />
              </div>
              <CardTitle className="text-2xl font-bold font-headline text-primary">TimeTool</CardTitle>
              <CardDescription>Enter your credentials to access your dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="inline-block ml-auto h-auto p-0 text-sm underline"
                      onClick={() => setIsForgotDialogOpen(true)}
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Logging in...' : 'Login'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
        <footer className="p-4 text-center text-xs text-muted-foreground">
          Created by Bikramjit Chowdhury
        </footer>
      </div>
      <ForgotPasswordDialog 
        isOpen={isForgotDialogOpen}
        onOpenChange={setIsForgotDialogOpen}
      />
    </>
  );
}
