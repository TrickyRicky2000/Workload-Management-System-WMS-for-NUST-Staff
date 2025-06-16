
import { LogWorkloadForm } from "@/components/dashboard/staff/log-workload-form"; 

export default function LogWorkloadPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Log My Workload</h1>
      <p className="text-muted-foreground">
        Use this page to log your teaching activities, administrative work, personal research, and student supervision efforts for the current period.
      </p>
      <LogWorkloadForm />
    </div>
  );
}
