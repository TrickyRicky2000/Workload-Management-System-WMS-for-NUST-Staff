
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Filter, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Workload } from "@/types";
import { db } from "@/config/firebase";
import { collection, query, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { format } from "date-fns";

export function WorkloadManagement() {
  const [allWorkloads, setAllWorkloads] = useState<Workload[]>([]);
  const [filteredWorkloads, setFilteredWorkloads] = useState<Workload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterStatus, setFilterStatus] = useState<Workload["status"] | "">("");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchWorkloads = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const workloadsCol = collection(db, "workloads");
        const q = query(workloadsCol, orderBy("createdAt", "desc")); 
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
        setAllWorkloads(fetchedWorkloads);
        setFilteredWorkloads(fetchedWorkloads);
      } catch (err: any) {
        console.error("Error fetching workloads for admin view:", err);
         if (err.code === 'failed-precondition' && err.message.includes("index")) {
             setError("Query requires a Firestore index. Please check the browser console for a link to create it (e.g., on 'createdAt' desc for 'workloads' collection).");
        } else {
            setError("Failed to fetch workloads. Please try again later.");
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchWorkloads();
  }, []);

  useEffect(() => {
    let currentWorkloads = [...allWorkloads];
    if (filterDepartment) {
      currentWorkloads = currentWorkloads.filter(w => w.staffDepartment === filterDepartment);
    }
    if (filterStatus) {
      currentWorkloads = currentWorkloads.filter(w => w.status === filterStatus);
    }
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      currentWorkloads = currentWorkloads.filter(w => 
        w.staffMemberName.toLowerCase().includes(lowerSearchTerm) ||
        w.academicYear.toLowerCase().includes(lowerSearchTerm) ||
        (w.period && w.period.toLowerCase().includes(lowerSearchTerm)) ||
        (w.teachingAssignments && w.teachingAssignments.some(ta => ta.courseCode.toLowerCase().includes(lowerSearchTerm) || ta.courseName.toLowerCase().includes(lowerSearchTerm)))
      );
    }
    setFilteredWorkloads(currentWorkloads);
  }, [allWorkloads, filterDepartment, filterStatus, searchTerm]);

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

  const handleDepartmentChange = (value: string) => {
    if (value === "_all_") {
      setFilterDepartment("");
    } else {
      setFilterDepartment(value);
    }
  };
  
  const handleStatusChange = (value: string) => {
    if (value === "_all_") {
      setFilterStatus("");
    } else {
      setFilterStatus(value as Workload["status"]);
    }
  };
  
  const uniqueDepartments = useMemo(() => {
    const departments = new Set(allWorkloads.map(w => w.staffDepartment));
    return Array.from(departments).sort();
  }, [allWorkloads]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg text-foreground">Loading workloads...</p>
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
            <FileText className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Workload Overview</CardTitle>
        </div>
        <CardDescription>Monitor all logged workloads across departments. (Read-only)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Input 
            placeholder="Search by staff, course, year..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Select value={filterDepartment || "_all_"} onValueChange={handleDepartmentChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">All Departments</SelectItem>
              {uniqueDepartments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus || "_all_"} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">All Statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Submitted">Submitted</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="RequiresAmendment">Requires Amendment</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setSearchTerm(""); setFilterDepartment(""); setFilterStatus(""); }}>
            <Filter className="mr-2 h-4 w-4" /> Clear Filters
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Semester/Period</TableHead>
                <TableHead className="text-right">Teaching Hrs</TableHead>
                <TableHead className="text-right">Admin Hrs</TableHead>
                <TableHead className="text-right">Personal Research Hrs</TableHead>
                <TableHead className="text-right">Student Research Hrs</TableHead>
                <TableHead className="text-right">Total Logged Hrs</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkloads.map((workload) => (
                <TableRow key={workload.id}>
                  <TableCell className="font-medium">{workload.staffMemberName}</TableCell>
                  <TableCell>{workload.staffDepartment}</TableCell>
                  <TableCell>{workload.academicYear}</TableCell>
                  <TableCell>{workload.semester} {workload.period ? `- ${workload.period}` : ''}</TableCell>
                  <TableCell className="text-right">{workload.totalTeachingHours || 0}</TableCell>
                  <TableCell className="text-right">{workload.adminWorkHours || 0}</TableCell>
                  <TableCell className="text-right">{workload.personalResearchHours || 0}</TableCell>
                  <TableCell className="text-right">{workload.studentResearchHours || 0}</TableCell>
                  <TableCell className="text-right font-semibold">{workload.totalLoggedHours || "N/A"}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filteredWorkloads.length === 0 && <p className="text-muted-foreground text-center mt-4">No workloads match your criteria.</p>}
      </CardContent>
    </Card>
  );
}
