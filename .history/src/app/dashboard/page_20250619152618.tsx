
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DashboardRedirectPage() {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user && role) {
        // If role is determined, redirect to role-specific dashboard
        router.replace(`/dashboard/${role.toLowerCase()}`);
      } else if (!user) {
        // If no user, redirect to login
        router.replace("/login");
      }
      // If user exists but no role, stay on this page to show the message
    }
  }, [user, loading, role, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (user && !role) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md shadow-md">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-lg font-semibold">Role Assignment Issue</AlertTitle>
          <AlertDescription className="mt-1">
            Your user role could not be determined. Please ensure your account is correctly configured.
            Contact support if this issue persists.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="ml-3 text-lg text-foreground">Preparing your dashboard...</p>
    </div>
  );
}
