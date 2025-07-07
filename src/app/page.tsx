'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { LogoIcon } from "@/components/ui/logo-icon";
import { useToast } from '@/hooks/use-toast';
import useLocalStorage from '@/hooks/useLocalStorage';
import { type User } from '@/lib/types';
import { initialData } from '@/lib/mock-data';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [, setCurrentUserId] = useLocalStorage<string | null>('currentUserId', null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'password';
    
    // Read the latest user data from localStorage, with initialData as a fallback
    const usersJSON = window.localStorage.getItem('teamMembers');
    const allUsers: User[] = usersJSON ? JSON.parse(usersJSON) : initialData.teamMembers;
    
    const user = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    let loginSuccessful = false;
    if (user) {
      if (user.role === 'Super Admin' && password === adminPassword) {
        loginSuccessful = true;
      } else if (user.role !== 'Super Admin' && password === 'password') {
        // All other mock users have the password 'password'
        loginSuccessful = true;
      }
    }
    
    if (loginSuccessful && user) {
        setCurrentUserId(user.id);
        router.push('/dashboard');
    } else {
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: 'Invalid email or password.',
        });
    }

    setIsLoading(false);
  };

  return (
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
                  <Link href="#" className="inline-block ml-auto text-sm underline" prefetch={false}>
                    Forgot password?
                  </Link>
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
  );
}
