
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { currentUser } from "@/lib/mock-data";
import { LogoIcon } from "@/components/ui/logo-icon";

export default function LoginPage() {
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
            <form className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="m@example.com" defaultValue={currentUser.email} required />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link href="#" className="inline-block ml-auto text-sm underline" prefetch={false}>
                    Forgot password?
                  </Link>
                </div>
                <Input id="password" type="password" required />
              </div>
              <Button type="submit" className="w-full" asChild>
                  <Link href="/dashboard">Login</Link>
              </Button>
              <p className="text-xs text-center text-muted-foreground pt-2">
                This is a demo. You can use any email and password.
              </p>
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
