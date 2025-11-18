
import { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LogoIcon } from '@/components/ui/logo-icon';
import { ResetPasswordForm } from './form';

export default function ResetPasswordPage() {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <main className="flex-1 flex items-center justify-center p-4">
                <Card className="w-full max-w-sm mx-auto shadow-xl">
                    <div className="flex justify-center items-center mt-6 mb-4">
                        <LogoIcon className="w-10 h-10" />
                    </div>
                    <Suspense fallback={
                        <CardContent>
                            <div className="text-center text-muted-foreground p-8">Loading...</div>
                        </CardContent>
                    }>
                        <ResetPasswordForm />
                    </Suspense>
                </Card>
            </main>
            <footer className="p-4 text-center text-xs text-muted-foreground">
                Created by TU Wien, Res. Unit of Structural Engineering and Building Preservation
            </footer>
        </div>
    )
}
