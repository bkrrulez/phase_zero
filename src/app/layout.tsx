
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'Phase0',
  description: 'A tool for civil engineers and building planners.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 42 42'%3e%3ccircle cx='21' cy='21' r='18' stroke='hsl(221, 44%, 41%)' stroke-width='4' fill='none'/%3e%3cpath d='M21 12 L27 21 L21 30 L15 21 L21 12Z' fill='hsl(217, 91%, 60%)'/%3e%3cpath d='M21 12 L15 21 L21 30 L27 21 L21 12Z' stroke='hsl(221, 44%, 41%)' stroke-width='2' stroke-linejoin='round'/%3e%3ccircle cx='21' cy='21' r='2' fill='hsl(221, 44%, 41%)'/%3e%3c/svg%3e" />
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
