'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { LogoIcon } from "@/components/ui/logo-icon";
import { teamMembers as initialTeamMembers, type User } from '@/lib/mock-data';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teamMembers, setTeamMembers] = useLocalStorage<User[]>('teamMembers', initialTeamMembers);
  const [, setCurrentUserId] = useLocalStorage<string | null>('currentUserId', null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

    // Special login check for the Super Admin
    if (adminEmail && email.toLowerCase() === adminEmail.toLowerCase()) {
      if (password === adminPassword) {
        let user = teamMembers.find(u => u.email.toLowerCase() === email.toLowerCase());

        // Self-healing: If the admin user isn't in localStorage (e.g., due to stale data),
        // find them in the mock data and add them.
        if (!user) {
          const adminFromMock = initialTeamMembers.find(u => u.email.toLowerCase() === email.toLowerCase());
          if (adminFromMock) {
            setTeamMembers([...teamMembers, adminFromMock]);
            user = adminFromMock;
          }
        }
        
        if (user) {
          setCurrentUserId(user.id);
          router.push('/dashboard');
        } else {
          // This can happen if the .env.local email doesn't match any user in mock-data.
          toast({
            variant: 'destructive',
            title: 'Configuration Error',
            description: 'Admin user not found in the database.',
          });
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: 'Incorrect password for admin user.',
        });
      }
      return; // Stop further execution
    }

    // Default behavior for other demo users (no password check)
    const user = teamMembers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      setCurrentUserId(user.id);
      router.push('/dashboard');
    } else {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'No user found with that email address.',
      });
    }
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
                <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link href="#" className="inline-block ml-auto text-sm underline" prefetch={false}>
                    Forgot password?
                  </Link>
                </div>
                <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">
                  Login
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
