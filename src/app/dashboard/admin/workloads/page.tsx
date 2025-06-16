
import { WorkloadManagement } from "@/components/dashboard/admin/workload-management";

export default function ManageWorkloadsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Workload Management</h1>
      <p className="text-muted-foreground">
        Oversee, review, and manage all workload assignments across the institution.
      </p>
      <WorkloadManagement />
    </div>
  );
}
