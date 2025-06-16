
"use client"; // Required because it uses useAuth and client components

import type React from 'react';
import Image from 'next/image'; // Import next/image
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import { UserDropdown } from "./user-dropdown";
import { useAuth, getRolePathSegment } from "@/hooks/use-auth";
import { useEffect, useState } from 'react'; // Added useState
import { useRouter, usePathname } from 'next/navigation';
import type { UserRole } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, role, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isLogoutAlertOpen, setIsLogoutAlertOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    } else if (!loading && user && role) {
      const expectedPathPrefix = `/dashboard/${getRolePathSegment(role as UserRole)}`;
      if (!pathname.startsWith(expectedPathPrefix)) {
        // This part is tricky: if a user is an admin and on /dashboard/admin/users,
        // expectedPathPrefix would be /dashboard/admin. pathname.startsWith is correct.
        // However, if they are on /dashboard/hod and their role is admin, they should be redirected.
        // The current logic might be too aggressive or not specific enough.
        // For now, we ensure the core redirection upon login is correct.
        // A more robust check might be needed if users can freely navigate to incorrect role dashboards.
        // Example: if role is "Admin" and path is "/dashboard/hod", redirect to "/dashboard/admin"
        // const currentBaseDashboard = pathname.split('/')[2]; // e.g., "admin" from "/dashboard/admin/users"
        // if (getRolePathSegment(role as UserRole) !== currentBaseDashboard && pathname !== "/dashboard") {
        //   router.replace(`/dashboard/${getRolePathSegment(role as UserRole)}`);
        // }
      }
    }
  }, [user, loading, role, router, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading dashboard...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogoutConfirm = async () => {
    await logout();
    setIsLogoutAlertOpen(false);
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2 justify-between">
             {/* Replace Button with Image component */}
             <div className="h-10 w-10 flex items-center justify-center">
                <Image
                  src="/logo.png" // Assumes logo.png is in /public directory
                  alt="Nust Work Management System Logo"
                  width={32} // Adjust width as needed
                  height={32} // Adjust height as needed
                  className="object-contain"
                  data-ai-hint="application logo"
                />
             </div>
             <span className="text-lg font-semibold text-primary group-data-[collapsible=icon]:hidden">Nust Work Management</span>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-0">
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="mt-auto">
          <AlertDialog open={isLogoutAlertOpen} onOpenChange={setIsLogoutAlertOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2"
              >
                <LogOut className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">Logout</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will be returned to the login page. Any unsaved changes may be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogoutConfirm}>Sign Out</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="flex items-center gap-4 ml-auto">
            <UserDropdown />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
