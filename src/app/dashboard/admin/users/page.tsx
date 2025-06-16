
import { UserManagement } from "@/components/dashboard/admin/user-management";

export default function ManageUsersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">User Management</h1>
      <p className="text-muted-foreground">
        Administer user accounts, roles, and permissions across the UniWorkload system.
      </p>
      <UserManagement />
    </div>
  );
}
