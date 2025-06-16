
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, PlusCircle, Trash2, Save, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/config/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { Course, Workload, TeachingAssignment, WorkloadItem, StudentResearchItem } from "@/types";
import { serverTimestamp, addDoc, collection, getDocs, query, orderBy, where, Timestamp } from "firebase/firestore";
import { useEffect, useState, useMemo } from "react";

const teachingAssignmentSchema = z.object({
  id: z.string().optional(),
  courseId: z.string().min(1, "Course ID is required."),
  courseCode: z.string().min(1, "Course code is required."),
  courseName: z.string().min(1, "Course name is required."),
  semesterForCourse: z.string().min(1, "Semester for course is required."),
  contactType: z.string().min(1, "Contact type is required."),
  contactHours: z.coerce.number().min(0, "Contact hours must be non-negative.").default(0),
  notionalHours: z.coerce.number().min(0, "Notional hours must be non-negative.").default(0),
  groupsCoordinated: z.coerce.number().int().min(0, "Groups must be a non-negative integer.").default(0),
  studentCount: z.coerce.number().int().min(0, "Student count must be a non-negative integer.").default(0),
});

const workloadItemSchema = z.object({
  id: z.string().optional(),
  details: z.string().min(1, "Details are required."),
  hours: z.coerce.number().min(0, "Hours must be non-negative.").default(0),
});

const studentResearchItemSchema = z.object({
  id: z.string().optional(),
  summary: z.string().min(1, "Summary is required."),
  hours: z.coerce.number().min(0, "Hours must be non-negative.").default(0),
});

const workloadSchema = z.object({
  academicYear: z.string()
    .min(1, "Academic Year is required.")
    .regex(/^\d{4}-\d{4}$/, "Format must be YYYY-YYYY (e.g., 2024-2025)."),
  semester: z.string().min(1, "Overall semester is required."),
  period: z.string().optional(),

  teachingAssignments: z.array(teachingAssignmentSchema).optional(),
  personalResearchItems: z.array(workloadItemSchema).optional(),
  studentResearchItems: z.array(studentResearchItemSchema).optional(),
  adminWorkItems: z.array(workloadItemSchema).optional(),
  communityEngagementItems: z.array(workloadItemSchema).optional(),

  staffCertification: z.boolean().refine(val => val === true, {
    message: "You must certify your workload submission before submitting to supervisor."
  }),
});

type WorkloadFormValues = z.infer<typeof workloadSchema>;

const contactTypeOptions = ["Lecture", "Lab", "Tutorial", "Practical", "Online", "Studio", "Other"];
const courseSemesterOptions = ["Semester 1", "Semester 2", "Year Module", "Trimester 1", "Trimester 2", "Trimester 3", "Other"];


