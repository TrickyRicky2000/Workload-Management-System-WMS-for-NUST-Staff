
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Trash2, Edit3, GraduationCap, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/config/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import type { ResearchStudent } from "@/types";

// Helper to format date from Timestamp/Date/string to YYYY-MM-DD string for input
const formatDateForInput = (dateValue: Timestamp | Date | string | undefined): string => {
  if (!dateValue) return "";
  let date: Date;
  if (dateValue instanceof Timestamp) {
    date = dateValue.toDate();
  } else if (dateValue instanceof Date) {
    date = dateValue;
  } else if (typeof dateValue === 'string') {
    date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      const parts = dateValue.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) -1; 
        const day = parseInt(parts[2], 10);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          date = new Date(year, month, day);
          if(isNaN(date.getTime())) return "";
        } else {
           return ""; 
        }
      } else {
        return ""; 
      }
    }
  } else {
    return ""; 
  }
  
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};


export function ResearchStudentManagement() {
  const { user: staffUser, loading: authLoading } = useAuth();
  const [students, setStudents] = useState<ResearchStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // State for Add New Student Dialog
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentTopic, setNewStudentTopic] = useState("");
  const [newStudentDate, setNewStudentDate] = useState(""); 

  // State for Edit Student Dialog
  const [editingStudent, setEditingStudent] = useState<ResearchStudent | null>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentEmail, setEditStudentEmail] = useState("");
  const [editStudentTopic, setEditStudentTopic] = useState("");
  const [editStudentDate, setEditStudentDate] = useState(""); 

  const { toast } = useToast();

  useEffect(() => {
    if (authLoading || !staffUser) return;

    const fetchStudents = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const studentsCol = collection(db, "researchStudents");
        const q = query(studentsCol, where("supervisorId", "==", staffUser.uid));
        const studentsSnapshot = await getDocs(q);
        const fetchedStudents = studentsSnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            supervisorId: data.supervisorId,
            supervisorName: data.supervisorName,
            studentName: data.studentName, 
            studentEmail: data.studentEmail, 
            researchTopic: data.researchTopic,
            startDate: data.startDate, 
            status: data.status,
            createdAt: data.createdAt,
          } as ResearchStudent;
        });
        setStudents(fetchedStudents);
      } catch (err) {
        console.error("Error fetching research students:", err);
        setError("Failed to fetch research students. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [staffUser, authLoading]);

  const resetAddForm = () => {
    setNewStudentName("");
    setNewStudentEmail("");
    setNewStudentTopic("");
    setNewStudentDate("");
  };

  const handleAddStudent = async () => {
    if (!newStudentName || !newStudentEmail || !newStudentTopic || !newStudentDate) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all fields for the new student.",
      });
      return;
    }
    if (!staffUser) {
      toast({ variant: "destructive", title: "Error", description: "User not authenticated." });
      return;
    }

    setIsSubmitting(true);
    try {
      const startDateTimestamp = Timestamp.fromDate(new Date(newStudentDate));

      const newStudentData = {
        supervisorId: staffUser.uid,
        supervisorName: staffUser.name || staffUser.displayName || staffUser.email?.split('@')[0] || "Supervisor",
        studentName: newStudentName, 
        studentEmail: newStudentEmail, 
        researchTopic: newStudentTopic,
        startDate: startDateTimestamp, 
        status: "Active",
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "researchStudents"), newStudentData);
      
      const addedStudent: ResearchStudent = {
        id: docRef.id,
        ...newStudentData,
        startDate: newStudentData.startDate, 
        status: newStudentData.status as ResearchStudent["status"],
        createdAt: newStudentData.createdAt, 
      };

      setStudents(prev => [...prev, addedStudent]);
      resetAddForm();
      setIsAddDialogOpen(false);
      toast({
        title: "Student Added",
        description: `${newStudentName} has been added.`,
      });
    } catch (err) {
      console.error("Error adding student:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to add student." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "researchStudents", studentId));
      setStudents(students.filter(student => student.id !== studentId));
      toast({
        title: "Student Removed",
        description: `Student has been removed.`,
      });
    } catch (err) {
      console.error("Error removing student:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to remove student." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (student: ResearchStudent) => {
    setEditingStudent(student);
    setEditStudentName(student.studentName); 
    setEditStudentEmail(student.studentEmail); 
    setEditStudentTopic(student.researchTopic);
    setEditStudentDate(formatDateForInput(student.startDate)); 
    setIsEditDialogOpen(true);
  };

  const handleEditStudent = async () => {
    if (!editingStudent || !editStudentName || !editStudentEmail || !editStudentTopic || !editStudentDate) {
         toast({
            variant: "destructive",
            title: "Missing Information",
            description: "Please fill in all fields to update the student.",
        });
      return;
    }
    setIsSubmitting(true);
    try {
      const startDateTimestamp = Timestamp.fromDate(new Date(editStudentDate));

      const updatedStudentData = {
        studentName: editStudentName, // Changed from name
        studentEmail: editStudentEmail, // Changed from email
        researchTopic: editStudentTopic,
        startDate: startDateTimestamp, 
      };
      await updateDoc(doc(db, "researchStudents", editingStudent.id), updatedStudentData);
      
      setStudents(students.map(s => s.id === editingStudent.id ? { ...s, ...updatedStudentData } : s));
      setEditingStudent(null);
      setIsEditDialogOpen(false);
      toast({
        title: "Student Updated",
        description: `${editStudentName}'s details have been updated.`,
      });
    } catch (err) {
      console.error("Error updating student:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to update student." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg text-foreground">Loading students...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full shadow-lg border-destructive">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-2xl text-destructive">Error</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
          {error.includes("index") && 
            <p className="mt-2 text-sm text-muted-foreground">
              Firestore requires an index for this query. Please check the browser console for a link to create it.
            </p>
          }
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Manage My Research Students</CardTitle>
        </div>
        <CardDescription>Add, view, edit, or remove your supervised research students.</CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mb-6" onClick={() => { resetAddForm(); setIsAddDialogOpen(true); }}>
              <UserPlus className="mr-2 h-4 w-4" /> Add New Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Research Student</DialogTitle>
              <DialogDescription>
                Enter the details of the new research student.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="studentName" className="text-right">Name</Label>
                <Input id="studentName" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className="col-span-3" placeholder="Student's full name" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="studentEmail" className="text-right">Email</Label>
                <Input id="studentEmail" type="email" value={newStudentEmail} onChange={(e) => setNewStudentEmail(e.target.value)} className="col-span-3" placeholder="student@example.com" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="topic" className="text-right">Research Topic</Label>
                <Input id="topic" value={newStudentTopic} onChange={(e) => setNewStudentTopic(e.target.value)} className="col-span-3" placeholder="E.g., AI Ethics" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startDate" className="text-right">Start Date</Label>
                <Input id="startDate" type="date" value={newStudentDate} onChange={(e) => setNewStudentDate(e.target.value)} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" onClick={handleAddStudent} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Student
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <h3 className="text-lg font-semibold mb-4 text-foreground">Current Research Students</h3>
        {students.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Research Topic</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.studentName}</TableCell>
                    <TableCell>{student.studentEmail}</TableCell>
                    <TableCell>{student.researchTopic}</TableCell>
                    <TableCell>{formatDateForInput(student.startDate)}</TableCell> 
                    <TableCell className="text-right space-x-2">
                       <Dialog open={isEditDialogOpen && editingStudent?.id === student.id} onOpenChange={(open) => { if(!open) setEditingStudent(null); setIsEditDialogOpen(open);}}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" onClick={() => openEditModal(student)}>
                                <Edit3 className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                            </Button>
                        </DialogTrigger>
                        {editingStudent && editingStudent.id === student.id && (
                             <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                <DialogTitle>Edit Student: {editingStudent.studentName}</DialogTitle>
                                <DialogDescription>
                                    Update the student's details.
                                </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="editStudentName" className="text-right">Name</Label>
                                        <Input id="editStudentName" value={editStudentName} onChange={(e) => setEditStudentName(e.target.value)} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="editStudentEmail" className="text-right">Email</Label>
                                        <Input id="editStudentEmail" type="email" value={editStudentEmail} onChange={(e) => setEditStudentEmail(e.target.value)} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="editTopic" className="text-right">Research Topic</Label>
                                        <Input id="editTopic" value={editStudentTopic} onChange={(e) => setEditStudentTopic(e.target.value)} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="editStartDate" className="text-right">Start Date</Label>
                                        <Input id="editStartDate" type="date" value={editStudentDate} onChange={(e) => setEditStudentDate(e.target.value)} className="col-span-3" />
                                    </div>
                                </div>
                                <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline" onClick={() => {setEditingStudent(null); setIsEditDialogOpen(false);}} disabled={isSubmitting}>Cancel</Button>
                                </DialogClose>
                                <Button type="submit" onClick={handleEditStudent} disabled={isSubmitting}>
                                     {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                     Save Changes
                                </Button>
                                </DialogFooter>
                            </DialogContent>
                        )}
                       </Dialog>
                      <Button variant="destructive" size="icon" onClick={() => handleRemoveStudent(student.id)} disabled={isSubmitting}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground">You currently have no research students assigned.</p>
        )}
      </CardContent>
    </Card>
  );
}
