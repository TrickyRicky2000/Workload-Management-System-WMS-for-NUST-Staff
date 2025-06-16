
import { RoleSpecificCard } from "@/components/dashboard/role-specific-card";
import { FileText, UserCog, BookMarked } from "lucide-react"; 
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
      <p className="text-muted-foreground">Welcome, Administrator. Manage users, courses, and workloads.</p>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <RoleSpecificCard
          title="User Management"
          description="Administer user accounts, roles, and permissions."
          icon={UserCog}
        >
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Add or edit user accounts and assign roles.
            </p>
            <Link href="/dashboard/admin/users" passHref>
              <Button className="w-full">Manage Users</Button>
            </Link>
          </div>
        </RoleSpecificCard>

        <RoleSpecificCard
          title="Course Management"
          description="Manage academic courses offered."
          icon={BookMarked}
        >
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Add, view, or update course details and their departments.
            </p>
            <Link href="/dashboard/admin/courses" passHref>
              <Button className="w-full">Manage Courses</Button>
            </Link>
          </div>
        </RoleSpecificCard>

        <RoleSpecificCard
          title="Workload Management"
          description="View all assigned workloads across the system."
          icon={FileText}
        >
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Oversee all workload assignments across departments.
            </p>
            <Link href="/dashboard/admin/workloads" passHref>
              <Button className="w-full">View All Workloads</Button>
            </Link>
          </div>
        </RoleSpecificCard>
      </div>
    </div>
  );
}
