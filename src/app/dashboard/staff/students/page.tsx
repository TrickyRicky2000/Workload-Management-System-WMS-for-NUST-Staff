
import { ResearchStudentManagement } from "@/components/dashboard/staff/research-student-management";

export default function ManageStudentsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">My Research Students</h1>
      <p className="text-muted-foreground">
        Add, view, edit, and remove your supervised research students.
      </p>
      <ResearchStudentManagement />
    </div>
  );
}
