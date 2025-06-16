
import { CourseManagement } from "@/components/dashboard/admin/course-management";

export default function ManageCoursesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Course Administration</h1>
      <p className="text-muted-foreground">
        Manage all academic courses offered by the institution.
      </p>
      <CourseManagement />
    </div>
  );
}
