
"use client";

import { LoginForm } from "@/components/auth/login-form";
import { useAuth, getRolePathSegment } from "@/hooks/use-auth"; // Import getRolePathSegment
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { UserRole } from "@/types";

export default function LoginPage() {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) { // If user object exists after loading
      if (role) { // And role also exists
        const pathSegment = getRolePathSegment(role as UserRole); // Cast role
        router.push(`/dashboard/${pathSegment}`);
      } else { // User exists, but role is null or not yet determined
        router.push('/dashboard'); // Redirect to generic dashboard page
      }
    }
    // If !user and !loading, they stay on login page, which is correct.
  }, [user, loading, role, router]);

  if (loading || (!loading && user)) { // Show loader if still loading OR if user exists (as redirect will happen)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Only show LoginForm if not loading and no user (meaning they need to log in)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <LoginForm />
    </div>
  );
}
