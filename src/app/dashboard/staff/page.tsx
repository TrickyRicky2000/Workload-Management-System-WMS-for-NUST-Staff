
import { RoleSpecificCard } from "@/components/dashboard/role-specific-card";
import { GraduationCap, BookOpenText, ClipboardEdit } from "lucide-react"; 
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function StaffDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Academic Staff Dashboard</h1>
      <p className="text-muted-foreground">Welcome! Manage your teaching, research, and administrative tasks.</p>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <RoleSpecificCard
          title="Log My Workload"
          description="Submit your periodic workload details."
          icon={ClipboardEdit}
        >
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Enter your teaching hours, research activities, admin tasks, and student supervision details for submission.
            </p>
            <Link href="/dashboard/staff/log-workload" passHref>
              <Button className="w-full">Log Workload</Button>
            </Link>
          </div>
        </RoleSpecificCard>
        
        <RoleSpecificCard
          title="My Logged Workloads"
          description="View your submitted and draft workloads."
          icon={BookOpenText}
        >
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Check the status of your submitted workloads, view supervisor comments, and manage drafts.
            </p>
            <Link href="/dashboard/staff/my-workload" passHref>
              <Button className="w-full">View My Workloads</Button>
            </Link>
          </div>
        </RoleSpecificCard>

        <RoleSpecificCard
          title="My Research Students"
          description="Manage your research students and their progress."
          icon={GraduationCap}
        >
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Add new students, update existing student details. This information can be part of your workload submission.
            </p>
            <Link href="/dashboard/staff/students" passHref>
              <Button className="w-full">Manage Students</Button>
            </Link>
          </div>
        </RoleSpecificCard>
      </div>
    </div>
  );
}
