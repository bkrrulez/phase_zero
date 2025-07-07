
"use client";

import Link from "next/link";
import {
  Bell,
  ChevronDown,
  Calendar as CalendarIcon,
  Home,
  LogOut,
  Users,
  Settings,
  BarChartHorizontal,
  ChevronRight,
  Briefcase,
  ClipboardList,
  CalendarDays,
  Send,
  Building,
  PlusCircle,
  Shield,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { currentUser } from "@/lib/mock-data";
import { LogoIcon } from "@/components/ui/logo-icon";
import { cn } from "@/lib/utils";
import { LogTimeDialog, type LogTimeFormValues } from "./components/log-time-dialog";
import { TimeTrackingProvider, useTimeTracking } from "./contexts/TimeTrackingContext";
import { MembersProvider } from "./contexts/MembersContext";
import { AccessControlProvider } from "./contexts/AccessControlContext";

function LayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogTimeDialogOpen, setIsLogTimeDialogOpen] = useState(false);
  const { logTime } = useTimeTracking();

  useEffect(() => {
    setIsSettingsOpen(pathname.startsWith('/dashboard/settings'));
  }, [pathname]);

  const handleLogTime = (data: LogTimeFormValues) => {
    const { success } = logTime(data);
    if (success) {
      setIsLogTimeDialogOpen(false);
    }
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <LogoIcon className="w-8 h-8" />
            <h1 className="text-xl font-bold font-headline text-primary">Time<span className="text-accent">Wise</span></h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
                <Link href="/dashboard">
                  <Home />
                  Dashboard
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/team")}>
                <Link href="/dashboard/team">
                  <Users />
                  Team
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {(currentUser.role === 'Team Lead' || currentUser.role === 'Super Admin') && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/reports")}>
                  <Link href="/dashboard/reports">
                    <BarChartHorizontal />
                    Reports
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/holidays")}>
                <Link href="/dashboard/holidays">
                  <CalendarIcon />
                  Holidays
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <SidebarMenuItem>
                    <CollapsibleTrigger className="w-full" asChild>
                        <SidebarMenuButton className="justify-between w-full">
                            <div className="flex items-center gap-2">
                                <Settings />
                                <span>Settings</span>
                            </div>
                            <ChevronRight className={cn("h-4 w-4 transition-transform duration-200", isSettingsOpen && "rotate-90")} />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                </SidebarMenuItem>
                <CollapsibleContent>
                    <SidebarMenu className="pl-6 py-2 space-y-1">
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/settings/members")}>
                            <Link href="/dashboard/settings/members">
                                <Users /> Members
                            </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/settings/teams")}>
                            <Link href="/dashboard/settings/teams">
                                <Building /> Teams
                            </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/settings/projects")}>
                            <Link href="/dashboard/settings/projects">
                                <Briefcase /> Projects
                            </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/settings/tasks")}>
                            <Link href="/dashboard/settings/tasks">
                                <ClipboardList /> Tasks
                            </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {(currentUser.role === 'Super Admin' || currentUser.role === 'Team Lead') && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/settings/access-control")}>
                              <Link href="/dashboard/settings/access-control">
                                  <Shield /> Access Control
                              </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                      {currentUser.role === 'Super Admin' && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/settings/holidays")}>
                              <Link href="/dashboard/settings/holidays">
                                  <CalendarDays /> Holidays
                              </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/settings/push-messages")}>
                            <Link href="/dashboard/settings/push-messages">
                                <Send /> Push Messages
                            </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                </CollapsibleContent>
            </Collapsible>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/">
                  <LogOut />
                  Logout
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 bg-card border-b sticky top-0 z-10">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsLogTimeDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Log Time
            </Button>
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 p-1 h-auto">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={currentUser.avatar} alt={currentUser.name} data-ai-hint="person avatar"/>
                    <AvatarFallback>{currentUser.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden md:block">
                    <p className="text-sm font-medium">{currentUser.name}</p>
                    <p className="text-xs text-muted-foreground">{currentUser.role}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>Support</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/">Logout</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        <LogTimeDialog
          isOpen={isLogTimeDialogOpen}
          onOpenChange={setIsLogTimeDialogOpen}
          onLogTime={handleLogTime}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TimeTrackingProvider>
      <MembersProvider>
        <AccessControlProvider>
          <LayoutContent>{children}</LayoutContent>
        </AccessControlProvider>
      </MembersProvider>
    </TimeTrackingProvider>
  );
}