export function LogWorkloadForm() {
  const { user: staffUser } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  const form = useForm<WorkloadFormValues>({
    resolver: zodResolver(workloadSchema),
    defaultValues: {
      academicYear: "", 
      semester: "",
      period: "",
      teachingAssignments: [],
      adminWorkItems: [],
      personalResearchItems: [],
      studentResearchItems: [],
      communityEngagementItems: [],
      staffCertification: false,
    },
  });

  useEffect(() => {
    // Set academicYear after mount to avoid potential hydration issues
    const currentYear = new Date().getFullYear();
    form.setValue("academicYear", `${currentYear}-${currentYear + 1}`, { 
      shouldValidate: true, 
      shouldDirty: true 
    });
  }, [form]);

  const { fields: teachingFields, append: appendTeaching, remove: removeTeaching } = useFieldArray({ control: form.control, name: "teachingAssignments" });
  const { fields: adminFields, append: appendAdmin, remove: removeAdmin } = useFieldArray({ control: form.control, name: "adminWorkItems" });
  const { fields: personalResearchFields, append: appendPersonalResearch, remove: removePersonalResearch } = useFieldArray({ control: form.control, name: "personalResearchItems" });
  const { fields: studentResearchFields, append: appendStudentResearch, remove: removeStudentResearch } = useFieldArray({ control: form.control, name: "studentResearchItems" });
  const { fields: communityEngagementFields, append: appendCommunity, remove: removeCommunity } = useFieldArray({ control: form.control, name: "communityEngagementItems" });

  const watchedTeachingAssignments = useWatch({ control: form.control, name: "teachingAssignments" });
  const watchedAdminWorkItems = useWatch({ control: form.control, name: "adminWorkItems" });
  const watchedPersonalResearchItems = useWatch({ control: form.control, name: "personalResearchItems" });
  const watchedStudentResearchItems = useWatch({ control: form.control, name: "studentResearchItems" });
  const watchedCommunityEngagementItems = useWatch({ control: form.control, name: "communityEngagementItems" });

  const calculateTotalHours = (items: Array<{ hours?: number | string } | undefined> | undefined): number => {
    return (items || []).reduce((sum, item) => {
      const hours = Number(item?.hours);
      return sum + (isNaN(hours) ? 0 : hours);
    }, 0);
  };
  
  const totalContactHours = useMemo(() => calculateTotalHours(watchedTeachingAssignments?.map(ta => ({hours: ta?.contactHours }))), [watchedTeachingAssignments]);
  const totalPersonalResearchHours = useMemo(() => calculateTotalHours(watchedPersonalResearchItems), [watchedPersonalResearchItems]);
  const totalStudentResearchHours = useMemo(() => calculateTotalHours(watchedStudentResearchItems), [watchedStudentResearchItems]);
  const totalAdminWorkHours = useMemo(() => calculateTotalHours(watchedAdminWorkItems), [watchedAdminWorkItems]);
  const totalCommunityEngagementHours = useMemo(() => calculateTotalHours(watchedCommunityEngagementItems), [watchedCommunityEngagementItems]);
  
  const totalLoggedHours = useMemo(() => {
    return (
      Number(totalContactHours || 0) +
      Number(totalPersonalResearchHours || 0) +
      Number(totalStudentResearchHours || 0) +
      Number(totalAdminWorkHours || 0) +
      Number(totalCommunityEngagementHours || 0)
    );
  }, [totalContactHours, totalPersonalResearchHours, totalStudentResearchHours, totalAdminWorkHours, totalCommunityEngagementHours]);

  useEffect(() => {
    const fetchCoursesData = async () => {
      setIsLoadingCourses(true);
      try {
        const coursesCol = collection(db, "courses");
        const q = query(coursesCol, orderBy("name", "asc"));
        const coursesSnapshot = await getDocs(q);
        const fetchedCourses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        setCourses(fetchedCourses);
      } catch (error: any) {
        console.error("Error fetching courses:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch courses." });
        if (error.code === 'failed-precondition' && error.message.includes("index")) {
          toast({
            variant: "destructive",
            title: "Firestore Index Required",
            description: "An index is required for querying courses. Please check the console for a link to create it or create an index on 'name' (asc) for the 'courses' collection.",
            duration: 10000,
          });
        }
      } finally {
        setIsLoadingCourses(false);
      }
    };
    fetchCoursesData();
  }, [toast]);

  const findSupervisorId = async (department: string): Promise<string | null> => {
    if (!department) return null;
    try {
      const staffCol = collection(db, "staff");
      const q = query(staffCol, where("department", "==", department), where("role", "==", "Supervisor"));
      const supervisorSnapshot = await getDocs(q);
      if (!supervisorSnapshot.empty) {
        return supervisorSnapshot.docs[0].id;
      }
      toast({ variant: "destructive", title: "Supervisor Not Found", description: `No supervisor configured for ${department}. Cannot submit.` });
      return null;
    } catch (error) {
      console.error("Error finding supervisor:", error);
      toast({ variant: "destructive", title: "Error Finding Supervisor", description: "Could not determine supervisor." });
      return null;
    }
  };

  const processSubmit = async (values: WorkloadFormValues, status: "Draft" | "Submitted") => {
    if (!staffUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to submit a workload." });
      return;
    }
    
    setIsSubmitting(true); // Set loading state at the beginning

    // Recalculate totals from 'values' for validation and submission
    const currentTotalContactHours = calculateTotalHours(values.teachingAssignments?.map(ta => ({ hours: ta.contactHours })));
    const currentTotalPersonalResearchHours = calculateTotalHours(values.personalResearchItems);
    const currentTotalStudentResearchHours = calculateTotalHours(values.studentResearchItems);
    const currentTotalAdminWorkHours = calculateTotalHours(values.adminWorkItems);
    const currentTotalCommunityEngagementHours = calculateTotalHours(values.communityEngagementItems);

    const currentSubmissionTotalHours =
      Number(currentTotalContactHours || 0) +
      Number(currentTotalPersonalResearchHours || 0) +
      Number(currentTotalStudentResearchHours || 0) +
      Number(currentTotalAdminWorkHours || 0) +
      Number(currentTotalCommunityEngagementHours || 0);

    if (status === "Submitted") {
      if (currentSubmissionTotalHours < 160 || currentSubmissionTotalHours > 240) {
        toast({
          variant: "destructive",
          title: "Workload Hours Out of Range",
          description: `Total logged hours (${currentSubmissionTotalHours.toFixed(1)}) must be between 160 and 240 to submit. Please review your entries or save as draft.`,
          duration: 7000,
        });
        setIsSubmitting(false); // Reset loading state
        return; // Stop execution
      }
      if (!values.staffCertification) {
         toast({ variant: "destructive", title: "Certification Required", description: "Please certify your workload before submitting to supervisor." });
         setIsSubmitting(false); // Reset loading state
         return; // Stop execution
      }
    }

    let supervisorId: string | null = null;
    if (status === "Submitted") {
      if (!staffUser.department) {
        toast({ variant: "destructive", title: "Missing Department", description: "Your user profile is missing a department. Cannot submit to a supervisor." });
        setIsSubmitting(false); // Reset loading state
        return; // Stop execution
      }
      supervisorId = await findSupervisorId(staffUser.department);
      if (!supervisorId) {
        setIsSubmitting(false); // Reset loading state
        return; // Stop execution
      }
    }

    const workloadData: Omit<Workload, "id" | "createdAt" | "updatedAt"> & { createdAt: any, updatedAt?: any, submittedAt?: any } = {
      staffMemberId: staffUser.uid,
      staffMemberName: staffUser.name || staffUser.displayName || staffUser.email?.split('@')[0] || "N/A",
      staffDepartment: staffUser.department || "N/A",
      supervisorId: status === "Submitted" ? supervisorId ?? undefined : undefined,
      academicYear: values.academicYear,
      semester: values.semester,
      period: values.period,
      
      teachingAssignments: (values.teachingAssignments || []).map(ta => ({
        ...ta,
        contactHours: Number(ta.contactHours) || 0,
        notionalHours: Number(ta.notionalHours) || 0,
        groupsCoordinated: Number(ta.groupsCoordinated) || 0,
        studentCount: Number(ta.studentCount) || 0,
      })),
      totalContactHours: currentTotalContactHours,
      
      adminWorkItems: (values.adminWorkItems || []).map(item => ({ ...item, hours: Number(item.hours) || 0})),
      totalAdminWorkHours: currentTotalAdminWorkHours,
      
      personalResearchItems: (values.personalResearchItems || []).map(item => ({ ...item, hours: Number(item.hours) || 0})),
      totalPersonalResearchHours: currentTotalPersonalResearchHours,
      
      studentResearchItems: (values.studentResearchItems || []).map(item => ({ ...item, hours: Number(item.hours) || 0})),
      totalStudentResearchHours: currentTotalStudentResearchHours,
      
      communityEngagementItems: (values.communityEngagementItems || []).map(item => ({ ...item, hours: Number(item.hours) || 0})),
      totalCommunityEngagementHours: currentTotalCommunityEngagementHours,

      totalLoggedHours: currentSubmissionTotalHours,
      status: status,
      staffCertification: values.staffCertification,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (status === "Submitted") {
      workloadData.submittedAt = serverTimestamp();
    }

    try {
      await addDoc(collection(db, "workloads"), workloadData);
      toast({
        title: `Workload ${status === "Draft" ? "Saved as Draft" : "Submitted"}`,
        description: `Your workload for ${values.academicYear} (${values.semester}) has been successfully ${status === "Draft" ? "saved" : "submitted"}.`,
      });
      form.reset({
        academicYear: "", 
        semester: "",
        period: "",
        teachingAssignments: [],
        adminWorkItems: [],
        personalResearchItems: [],
        studentResearchItems: [],
        communityEngagementItems: [],
        staffCertification: false,
      }); 
      const currentYear = new Date().getFullYear();
      form.setValue("academicYear", `${currentYear}-${currentYear + 1}`, { shouldValidate: true, shouldDirty: true });

    } catch (error: any) {
      console.error(`Error ${status === "Draft" ? "saving draft" : "submitting workload"}:`, error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || `Could not ${status === "Draft" ? "save" : "submit"} your workload. Please try again.`,
      });
    } finally {
      setIsSubmitting(false); // Reset loading state
    }
  };

  const renderWorkloadItems = (
    fieldArray: any, 
    title: string, 
    totalHours: number, 
    placeholder: string,
    fieldNamePrefix: "adminWorkItems" | "personalResearchItems" | "communityEngagementItems"
  ) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {fieldArray.fields.map((item: {id: string}, index: number) => (
          <div key={item.id} className="border p-4 rounded-md mb-4 space-y-3">
            <FormField
              control={form.control}
              name={`${fieldNamePrefix}.${index}.details`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details</FormLabel>
                  <FormControl>
                    <Textarea placeholder={placeholder} {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`${fieldNamePrefix}.${index}.hours`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hours</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Hours spent" {...field} min="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="text-right">
              <Button type="button" variant="destructive" size="icon" onClick={() => fieldArray.remove(index)} aria-label={`Remove ${title} item`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => fieldArray.append({ details: "", hours: 0 })} className="mt-2">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Item
        </Button>
        {fieldArray.fields.length > 0 && (
          <div className="mt-4 text-right font-semibold">Total {title} Hours: {totalHours.toFixed(1)}</div>
        )}
      </CardContent>
    </Card>
  );
  
  const renderStudentResearchItems = () => (
    <Card>
      <CardHeader>
        <CardTitle>Student Research Supervision</CardTitle>
        <CardDescription>Log time spent supervising research students (Masters, Honours, PhD). This section contributes to your overall Research load.</CardDescription>
      </CardHeader>
      <CardContent>
        {studentResearchFields.map((item, index) => (
          <div key={item.id} className="border p-4 rounded-md mb-4 space-y-3">
            <FormField
              control={form.control}
              name={`studentResearchItems.${index}.summary`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary of Student Supervision Activities</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Summarize supervision activities, number of students, meetings, thesis review, etc." {...field} rows={2} />
                  </FormControl>
                  <FormDescription>Detailed student management is on 'My Research Students' page. This is for workload hours.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`studentResearchItems.${index}.hours`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student Supervision Hours</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Hours spent" {...field} min="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="text-right">
              <Button type="button" variant="destructive" size="icon" onClick={() => removeStudentResearch(index)} aria-label="Remove student research item">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => appendStudentResearch({ summary: "", hours: 0 })} className="mt-2">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Student Supervision Item
        </Button>
        {studentResearchFields.length > 0 && (
          <div className="mt-4 text-right font-semibold">Total Student Supervision Hours: {totalStudentResearchHours.toFixed(1)}</div>
        )}
      </CardContent>
    </Card>
  );


  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Academic Period</CardTitle>
            <CardDescription>Specify the overall academic year, semester, and period for this workload log.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="academicYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Academic Year (YYYY-YYYY)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 2024-2025" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="semester"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Semester</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""} defaultValue="">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select overall semester" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">Semester 1</SelectItem>
                      <SelectItem value="2">Semester 2</SelectItem>
                      <SelectItem value="Year">Full Year</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Quarter 1, Block A" {...field} />
                  </FormControl>
                  <FormDescription>Further specify the timeframe if applicable.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section 1: Teaching Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Teaching Assignments</CardTitle>
            <CardDescription>Log your teaching activities. Add each course assignment separately.</CardDescription>
          </CardHeader>
          <CardContent>
            {teachingFields.map((item, index) => (
              <div key={item.id} className="border p-4 rounded-md mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`teachingAssignments.${index}.courseId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            const selectedCourse = courses.find(c => c.id === value);
                            if (selectedCourse) {
                              form.setValue(`teachingAssignments.${index}.courseCode`, selectedCourse.courseCode);
                              form.setValue(`teachingAssignments.${index}.courseName`, selectedCourse.name);
                            }
                          }}
                          value={field.value || ""}
                          defaultValue=""
                          disabled={isLoadingCourses}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isLoadingCourses ? "Loading courses..." : "Select course"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {courses.map((course) => (
                              <SelectItem key={course.id} value={course.id}>
                                {course.name} ({course.courseCode})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`teachingAssignments.${index}.semesterForCourse`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Semester for Course</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""} defaultValue="">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select course semester" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {courseSemesterOptions.map(option => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`teachingAssignments.${index}.contactType`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type of Contact</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""} defaultValue="">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select contact type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                             {contactTypeOptions.map(option => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name={`teachingAssignments.${index}.contactHours`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Hours</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Hours" {...field} min="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`teachingAssignments.${index}.notionalHours`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notional Hours</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Hours" {...field} min="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`teachingAssignments.${index}.groupsCoordinated`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Groups Coordinated</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="No. of groups" {...field} min="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`teachingAssignments.${index}.studentCount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Students</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="No. of students" {...field} min="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="text-right">
                    <Button type="button" variant="destructive" size="icon" onClick={() => removeTeaching(index)} aria-label="Remove teaching assignment">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm"
              onClick={() => appendTeaching({ 
                courseId: "", courseCode: "", courseName: "", 
                semesterForCourse: "", contactType: "", contactHours: 0, 
                notionalHours: 0, groupsCoordinated: 0, studentCount: 0 
              })}
              disabled={isLoadingCourses} className="mt-2"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Course Assignment
            </Button>
            {teachingFields.length > 0 && (
                <div className="mt-4 text-right font-semibold">Total Contact Hours: {totalContactHours.toFixed(1)}</div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Research Activities (Personal & Student) */}
        {renderWorkloadItems(
          { fields: personalResearchFields, append: appendPersonalResearch, remove: removePersonalResearch },
          "Personal Research Activities",
          totalPersonalResearchHours,
          "Describe your personal research projects, publications, grant writing, conference presentations, etc. This contributes to your Research load.",
          "personalResearchItems"
        )}
        
        {renderStudentResearchItems()}

        {/* Section 3: Administrative / Governance Tasks */}
        {renderWorkloadItems(
          { fields: adminFields, append: appendAdmin, remove: removeAdmin }, 
          "Administrative / Governance Tasks", 
          totalAdminWorkHours, 
          "Departmental admin, meetings, committee work, event organization, MCing, Speaker at event, etc.",
          "adminWorkItems"
        )}

        {/* Section 4: Community Engagement */}
        {renderWorkloadItems(
          { fields: communityEngagementFields, append: appendCommunity, remove: removeCommunity },
          "Community Engagement & Professional Activities",
          totalCommunityEngagementHours,
          "Describe community engagement (e.g., programming competitions, outreach), industry collaborations, professional development, short courses, etc.",
          "communityEngagementItems"
        )}

        <Card>
            <CardHeader><CardTitle>Certification</CardTitle></CardHeader>
            <CardContent>
                <FormField
                    control={form.control}
                    name="staffCertification"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                        <FormControl>
                            <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel>
                            Staff Certification
                            </FormLabel>
                            <FormDescription>
                            I certify that the information provided herein represents the truth and my true workload for this semester/period.
                            </FormDescription>
                             <FormMessage />
                        </div>
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>


        <Card>
            <CardHeader><CardTitle>Workload Summary</CardTitle></CardHeader>
            <CardContent>
                <div className="space-y-2 text-lg">
                    <div className="flex justify-between"><span>Total Contact Hours (Teaching):</span><span className="font-semibold">{totalContactHours.toFixed(1)}</span></div>
                    <div className="flex justify-between"><span>Total Personal Research Hours:</span><span className="font-semibold">{totalPersonalResearchHours.toFixed(1)}</span></div>
                    <div className="flex justify-between"><span>Total Student Supervision Hours:</span><span className="font-semibold">{totalStudentResearchHours.toFixed(1)}</span></div>
                    <div className="flex justify-between"><span>Total Admin/Governance Hours:</span><span className="font-semibold">{totalAdminWorkHours.toFixed(1)}</span></div>
                    <div className="flex justify-between"><span>Total Community Engagement Hours:</span><span className="font-semibold">{totalCommunityEngagementHours.toFixed(1)}</span></div>
                    <hr className="my-2 border-border"/>
                    <div className="flex justify-between font-bold text-xl"><span>Total Logged Hours:</span><span>{totalLoggedHours.toFixed(1)}</span></div>
                </div>
                 {totalLoggedHours > 0 && (totalLoggedHours < 160 || totalLoggedHours > 240) && (
                    <p className="mt-3 text-sm text-destructive font-medium">
                        Note: Your current total logged hours ({totalLoggedHours.toFixed(1)}) are outside the standard range (160-240 hours).
                        You can save this as a draft, but submission to your supervisor will require adjustment to fall within this range.
                    </p>
                )}
            </CardContent>
            <CardFooter className="flex justify-end gap-4 mt-6">
                <Button type="button" variant="outline" onClick={form.handleSubmit(data => processSubmit(data, "Draft"))} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save as Draft
                </Button>
                <Button type="button" onClick={form.handleSubmit(data => processSubmit(data, "Submitted"))} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Submit to Supervisor
                </Button>
            </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
    

    