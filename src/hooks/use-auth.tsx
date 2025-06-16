
"use client";

import type React from 'react';
import { useState, useEffect, useContext, createContext }
  from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  AuthError
} from 'firebase/auth';
import { auth, db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { UserRole, AppUser } from '@/types';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  role: UserRole; 
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const fetchAppUserDetailsFromFirestore = async (uid: string): Promise<Partial<AppUser>> => {
  console.log(`[Auth] Fetching details for UID: ${uid}`);
  try {
    const userDocRef = doc(db, 'staff', uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      console.log(`[Auth] Document data for UID ${uid}:`, data);
      
      let firestoreRole = data?.role as UserRole | "HOD"; // Allow "HOD" temporarily
      const department = data?.department as string;
      const name = data?.name as string;
      let effectiveRole: UserRole = null;

      if (firestoreRole === "HOD") {
        console.warn(`[Auth] Mapping Firestore role "HOD" to "AcademicStaff" for UID ${uid} as per system definition. Please consider updating this user's role in your Firestore database to "AcademicStaff" or another appropriate defined role if their responsibilities differ from standard academic staff and they are not supervisors.`);
        effectiveRole = "AcademicStaff";
      } else {
        effectiveRole = firestoreRole as UserRole;
      }

      const validRoles: UserRole[] = ["Supervisor", "AcademicStaff", "Admin"];
      if (effectiveRole && !validRoles.includes(effectiveRole)) {
        console.warn(`[Auth] Fetched role "${effectiveRole}" for UID ${uid} is not a valid UserRole type. Expected one of: ${validRoles.join(', ')}. It must be an exact match (case-sensitive). Setting role to null.`);
        return { role: null, department, name };
      }
      if (!effectiveRole) {
         console.warn(`[Auth] Role field not found, is empty, or is invalid in document for UID ${uid}. Data:`, data);
         return { role: null, department, name };
      }

      console.log(`[Auth] Successfully fetched effective role "${effectiveRole}", department "${department}", name "${name}" for UID ${uid}.`);
      return { role: effectiveRole, department, name };
    } else {
      console.warn(`[Auth] User document not found in 'staff' collection for UID: ${uid}`);
    }
  } catch (error) {
    console.error(`[Auth] Error fetching user details from Firestore for UID ${uid}:`, error);
  }
  return { role: null, department: undefined, name: undefined };
};

const getRolePathSegment = (role: UserRole): string => {
  if (!role) return '';
  switch (role) {
    case "AcademicStaff":
      return "staff";
    case "Supervisor":
      return "supervisor";
    case "Admin":
      return "admin";
    default:
      console.warn(`[Auth] Unknown role for path generation: ${role}`);
      return role ? role.toLowerCase() : ''; 
  }
};

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(null); 
  const router = useRouter();
  const pathname = usePathname(); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => { 
      if (firebaseUser) {
        console.log("[Auth] User authenticated:", firebaseUser.uid);
        const userDetails = await fetchAppUserDetailsFromFirestore(firebaseUser.uid);
        const appUser: AppUser = { 
          ...firebaseUser, 
          role: userDetails.role || null, 
          department: userDetails.department,
          name: userDetails.name 
        };
        setUser(appUser);
        setRole(appUser.role); 
        
        if (pathname === '/login' || pathname === '/') { 
           const pathSegment = getRolePathSegment(appUser.role);
           router.replace(appUser.role ? `/dashboard/${pathSegment}` : '/dashboard');
        }
      } else {
        console.log("[Auth] No user authenticated.");
        setUser(null);
        setRole(null);
         
        if (pathname !== '/login' && !pathname.startsWith('/_next/')) { 
           router.replace('/login');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathname, router]); 

  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      if (firebaseUser) {
        console.log("[Auth] Login successful, UID:", firebaseUser.uid);
        const userDetails = await fetchAppUserDetailsFromFirestore(firebaseUser.uid); 
        const appUser: AppUser = { 
            ...firebaseUser, 
            role: userDetails.role || null,
            department: userDetails.department,
            name: userDetails.name
        };
        setUser(appUser);
        setRole(appUser.role); 
        const pathSegment = getRolePathSegment(appUser.role);
        router.replace(appUser.role ? `/dashboard/${pathSegment}` : '/dashboard');
      }
    } catch (error) {
      const authError = error as AuthError;
      console.error("Login failed:", authError.message);
      throw authError; 
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setRole(null);
      router.replace('/login');
      console.log("[Auth] Logout successful.");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { getRolePathSegment };

