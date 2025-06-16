
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/config/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import type { Workload, TeachingAssignment, WorkloadItem, StudentResearchItem } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpenText, AlertTriangle, Edit, Trash2, Eye, FileText, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button"; 
import { useToast } from "@/hooks/use-toast"; 
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

export function ViewMyWorkloads() {
  const { user: staffUser, loading: authLoading } = useAuth();
  const [workloads, setWorkloads] = useState<Workload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast(); 

  const [selectedWorkloadDetails, setSelectedWorkloadDetails] = useState<Workload | null>(null);
  const [isWorkloadDetailsDialogOpen, setIsWorkloadDetailsDialogOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!staffUser || !staffUser.uid) {
      setError("User details not found. Cannot fetch workloads.");
      setIsLoading(false);
      return;
    }

    const fetchWorkloads = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const workloadsCol = collection(db, "workloads");
        const q = query(
          workloadsCol,
          where("staffMemberId", "==", staffUser.uid),
          orderBy("createdAt", "desc")
        );
        const workloadsSnapshot = await getDocs(q);
        const fetchedWorkloads = workloadsSnapshot.docs.map(doc => {
          const data = doc.data() as Workload;
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : null,
            respondedAt: data.respondedAt instanceof Timestamp ? data.respondedAt.toDate() : null,
          };
        });
        setWorkloads(fetchedWorkloads);
      } catch (err: any) {
        console.error("Error fetching staff workloads:", err);
        if (err.code === 'failed-precondition' && err.message.includes("index")) {
             setError("Query requires a Firestore index. Please check the browser console for a link to create it, or ensure an index exists on 'staffMemberId' (asc) and 'createdAt' (desc) for the 'workloads' collection.");
        } else {
            setError("Failed to fetch workloads. Please try again later.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkloads();
  }, [staffUser, authLoading]);

  const getStatusBadgeVariant = (status: Workload["status"]) => {
    switch (status) {
      case "Approved": return "default";
      case "Submitted": return "secondary";
      case "RequiresAmendment": return "destructive";
      case "Draft": return "outline";
      default: return "outline";
    }
  };
  
  const getStatusColorClass = (status: Workload["status"]) => {
    switch (status) {
      case "Approved": return "bg-green-500/20 text-green-700 border-green-400";
      case "Submitted": return "bg-blue-500/20 text-blue-700 border-blue-400";
      case "RequiresAmendment": return "bg-red-500/20 text-red-700 border-red-400";
      case "Draft": return "bg-gray-500/20 text-gray-700 border-gray-400";
      default: return "";
    }
  };

  const handleEditDraft = (workloadId: string) => {
    toast({ title: "Edit Draft", description: `Edit functionality for draft ${workloadId} to be implemented. Please use the Log My Workload page to create a new one for now.`});
    // Future: router.push(`/dashboard/staff/log-workload/edit/${workloadId}`);
  };

  const handleDeleteDraft = (workloadId: string) => {
    // Future: Implement actual deletion logic with confirmation
    toast({ title: "Delete Draft (Mock)", description: `Mock deletion for draft ${workloadId}. To be fully implemented.`});
  };

  const openDetailsDialog = (workload: Workload) => {
    setSelectedWorkloadDetails(workload);
    setIsWorkloadDetailsDialogOpen(true);
  };
  
  const renderItemizedSectionInDialog = (title: string, items: WorkloadItem[] | StudentResearchItem[] | undefined, totalHours: number | undefined, itemType: "details" | "summary") => {
    if (!items || items.length === 0) return null;
    return (
      <Card className="mt-2"><CardHeader className="pb-2 pt-3"><CardTitle className="text-base">{title} (Total: {totalHours?.toFixed(1) || 0} hrs)</CardTitle></CardHeader>
      <CardContent className="text-sm pt-0">
        <div className="pl-4 border-l-2 border-muted-foreground/20 max-h-40 overflow-y-auto">
        {items.map((item, index) => (
            <div key={index} className="text-xs py-1 border-b border-muted-foreground/10 last:border-b-0">
                <p className="font-semibold">{itemType === "details" ? (item as WorkloadItem).details : (item as StudentResearchItem).summary}</p>
                <p className="text-muted-foreground">Hours: {item.hours.toFixed(1)}</p>
            </div>
        ))}
        </div>
      </CardContent></Card>
    );
  };


  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg text-foreground">Loading your workloads...</p>
      </div>
    );
  }

  if (error) {
    return (
       <Card className="w-full shadow-lg border-destructive">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-2xl text-destructive">Error Loading Workloads</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpenText className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">My Logged Workloads</CardTitle>
          </div>
          <CardDescription>
            A list of your workload submissions, their statuses, and any feedback from your supervisor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workloads.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              You have not logged any workloads yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Semester/Period</TableHead>
                    <TableHead className="text-right">Total Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead className="max-w-xs">Supervisor Comment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workloads.map((workload) => (
                    <TableRow key={workload.id}>
                      <TableCell>{workload.academicYear}</TableCell>
                      <TableCell>{workload.semester} {workload.period ? `- ${workload.period}` : ''}</TableCell>
                      <TableCell className="text-right">{workload.totalLoggedHours?.toFixed(1) || "N/A"}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={getStatusBadgeVariant(workload.status)}
                          className={getStatusColorClass(workload.status)}
                        >
                          {workload.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {workload.submittedAt ? format(new Date(workload.submittedAt), "dd MMM yyyy, HH:mm") : (workload.status === "Draft" ? "Draft" : "N/A")}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{workload.supervisorComment || (workload.supervisorCertificationComment ? "Policy Comment Available" : "N/A")}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openDetailsDialog(workload)}>
                            <Eye className="mr-1 h-4 w-4" /> View
                        </Button>
                        {workload.status === "Draft" && (
                          <>
                            <Button variant="outline" size="icon" onClick={() => handleEditDraft(workload.id!)} aria-label="Edit Draft">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="icon" onClick={() => handleDeleteDraft(workload.id!)} aria-label="Delete Draft">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedWorkloadDetails && (
        <Dialog open={isWorkloadDetailsDialogOpen} onOpenChange={(open) => { if(!open) setSelectedWorkloadDetails(null); setIsWorkloadDetailsDialogOpen(open); }}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Workload Details: {selectedWorkloadDetails.academicYear} - {selectedWorkloadDetails.semester}</DialogTitle>
              <DialogDescription>
                Logged by: {selectedWorkloadDetails.staffMemberName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
               <Card><CardContent className="p-3 space-y-1 text-sm">
                    <div className="flex items-baseline"><span className="font-semibold mr-1">Status:</span> <Badge variant={getStatusBadgeVariant(selectedWorkloadDetails.status)} className={getStatusColorClass(selectedWorkloadDetails.status)}>{selectedWorkloadDetails.status}</Badge></div>
                    <div><span className="font-semibold">Total Logged Hours:</span> {selectedWorkloadDetails.totalLoggedHours?.toFixed(1) || "N/A"}</div>
                    <div><span className="font-semibold">Period:</span> {selectedWorkloadDetails.period || "N/A"}</div>
                    <div><span className="font-semibold">Submitted:</span> {selectedWorkloadDetails.submittedAt ? format(new Date(selectedWorkloadDetails.submittedAt), "PPP p") : "Not Submitted"}</div>
                    {selectedWorkloadDetails.respondedAt && <div><span className="font-semibold">Responded:</span> {format(new Date(selectedWorkloadDetails.respondedAt), "PPP p")}</div>}
                     <div className="flex items-center space-x-2 pt-1">
                        <Checkbox id={`staffCertView-${selectedWorkloadDetails.id}`} checked={selectedWorkloadDetails.staffCertification} disabled />
                        <Label htmlFor={`staffCertView-${selectedWorkloadDetails.id}`} className="text-xs text-muted-foreground">Staff Certified</Label>
                    </div>
                </CardContent></Card>


              {selectedWorkloadDetails.teachingAssignments && selectedWorkloadDetails.teachingAssignments.length > 0 && (
                <Card><CardHeader className="pb-2 pt-3"><CardTitle className="text-base">Teaching Assignments (Total: {selectedWorkloadDetails.totalContactHours?.toFixed(1)} hrs)</CardTitle></CardHeader>
                <CardContent className="text-sm pt-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Contact Type</TableHead><TableHead className="text-right">Contact Hrs</TableHead><TableHead className="text-right">Students</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {selectedWorkloadDetails.teachingAssignments.map((ta: TeachingAssignment, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{ta.courseName} ({ta.courseCode}) - {ta.semesterForCourse}</TableCell>
                          <TableCell>{ta.contactType}</TableCell>
                          <TableCell className="text-right">{ta.contactHours?.toFixed(1)}</TableCell>
                          <TableCell className="text-right">{ta.studentCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent></Card>
              )}
              
              {renderItemizedSectionInDialog("Administrative / Governance Tasks", selectedWorkloadDetails.adminWorkItems, selectedWorkloadDetails.totalAdminWorkHours, "details")}
              {renderItemizedSectionInDialog("Personal Research", selectedWorkloadDetails.personalResearchItems, selectedWorkloadDetails.totalPersonalResearchHours, "details")}
              {renderItemizedSectionInDialog("Student Research Supervision", selectedWorkloadDetails.studentResearchItems, selectedWorkloadDetails.totalStudentResearchHours, "summary")}
              {renderItemizedSectionInDialog("Community Engagement / Other", selectedWorkloadDetails.communityEngagementItems, selectedWorkloadDetails.totalCommunityEngagementHours, "details")}

              {selectedWorkloadDetails.supervisorComment && (
                  <Card className="p-3 bg-amber-50 border-amber-200">
                      <h4 className="font-semibold mb-1 text-amber-700 text-sm">Supervisor's General Comment:</h4>
                      <p className="text-xs text-amber-600 whitespace-pre-wrap">{selectedWorkloadDetails.supervisorComment}</p>
                  </Card>
              )}
              {selectedWorkloadDetails.supervisorCertification && (
                     <Card className="p-3 bg-green-50 border-green-200">
                        <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600"/>
                            <p className="text-xs text-green-700">Supervisor Certified</p>
                        </div>
                        {selectedWorkloadDetails.supervisorCertificationComment && <p className="text-xs text-green-600 whitespace-pre-wrap mt-1 pl-6">Comment: {selectedWorkloadDetails.supervisorCertificationComment}</p>}
                    </Card>
                )}
            </div>
            <DialogClose asChild>
                <div className="flex justify-end pt-4 border-t">
                    <Button type="button" variant="outline">Close</Button>
                </div>
            </DialogClose>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
