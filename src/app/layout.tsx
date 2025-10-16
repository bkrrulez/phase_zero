
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
        <link rel="icon" href="data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 42 42' fill='none'%3e%3ctitle%3ePhase0 Compass Logo%3c/title%3e%3ccircle cx='21' cy='21' r='18' stroke='hsl(221, 44%, 41%)' stroke-width='2'/%3e%3ccircle cx='21' cy='21' r='14' stroke='hsl(221, 44%, 41%)' stroke-width='1' stroke-dasharray='3 3'/%3e%3cpath d='M21 9 L23 19 L21 23 L19 19 L21 9Z' fill='hsl(217, 91%, 60%)' /%3e%3cpath d='M33 21 L23 23 L19 21 L23 19 L33 21Z' fill='hsl(217, 91%, 60%)' /%3e%3cpath d='M21 33 L19 23 L21 19 L23 23 L21 33Z' fill='hsl(217, 91%, 60%)' /%3e%3cpath d='M9 21 L19 23 L23 21 L19 19 L9 21Z' fill='hsl(217, 91%, 60%)' /%3e%3cpath d='M21 9 L23 19 L21 23 L19 19 L21 9Z' stroke='hsl(221, 44%, 41%)' stroke-width='1' stroke-linejoin='round' /%3e%3cpath d='M33 21 L23 23 L19 21 L23 19 L33 21Z' stroke='hsl(221, 44%, 41%)' stroke-width='1' stroke-linejoin='round' /%3e%3cpath d='M21 33 L19 23 L21 19 L23 23 L21 33Z' stroke='hsl(221, 44%, 41%)' stroke-width='1' stroke-linejoin='round' /%3e%3cpath d='M9 21 L19 23 L23 21 L19 19 L9 21Z' stroke='hsl(221, 44%, 41%)' stroke-width='1' stroke-linejoin='round' /%3e%3c/svg%3e" />
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
