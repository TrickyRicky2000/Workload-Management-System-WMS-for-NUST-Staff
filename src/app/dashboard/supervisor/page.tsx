
import { RoleSpecificCard } from "@/components/dashboard/role-specific-card";
import { Eye, Users, BarChartHorizontal } from "lucide-react"; // Users and BarChartHorizontal might be for future use
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SupervisorDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Supervisor Dashboard</h1>
      <p className="text-muted-foreground">Welcome, Supervisor. Review submitted workloads from academic staff in your department.</p>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2"> {/* Simplified grid */}
        <RoleSpecificCard
          title="Review Submitted Workloads"
          description="View, approve, or comment on workloads submitted by academic staff."
          icon={Eye}
        >
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Access the list of submitted workloads to provide feedback or approve them.
            </p>
            <Link href="/dashboard/supervisor/view-workloads" passHref>
              <Button className="w-full">Review Workloads</Button>
            </Link>
          </div>
        </RoleSpecificCard>

        {/* Placeholder for potential future supervisor functionalities */}
        {/*
        <RoleSpecificCard
          title="Departmental Staff"
          description="View academic staff in your department."
          icon={Users}
        >
         <div className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Access a directory of staff members within your oversight.
            </p>
            <Button variant="outline" className="w-full" disabled>View Staff (Coming Soon)</Button>
          </div>
        </RoleSpecificCard>

        <RoleSpecificCard
          title="Departmental Reports"
          description="Generate summary reports for your department."
          icon={BarChartHorizontal}
        >
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Access aggregated workload data and summaries.
            </p>
            <Button variant="outline" className="w-full" disabled>View Reports (Coming Soon)</Button>
          </div>
        </RoleSpecificCard>
        */}
      </div>
    </div>
  );
}
