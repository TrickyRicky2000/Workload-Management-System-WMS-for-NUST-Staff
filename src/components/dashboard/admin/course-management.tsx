
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookMarked, PlusCircle, Edit, Loader2, AlertTriangle } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/config/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import type { Course } from "@/types";

const departmentOptions = [
  "Department of Software Engineering",
  "Department of Management Sciences",
  "Natural Resource Sciences",
  "Mechanical, Industrial, and Electrical Engineering"
];

export function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const [isAddCourseDialogOpen, setIsAddCourseDialogOpen] = useState(false);
  const [isEditCourseDialogOpen, setIsEditCourseDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for Add Course
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseDepartment, setNewCourseDepartment] = useState("");

  // State for Edit Course
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editCourseCode, setEditCourseCode] = useState("");
  const [editCourseName, setEditCourseName] = useState("");
  const [editCourseDepartment, setEditCourseDepartment] = useState("");


  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoadingCourses(true);
      setError(null);
      try {
        const coursesCol = collection(db, "courses");
        const q = query(coursesCol, orderBy("name", "asc"));
        const coursesSnapshot = await getDocs(q);
        const fetchedCourses = coursesSnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || "N/A",
            courseCode: data.courseCode || "N/A",
            department: data.department || "N/A",
            createdAt: data.createdAt, 
          } as Course;
        });
        setCourses(fetchedCourses);
      } catch (err: any) {
        console.error("Error fetching courses:", err);
        if (err.code === 'failed-precondition' && err.message.includes("index")) {
            setError("Query requires a Firestore index. Please check the browser console for a link to create it or ensure an index exists on 'name' (ascending) for the 'courses' collection.");
        } else {
            setError("Failed to fetch courses. Please try again later.");
        }
      } finally {
        setIsLoadingCourses(false);
      }
    };
    fetchCourses();
  }, [toast]);

  const resetAddCourseForm = () => {
    setNewCourseCode("");
    setNewCourseName("");
    setNewCourseDepartment("");
  };

  const handleAddCourse = async () => {
    if (!newCourseCode || !newCourseName || !newCourseDepartment) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Please fill all required fields." });
      return;
    }
    setIsSubmitting(true);
    try {
      const courseData = {
        courseCode: newCourseCode.toUpperCase(),
        name: newCourseName,
        department: newCourseDepartment,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "courses"), courseData);
      const newCourseForTable: Course = {
        id: docRef.id,
        ...courseData,
        createdAt: new Date() 
      };
      setCourses(prevCourses => [...prevCourses, newCourseForTable].sort((a, b) => a.name.localeCompare(b.name)));
      
      toast({ title: "Course Added", description: `${newCourseName} has been added successfully.` });
      resetAddCourseForm();
      setIsAddCourseDialogOpen(false);
    } catch (error: any) {
      console.error("Error creating course:", error);
      toast({ variant: "destructive", title: "Creation Failed", description: "Failed to add course." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (course: Course) => {
    setEditingCourse(course);
    setEditCourseCode(course.courseCode);
    setEditCourseName(course.name);
    setEditCourseDepartment(course.department || "");
    setIsEditCourseDialogOpen(true);
  };

  const handleUpdateCourse = async () => {
    if (!editingCourse || !editCourseCode || !editCourseName || !editCourseDepartment) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Please fill all required fields for editing." });
      return;
    }
    setIsSubmitting(true);
    try {
      const courseDocRef = doc(db, "courses", editingCourse.id);
      const updatedData = {
        courseCode: editCourseCode.toUpperCase(),
        name: editCourseName,
        department: editCourseDepartment,
        // createdAt is not updated
      };

      await updateDoc(courseDocRef, updatedData);

      setCourses(prevCourses => 
        prevCourses.map(c => 
          c.id === editingCourse.id ? { ...c, ...updatedData } : c
        ).sort((a, b) => a.name.localeCompare(b.name))
      );

      toast({ title: "Course Updated", description: `${editCourseName} has been updated successfully.` });
      setIsEditCourseDialogOpen(false);
      setEditingCourse(null);
    } catch (error: any) {
      console.error("Error updating course:", error);
      toast({ variant: "destructive", title: "Update Failed", description: "Failed to update course details." });
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isLoadingCourses) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg text-foreground">Loading courses...</p>
      </div>
    );
  }

  if (error) {
    return (
       <Card className="w-full shadow-lg border-destructive">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-2xl text-destructive">Error Loading Courses</CardTitle>
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
          <BookMarked className="h-6 w-6 text-primary" />
          <CardTitle className="text-2xl">Course Management</CardTitle>
        </div>
        <CardDescription>Add, view, and manage academic courses offered by the institution.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Add Course Dialog */}
        <Dialog open={isAddCourseDialogOpen} onOpenChange={setIsAddCourseDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mb-6" onClick={() => { resetAddCourseForm(); setIsAddCourseDialogOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Course
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Course</DialogTitle>
              <DialogDescription>
                Enter the details for the new academic course.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newCourseCode" className="text-right">Course Code</Label>
                <Input id="newCourseCode" value={newCourseCode} onChange={(e) => setNewCourseCode(e.target.value.toUpperCase())} className="col-span-3" placeholder="e.g., CSE311S" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newCourseName" className="text-right">Course Name</Label>
                <Input id="newCourseName" value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)} className="col-span-3" placeholder="e.g., Introduction to Programming" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newCourseDepartment" className="text-right">Department</Label>
                <Select value={newCourseDepartment} onValueChange={setNewCourseDepartment}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" onClick={handleAddCourse} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Adding Course..." : "Add Course"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Course Dialog */}
        <Dialog open={isEditCourseDialogOpen} onOpenChange={(open) => { setIsEditCourseDialogOpen(open); if (!open) setEditingCourse(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Course: {editingCourse?.courseCode}</DialogTitle>
              <DialogDescription>
                Update the details for this academic course.
              </DialogDescription>
            </DialogHeader>
            {editingCourse && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editCourseCode" className="text-right">Course Code</Label>
                  <Input id="editCourseCode" value={editCourseCode} onChange={(e) => setEditCourseCode(e.target.value.toUpperCase())} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editCourseName" className="text-right">Course Name</Label>
                  <Input id="editCourseName" value={editCourseName} onChange={(e) => setEditCourseName(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editCourseDepartment" className="text-right">Department</Label>
                  <Select value={editCourseDepartment} onValueChange={setEditCourseDepartment}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentOptions.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline" onClick={() => {setIsEditCourseDialogOpen(false); setEditingCourse(null);}} disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" onClick={handleUpdateCourse} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course Code</TableHead>
                <TableHead>Course Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">{course.courseCode}</TableCell>
                  <TableCell>{course.name}</TableCell>
                  <TableCell>{course.department}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="icon" onClick={() => openEditDialog(course)}>
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit Course</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
         {courses.length === 0 && !isLoadingCourses && <p className="text-muted-foreground text-center mt-4">No courses found. Add a new course to get started.</p>}
      </CardContent>
    </Card>
  );
}


    