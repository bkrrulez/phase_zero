'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoIcon } from "@/components/ui/logo-icon";
import { useToast } from '@/hooks/use-toast';
import { ForgotPasswordDialog } from './components/forgot-password-dialog';
import { verifyUserCredentials } from './dashboard/actions';
import { Eye, EyeOff } from 'lucide-react';
import en from '@/locales/en.json';
import de from '@/locales/de.json';

const translations = { en, de };

type Locale = 'en' | 'de';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotDialogOpen, setIsForgotDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [language, setLanguage] = useState<Locale>('de');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedLang = localStorage.getItem('locale');
    if (storedLang === 'en' || storedLang === 'de') {
      setLanguage(storedLang);
    }
  }, []);

  const t = (key: keyof typeof en) => {
    return translations[language][key] || key;
  };

  const handleSetLanguage = (lang: Locale) => {
    setLanguage(lang);
    if (typeof window !== 'undefined') {
        localStorage.setItem('locale', lang);
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
        const user = await verifyUserCredentials(email, password);

        if (user) {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem('currentUserId', JSON.stringify(user.id));
                window.localStorage.setItem('locale', language);
            }
            router.push('/dashboard');
        } else {
            toast({
              variant: 'destructive',
              title: t('loginFailedTitle' as any),
              description: t('loginFailedDesc' as any),
            });
        }
    } catch (error) {
        console.error("Login error:", error);
        toast({
          variant: 'destructive',
          title: t('loginErrorTitle' as any),
          description: t('loginErrorDesc' as any),
        });
    }

    setIsLoading(false);
  };

  return (
    <>
      <div className="flex flex-col min-h-screen bg-background">
        <header className="absolute top-0 right-0 p-4">
          {isMounted && (
            <div className="text-sm">
                <button 
                    onClick={() => handleSetLanguage('de')} 
                    className={`px-2 py-1 ${language === 'de' ? 'font-bold' : 'hover:underline'}`}
                >
                    DE
                </button>
                /
                <button 
                    onClick={() => handleSetLanguage('en')} 
                    className={`px-2 py-1 ${language === 'en' ? 'font-bold' : 'hover:underline'}`}
                >
                    EN
                </button>
            </div>
          )}
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm mx-auto shadow-xl">
            <CardHeader className="text-center">
              <div className="flex justify-center items-center mb-4">
                <LogoIcon className="w-12 h-12" />
              </div>
              <CardTitle className="text-2xl font-bold font-headline text-primary">PhaseZero</CardTitle>
              <CardDescription>{t('loginDescription' as any)}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">{t('loginEmailLabel' as any)}</Label>
                  <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">{t('loginPasswordLabel' as any)}</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="inline-block ml-auto h-auto p-0 text-sm underline"
                      onClick={() => setIsForgotDialogOpen(true)}
                    >
                      {t('forgotPasswordLink' as any)}
                    </Button>
                  </div>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? 'text' : 'password'} 
                      required 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      disabled={isLoading}
                      className="pr-10"
                    />
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
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? t('loggingInButton' as any) : t('loginButton' as any)}
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
        <footer className="p-4 text-center text-xs text-muted-foreground">
          {t('footerText' as any)}
        </footer>
      </div>
      <ForgotPasswordDialog 
        isOpen={isForgotDialogOpen}
        onOpenChange={setIsForgotDialogOpen}
      />
    </>
  );
}