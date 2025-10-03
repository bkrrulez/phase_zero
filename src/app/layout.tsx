
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'TimeTool',
  description: 'Track work time for your teams.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 42 42'><title>TimeTool Logo</title><path d='M21 3 A 18 18 0 0 1 21 39' stroke='%233B5998' stroke-width='4'/><path d='M21 39 A 18 18 0 0 1 21 3' stroke='%234285F4' stroke-width='4'/><path d='M21 7V9' stroke='%233B5998' stroke-width='3' stroke-linecap='round'/><path d='M35 21H33' stroke='%233B5998' stroke-width='3' stroke-linecap='round'/><path d='M21 35V33' stroke='%234285F4' stroke-width='3' stroke-linecap='round'/><path d='M7 21H9' stroke='%234285F4' stroke-width='3' stroke-linecap='round'/><path fill-rule='evenodd' clip-rule='evenodd' d='M21 23H29V21H23V13H21V23Z' fill='%234285F4'/></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"></link>
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
