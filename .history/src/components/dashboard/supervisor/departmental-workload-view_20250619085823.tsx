
"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/config/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import type { Workload, TeachingAssignment, WorkloadItem, StudentResearchItem } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, Filter, AlertTriangle, CheckCircle, MessageSquareWarning, Send, FileText } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function DepartmentalWorkloadView() {
  const { user: supervisorUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [allWorkloads, setAllWorkloads] = useState<Workload[]>([]);
  const [filteredWorkloads, setFilteredWorkloads] = useState<Workload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filterStatus, setFilterStatus] = useState<Workload["status"] | "">("");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedWorkload, setSelectedWorkload] = useState<Workload | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  const [isAmendmentDialogOpen, setIsAmendmentDialogOpen] = useState(false);
  const [amendmentComment, setAmendmentComment] = useState(""); // For general amendment request
  
  const [supervisorCertification, setSupervisorCertification] = useState(false);
  const [supervisorCertificationComment, setSupervisorCertificationComment] = useState("");

  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const fetchWorkloads = async () => {
    if (!supervisorUser || !supervisorUser.department) {
      if (!authLoading) { 
        setError("Supervisor details or department not found. Cannot fetch workloads.");
      }
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const workloadsCol = collection(db, "workloads");
      const q = query(
        workloadsCol,
        where("staffDepartment", "==", supervisorUser.department),
        orderBy("createdAt", "desc") 
      );
      const workloadsSnapshot = await getDocs(q);
      const fetchedWorkloads = workloadsSnapshot.docs.map(docSnap => {
        const data = docSnap.data() as Workload;
        return {
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : null,
          respondedAt: data.respondedAt instanceof Timestamp ? data.respondedAt.toDate() : null,
        };
      });
      setAllWorkloads(fetchedWorkloads);
      setFilteredWorkloads(fetchedWorkloads); 
    } catch (err: any) {
      console.error("Error fetching workloads for supervisor:", err);
      if (err.code === 'failed-precondition' && err.message.includes("index")) {
           setError("Query requires a Firestore index. Please check the browser console for a link to create it, or ensure relevant indexes exist on the 'workloads' collection (e.g., for staffDepartment and createdAt).");
      } else {
          setError("Failed to fetch workloads. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (!authLoading) { 
        fetchWorkloads();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supervisorUser, authLoading]); 

  useEffect(() => {
    let currentWorkloads = [...allWorkloads];
    if (filterStatus) {
      currentWorkloads = currentWorkloads.filter(w => w.status === filterStatus);
    }
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      currentWorkloads = currentWorkloads.filter(w => 
        w.staffMemberName.toLowerCase().includes(lowerSearchTerm) ||
        w.academicYear.toLowerCase().includes(lowerSearchTerm) ||
        (w.period && w.period.toLowerCase().includes(lowerSearchTerm))
      );
    }
    setFilteredWorkloads(currentWorkloads);
  }, [allWorkloads, filterStatus, searchTerm]);

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

  const handleFilterStatusChange = (value: string) => {
    if (value === "_all_") {
      setFilterStatus("");
    } else {
      setFilterStatus(value as Workload["status"]);
    }
  };

  const handleOpenDetailsDialog = (workload: Workload) => {
    setSelectedWorkload(workload);
    setSupervisorCertification(workload.supervisorCertification || false);
    setSupervisorCertificationComment(workload.supervisorCertificationComment || "");
    setAmendmentComment(""); // Clear general amendment comment
    setIsDetailsDialogOpen(true);
  };

  const handleApproveWorkload = async () => {
    if (!selectedWorkload || !selectedWorkload.id) return;
     if (!supervisorCertification) {
        toast({ variant: "destructive", title: "Certification Required", description: "Please certify the workload before approving." });
        return;
    }
    setIsProcessingAction(true);
    try {
      const workloadRef = doc(db, "workloads", selectedWorkload.id);
      await updateDoc(workloadRef, {
        status: "Approved",
        supervisorComment: "", // Clear previous general amendment comments on approval
        respondedAt: serverTimestamp(),
        supervisorCertification: supervisorCertification,
        supervisorCertificationComment: supervisorCertificationComment,
      });
      toast({ title: "Workload Approved", description: `${selectedWorkload.staffMemberName}'s workload has been approved.` });
      setIsDetailsDialogOpen(false);
      setSelectedWorkload(null);
      fetchWorkloads(); 
    } catch (err) {
      console.error("Error approving workload:", err);
      toast({ variant: "destructive", title: "Approval Failed", description: "Could not approve the workload." });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleOpenAmendmentDialog = () => {
    if (!selectedWorkload) return;
    // amendmentComment state is for the general "request amendment" dialog
    setAmendmentComment(selectedWorkload.supervisorComment || ""); 
    setIsAmendmentDialogOpen(true);
   
  };

  const handleRequestAmendmentSubmit = async () => {
    if (!selectedWorkload || !selectedWorkload.id || !amendmentComment.trim()) {
      toast({ variant: "destructive", title: "Comment Required", description: "Please provide a comment for the amendment request." });
      return;
    }
    setIsProcessingAction(true);
    try {
      const workloadRef = doc(db, "workloads", selectedWorkload.id);
      await updateDoc(workloadRef, {
        status: "RequiresAmendment",
        supervisorComment: amendmentComment, // This is the general amendment comment
        respondedAt: serverTimestamp(),
        supervisorCertification: false, // Reset supervisor certification if requesting amendment
        supervisorCertificationComment: "", // Clear supervisor certification comment
      });
      toast({ title: "Amendment Requested", description: `Feedback sent to ${selectedWorkload.staffMemberName}.` });
      setIsAmendmentDialogOpen(false);
      setIsDetailsDialogOpen(false); 
      setSelectedWorkload(null);
      setAmendmentComment("");
      fetchWorkloads(); 
    } catch (err) {
      console.error("Error requesting amendment:", err);
      toast({ variant: "destructive", title: "Request Failed", description: "Could not request amendment." });
    } finally {
      setIsProcessingAction(false);
    }
  };
  
  const renderItemizedSection = (title: string, items: WorkloadItem[] | StudentResearchItem[] | undefined, totalHours: number | undefined, itemType: "details" | "summary") => {
    if (!items || items.length === 0) return null;
    return (
        <div className="mt-3">
            <h5 className="font-medium text-sm mb-1">{title} (Total: {totalHours?.toFixed(1) || 0} hrs)</h5>
            <div className="pl-4 border-l-2 border-muted">
            {items.map((item, index) => (
                <div key={index} className="text-xs py-1">
                    <p className="font-semibold">{itemType === "details" ? (item as WorkloadItem).details : (item as StudentResearchItem).summary}</p>
                    <p className="text-muted-foreground">Hours: {item.hours.toFixed(1)}</p>
                </div>
            ))}
            </div>
        </div>
    );
  };


  if (authLoading || (isLoading && !allWorkloads.length)) { 
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg text-foreground">Loading submitted workloads...</p>
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
    <Card className="w-full shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Workload Submissions for {supervisorUser?.department}</CardTitle>
        </div>
        <CardDescription>Review and manage workload submissions from academic staff.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Input 
            placeholder="Search by staff, year, period..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Select value={filterStatus || "_all_"} onValueChange={handleFilterStatusChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">All Statuses</SelectItem>
              <SelectItem value="Submitted">Submitted</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="RequiresAmendment">Requires Amendment</SelectItem>
              <SelectItem value="Draft">Draft (Staff View)</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setSearchTerm(""); setFilterStatus(""); }}>
            <Filter className="mr-2 h-4 w-4" /> Clear Filters
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Name</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Semester/Period</TableHead>
                <TableHead className="text-right">Total Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkloads.map((workload) => (
                <TableRow key={workload.id}>
                  <TableCell className="font-medium">{workload.staffMemberName}</TableCell>
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
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenDetailsDialog(workload)} >
                      <Eye className="mr-1 h-4 w-4" /> Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filteredWorkloads.length === 0 && !isLoading && <p className="text-muted-foreground text-center mt-4">No workloads match your criteria or none submitted yet.</p>}

        {selectedWorkload && (
          <Dialog open={isDetailsDialogOpen} onOpenChange={(open) => { if(!open) setSelectedWorkload(null); setIsDetailsDialogOpen(open); }}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5"/>Workload Details: {selectedWorkload.staffMemberName}</DialogTitle>
                <DialogDescription>
                  Academic Year: {selectedWorkload.academicYear} | Semester: {selectedWorkload.semester} {selectedWorkload.period ? `(${selectedWorkload.period})` : ''}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Card><CardContent className="p-4 space-y-1 text-sm">
                    <div><span className="font-semibold">Staff:</span> {selectedWorkload.staffMemberName}</div>
                    <div><span className="font-semibold">Department:</span> {selectedWorkload.staffDepartment}</div>
                    <div className="flex items-baseline"><span className="font-semibold mr-1">Status:</span> <Badge variant={getStatusBadgeVariant(selectedWorkload.status)} className={getStatusColorClass(selectedWorkload.status)}>{selectedWorkload.status}</Badge></div>
                    <div><span className="font-semibold">Total Logged Hours:</span> {selectedWorkload.totalLoggedHours?.toFixed(1) || "N/A"}</div>
                    {selectedWorkload.submittedAt && <div><span className="font-semibold">Submitted:</span> {format(new Date(selectedWorkload.submittedAt), "PPP p")}</div>}
                     <div className="flex items-center space-x-2 mt-2">
                        <Checkbox id={`staffCert-${selectedWorkload.id}`} checked={selectedWorkload.staffCertification} disabled />
                        <Label htmlFor={`staffCert-${selectedWorkload.id}`} className="text-xs text-muted-foreground">Staff Certified: "I certify that the information provided here represent the truth and my true workload for this semester."</Label>
                    </div>
                </CardContent></Card>

                {selectedWorkload.teachingAssignments && selectedWorkload.teachingAssignments.length > 0 && (
                  <Card><CardHeader><CardTitle className="text-base">Teaching Assignments (Total: {selectedWorkload.totalContactHours?.toFixed(1)} hrs)</CardTitle></CardHeader>
                  <CardContent className="text-sm">
                    <Table>
                      <TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Contact Type</TableHead><TableHead className="text-right">Contact Hrs</TableHead><TableHead className="text-right">Students</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {selectedWorkload.teachingAssignments.map((ta, index) => (
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
                
                {selectedWorkload.adminWorkItems && selectedWorkload.adminWorkItems.length > 0 && renderItemizedSection("Administrative / Governance Tasks", selectedWorkload.adminWorkItems, selectedWorkload.totalAdminWorkHours, "details")}
                {selectedWorkload.personalResearchItems && selectedWorkload.personalResearchItems.length > 0 && renderItemizedSection("Personal Research", selectedWorkload.personalResearchItems, selectedWorkload.totalPersonalResearchHours, "details")}
                {selectedWorkload.studentResearchItems && selectedWorkload.studentResearchItems.length > 0 && renderItemizedSection("Student Research Supervision", selectedWorkload.studentResearchItems, selectedWorkload.totalStudentResearchHours, "summary")}
                {selectedWorkload.communityEngagementItems && selectedWorkload.communityEngagementItems.length > 0 && renderItemizedSection("Community Engagement / Other", selectedWorkload.communityEngagementItems, selectedWorkload.totalCommunityEngagementHours, "details")}

                {selectedWorkload.supervisorComment && (selectedWorkload.status === "RequiresAmendment" || selectedWorkload.status === "Approved" && !selectedWorkload.supervisorCertificationComment) && (
                    <Card className="p-4 bg-amber-50 border-amber-200">
                        <h4 className="font-semibold mb-1 text-amber-700 text-sm">Supervisor's General Comment (for amendment):</h4>
                        <p className="text-xs text-amber-600 whitespace-pre-wrap">{selectedWorkload.supervisorComment}</p>
                    </Card>
                )}
                
                {selectedWorkload.status === "Submitted" && (
                <Card className="mt-4"><CardContent className="p-4 space-y-3">
                    <div className="flex items-center space-x-3">
                        <Checkbox 
                            id={`supervisorCert-${selectedWorkload.id}`} 
                            checked={supervisorCertification} 
                            onCheckedChange={(checked) => setSupervisorCertification(Boolean(checked))}
                            disabled={isProcessingAction}
                        />
                        <Label htmlFor={`supervisorCert-${selectedWorkload.id}`} className="text-sm">
                           Supervisor Certification: "I certify that I have discussed this workload with the staff member and it complies with the workload policy."
                        </Label>
                    </div>
                    <div>
                        <Label htmlFor={`supervisorCertComment-${selectedWorkload.id}`} className="text-sm font-medium">Supervisor Comments (optional, on certification/policy compliance):</Label>
                        <Textarea 
                            id={`supervisorCertComment-${selectedWorkload.id}`}
                            value={supervisorCertificationComment}
                            onChange={(e) => setSupervisorCertificationComment(e.target.value)}
                            placeholder="Comments regarding policy compliance..."
                            rows={2}
                            className="mt-1 text-sm"
                            disabled={isProcessingAction}
                        />
                    </div>
                </CardContent></Card>
                )}

                {selectedWorkload.supervisorCertification && (
                     <Card className="p-4 bg-green-50 border-green-200 mt-2">
                        <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600"/>
                            <p className="text-xs text-green-700">Supervisor Certified: "I certify that I have discussed this workload with the staff member and it complies with the workload policy."</p>
                        </div>
                        {selectedWorkload.supervisorCertificationComment && <p className="text-xs text-green-600 whitespace-pre-wrap mt-1 pl-6">Comment: {selectedWorkload.supervisorCertificationComment}</p>}
                    </Card>
                )}


              </div>
              <DialogFooter className="sm:justify-between items-center pt-4 border-t">
                <DialogClose asChild>
                  <Button type="button" variant="outline"  disabled={isProcessingAction}>Close</Button>
                </DialogClose>
                {selectedWorkload.status === "Submitted" && (
                  <div className="flex gap-2 mt-4 sm:mt-0">
                    <Button 
                      type="button" 
                      onClick={handleOpenAmendmentDialog} 
                      disabled={isProcessingAction}
                      variant="outline"
                      className="text-amber-600 border-amber-500 hover:bg-amber-50 hover:text-amber-700"
                    >
                      {isProcessingAction && amendmentComment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquareWarning className="mr-2 h-4 w-4" />}
                      Request Amendment
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleApproveWorkload} 
                      disabled={isProcessingAction || !supervisorCertification}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isProcessingAction && !amendmentComment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                      Approve Workload
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {selectedWorkload && (
            <Dialog open={isAmendmentDialogOpen} onOpenChange={(open) => { if(!open) setAmendmentComment(""); setIsAmendmentDialogOpen(open);}}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Request Amendment for {selectedWorkload.staffMemberName}</DialogTitle>
                        <DialogDescription>
                            Please provide comments or reasons for requesting an amendment to this workload. This will set the workload status to "Requires Amendment".
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="amendmentCommentGeneral" className="sr-only">Comment for Amendment</Label>
                        <Textarea 
                            id="amendmentCommentGeneral" 
                            value={amendmentComment} 
                            onChange={(e) => setAmendmentComment(e.target.value)}
                            placeholder="Type your comments here..."
                            rows={5}
                        />
                    </div>
                    <DialogFooter>
                         <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={isProcessingAction}>Cancel</Button>
                        </DialogClose>
                        <Button type="submit" onClick={handleRequestAmendmentSubmit} disabled={isProcessingAction || !amendmentComment.trim()}>
                            {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Send Amendment Request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}

      </CardContent>
    </Card>
  );
}
