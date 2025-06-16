
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, getRolePathSegment } from "@/hooks/use-auth"; // Import getRolePathSegment
import { Loader2 } from "lucide-react";
import type { UserRole } from "@/types";

export default function HomePage() {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user && role) {
        const pathSegment = getRolePathSegment(role as UserRole); // Cast role
        router.replace(`/dashboard/${pathSegment}`);
      } else if (user && !role) {
        // User is authenticated, but role is not determined yet or is null.
        // Redirect to the generic dashboard page which will handle this.
        router.replace("/dashboard");
      } else if (!user) {
        // No user, redirect to login.
        router.replace("/login");
      }
    }
  }, [user, loading, role, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="ml-4 text-xl text-foreground">Loading UniWorkload...</p>
    </div>
  );
}
