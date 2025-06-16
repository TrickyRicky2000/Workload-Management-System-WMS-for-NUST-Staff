
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserCog, PlusCircle, Edit, Trash, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auth, db } from "@/config/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDocs, collection, query, orderBy, updateDoc, deleteDoc } from "firebase/firestore";

interface User {
  id: string; 
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  status: "Active" | "Inactive";
}

const departmentOptions = [
  "Department of Software Engineering",
  "Department of Management Sciences",
  "Natural Resource Sciences",
  "Mechanical, Industrial, and Electrical Engineering"
];

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const { toast } = useToast();

  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>(null);
  const [newUserDepartment, setNewUserDepartment] = useState("");

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserDepartment, setEditUserDepartment] = useState("");
  const [editUserRole, setEditUserRole] = useState<UserRole>(null);


  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const usersCol = collection(db, "staff");
        const q = query(usersCol, orderBy("name", "asc"));
        const usersSnapshot = await getDocs(q);
        const fetchedUsers = usersSnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || "N/A",
            email: data.email || "N/A",
            role: data.role as UserRole || null,
            department: data.department || "N/A",
            status: "Active", 
          } as User;
        }).filter(user => user.role !== null);
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch users." });
         if ((error as any).code === 'failed-precondition') {
          toast({
            variant: "destructive",
            title: "Firestore Index Required",
            description: "An index is required for querying users. Please check the console for a link to create it or create an index on 'name' (asc) for the 'staff' collection.",
            duration: 10000,
          });
        }
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [toast]);


  const resetAddUserForm = () => {
    setNewUserName("");
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserRole(null);
    setNewUserDepartment("");
  };

  const handleAddUser = async () => {
    if (!newUserName || !newUserEmail || !newUserPassword || !newUserRole || (newUserRole !== 'Admin' && !newUserDepartment) ) {
        let message = "Please fill all required fields.";
        if (newUserRole !== 'Admin' && !newUserDepartment) {
            message = "Department is required for non-Admin roles.";
        }
        toast({ variant: "destructive", title: "Missing Fields", description: message });
        return;
    }
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, newUserEmail, newUserPassword);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        const userData: any = {
          name: newUserName,
          email: newUserEmail,
          role: newUserRole,
          createdAt: serverTimestamp(),
        };
        if (newUserRole !== 'Admin') {
            userData.department = newUserDepartment;
        } else {
            userData.department = ""; 
        }

        await setDoc(doc(db, "staff", firebaseUser.uid), userData);

        const newUserForTable: User = {
          id: firebaseUser.uid,
          name: newUserName,
          email: newUserEmail,
          role: newUserRole,
          department: newUserRole !== 'Admin' ? newUserDepartment : undefined,
          status: "Active", 
        };
        setUsers(prevUsers => [...prevUsers, newUserForTable].sort((a, b) => a.name.localeCompare(b.name)));
        
        toast({ title: "User Created", description: `${newUserName} has been added successfully.` });
        resetAddUserForm();
        setIsAddUserDialogOpen(false);
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      let errorMessage = "Failed to create user. Please try again.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email address is already in use.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "The password is too weak. It must be at least 6 characters.";
      }
      toast({ variant: "destructive", title: "Creation Failed", description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserDepartment(user.department || "");
    setEditUserRole(user.role);
    setIsEditUserDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !editUserName || !editUserRole || (editUserRole !== 'Admin' && !editUserDepartment) ) {
        let message = "Please fill all required fields for editing.";
        if (editUserRole !== 'Admin' && !editUserDepartment) {
            message = "Department is required for non-Admin roles being edited.";
        }
      toast({ variant: "destructive", title: "Missing Fields", description: message });
      return;
    }
    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, "staff", editingUser.id);
      const updatedData: any = {
        name: editUserName,
        role: editUserRole,
      };
      if (editUserRole !== 'Admin') {
        updatedData.department = editUserDepartment;
      } else {
        updatedData.department = ""; 
      }

      await updateDoc(userDocRef, updatedData);

      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === editingUser.id ? { ...u, ...updatedData, department: updatedData.department } : u
        ).sort((a, b) => a.name.localeCompare(b.name))
      );

      toast({ title: "User Updated", description: `${editUserName}'s details have been updated.` });
      setIsEditUserDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
      toast({ variant: "destructive", title: "Update Failed", description: "Failed to update user details." });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleDeleteUser = async (userId: string, userName: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete ${userName}? This action is currently a mock and will only remove the user from this list view. The Auth user and Firestore document will NOT be deleted from the backend.`);
    if (confirmed) {
      setUsers(users.filter(u => u.id !== userId));
      toast({ title: "User (Mock) Deleted", description: `User ${userName} has been removed from the list. Auth user and Firestore document still exist.` });
    }
  };


  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case "Admin": return "destructive";
      case "Supervisor": return "default"; // Changed from HOD
      case "AcademicStaff": return "secondary";
      default: return "outline";
    }
  };

  if (isLoadingUsers) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg text-foreground">Loading users...</p>
      </div>
    );
  }


  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserCog className="h-6 w-6 text-primary" />
          <CardTitle className="text-2xl">User Accounts Management</CardTitle>
        </div>
        <CardDescription>View, add, edit, or deactivate user accounts and manage their roles.</CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mb-6" onClick={() => { resetAddUserForm(); setIsAddUserDialogOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Enter the details for the new user account.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newUserName" className="text-right">Full Name</Label>
                <Input id="newUserName" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="col-span-3" placeholder="e.g., John Doe" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newUserEmail" className="text-right">Email</Label>
                <Input id="newUserEmail" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="col-span-3" placeholder="e.g., john.doe@nust.na" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newUserPassword" className="text-right">Password</Label>
                <Input id="newUserPassword" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} className="col-span-3" placeholder="Min. 6 characters" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newUserRole" className="text-right">Role</Label>
                <Select 
                  value={newUserRole || ""} 
                  onValueChange={(value) => {
                    const role = value as UserRole;
                    setNewUserRole(role);
                    if (role === 'Admin') {
                      setNewUserDepartment(""); 
                    }
                  }}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AcademicStaff">Academic Staff</SelectItem>
                    <SelectItem value="Supervisor">Supervisor</SelectItem> {/* Changed from HOD */}
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newUserDepartment" className="text-right">Department</Label>
                <Select 
                  value={newUserDepartment} 
                  onValueChange={setNewUserDepartment}
                  disabled={newUserRole === 'Admin'}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={
                      newUserRole === 'Admin' ? "N/A for Admin role" : "Select a department"
                    } />
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
              <Button type="submit" onClick={handleAddUser} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Creating User..." : "Create User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditUserDialogOpen} onOpenChange={(open) => { setIsEditUserDialogOpen(open); if (!open) setEditingUser(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit User: {editingUser?.name}</DialogTitle>
              <DialogDescription>
                Update the user's name, department, and role. Email and password cannot be changed here.
              </DialogDescription>
            </DialogHeader>
            {editingUser && (
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editUserName" className="text-right">Full Name</Label>
                    <Input id="editUserName" value={editUserName} onChange={(e) => setEditUserName(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editUserEmail" className="text-right">Email</Label>
                    <Input id="editUserEmail" type="email" value={editingUser?.email || ""} className="col-span-3" disabled readOnly />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editUserRole" className="text-right">Role</Label>
                    <Select 
                      value={editUserRole || ""} 
                      onValueChange={(value) => {
                        const role = value as UserRole;
                        setEditUserRole(role);
                        if (role === 'Admin') {
                          setEditUserDepartment("");
                        }
                      }}
                    >
                      <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="AcademicStaff">Academic Staff</SelectItem>
                          <SelectItem value="Supervisor">Supervisor</SelectItem> {/* Changed from HOD */}
                          <SelectItem value="Admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editUserDepartment" className="text-right">Department</Label>
                    <Select 
                      value={editUserDepartment} 
                      onValueChange={setEditUserDepartment}
                      disabled={editUserRole === 'Admin'}
                    >
                      <SelectTrigger className="col-span-3">
                          <SelectValue placeholder={
                            editUserRole === 'Admin' ? "N/A for Admin role" : "Select a department"
                          } />
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
                <Button type="button" variant="outline" onClick={() => { setIsEditUserDialogOpen(false); setEditingUser(null);}} disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" onClick={handleUpdateUser} disabled={isSubmitting}>
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
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role === 'Admin' ? 'N/A (System-Wide)' : (user.department || "N/A")}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                     <Badge variant={user.status === "Active" ? "default" : "outline"} className={user.status === "Active" ? "bg-green-500/20 text-green-700 border-green-400" : "bg-red-500/20 text-red-700 border-red-400"}>
                        {user.status}
                     </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="icon" onClick={() => openEditDialog(user)}>
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit User</span>
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteUser(user.id, user.name)}>
                      <Trash className="h-4 w-4" />
                       <span className="sr-only">Delete</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
         {users.length === 0 && !isLoadingUsers && <p className="text-muted-foreground text-center mt-4">No users found. Add a new user to get started.</p>}
      </CardContent>
    </Card>
  );
}
