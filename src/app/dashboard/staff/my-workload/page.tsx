
import { ViewMyWorkloads } from "@/components/dashboard/staff/view-my-workloads";

export default function MyAssignedWorkloadPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">My Assigned Workload</h1>
      <p className="text-muted-foreground">
        View all teaching and administrative duties assigned to you.
      </p>
      <ViewMyWorkloads />
    </div>
  );
}
