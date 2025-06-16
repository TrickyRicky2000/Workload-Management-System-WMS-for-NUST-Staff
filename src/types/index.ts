
import type { User as FirebaseUser } from "firebase/auth";
import type { Timestamp } from "firebase/firestore";

export type UserRole = "Supervisor" | "AcademicStaff" | "Admin" | null;

export interface AppUser extends FirebaseUser {
  role: UserRole;
  department?: string; 
  name?: string; 
}

export interface StaffMember {
  id: string; 
  name: string;
  department?: string;
  role?: UserRole;
}

export interface Course {
  id: string; 
  courseCode: string; 
  name: string; 
  department?: string;
  createdAt?: any; 
}

export interface TeachingAssignment {
  id?: string; // For react-hook-form key
  courseId: string; 
  courseCode: string;
  courseName: string;
  semesterForCourse: string; 
  contactType: string; 
  contactHours: number; 
  notionalHours: number; 
  groupsCoordinated: number; 
  studentCount: number; 
}

export interface WorkloadItem {
  id?: string; // For react-hook-form key
  details: string;
  hours: number;
}

export interface StudentResearchItem {
  id?: string; // For react-hook-form key
  summary: string; // Keep 'summary' consistent with previous field if needed, or change to 'details'
  hours: number;
}


// Represents a periodic workload submission by an AcademicStaff member
export interface Workload {
  id?: string; 
  staffMemberId: string; 
  staffMemberName: string; 
  staffDepartment: string; 
  supervisorId?: string; 
  academicYear: string; 
  semester: string; 
  period?: string; 

  teachingAssignments?: TeachingAssignment[]; 
  totalContactHours: number; 

  adminWorkItems?: WorkloadItem[];
  totalAdminWorkHours?: number;

  personalResearchItems?: WorkloadItem[];
  totalPersonalResearchHours?: number;

  studentResearchItems?: StudentResearchItem[]; 
  totalStudentResearchHours?: number; 

  communityEngagementItems?: WorkloadItem[];
  totalCommunityEngagementHours?: number;

  totalLoggedHours: number; 

  status: "Draft" | "Submitted" | "Approved" | "RequiresAmendment";
  
  staffCertification: boolean;
  supervisorCertification?: boolean;
  supervisorCertificationComment?: string; // HOD comments as per prompt, mapped to supervisor
  executiveDeanCertification?: boolean;
  executiveDeanComment?: string;


  submittedAt?: Timestamp | Date | null; 
  supervisorComment?: string; // General feedback from supervisor if amendment is requested
  respondedAt?: Timestamp | Date | null; 

  createdAt: Timestamp | Date; 
  updatedAt?: Timestamp | Date; 
}


export interface ResearchStudent {
  id: string; 
  supervisorId: string; 
  supervisorName?: string; 
  studentName: string; 
  studentEmail: string; 
  researchTopic: string;
  startDate: Timestamp | string | Date; 
  status?: "Active" | "Graduated" | "On Leave"; 
  createdAt?: any; 
}

