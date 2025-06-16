
import { DepartmentalWorkloadView } from "@/components/dashboard/supervisor/departmental-workload-view";

export default function ReviewWorkloadsPage() { // Renamed from ViewWorkloadsPage for clarity
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Review Submitted Workloads</h1>
      <p className="text-muted-foreground">
        Browse, review, approve, or comment on workload submissions from academic staff in your department.
      </p>
      <DepartmentalWorkloadView />
    </div>
  );
}
