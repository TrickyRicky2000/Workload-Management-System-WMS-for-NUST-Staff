
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  UserCog, 
  GraduationCap,
  FileText,
  BookOpenText,
  BookMarked,
  ClipboardEdit, // For Log Workload
  Eye // For Supervisor Review Workloads
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UserRole } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
  isMainDashboardLink?: boolean; 
}

const allNavItems: NavItem[] = [
  // AcademicStaff Routes
  { href: "/dashboard/staff", label: "Staff Dashboard", icon: LayoutDashboard, roles: ["AcademicStaff"], isMainDashboardLink: true },
  { href: "/dashboard/staff/log-workload", label: "Log My Workload", icon: ClipboardEdit, roles: ["AcademicStaff"] },
  { href: "/dashboard/staff/my-workload", label: "My Logged Workloads", icon: BookOpenText, roles: ["AcademicStaff"] },
  { href: "/dashboard/staff/students", label: "My Research Students", icon: GraduationCap, roles: ["AcademicStaff"] },
  
  // Supervisor Routes
  { href: "/dashboard/supervisor", label: "Supervisor Dashboard", icon: LayoutDashboard, roles: ["Supervisor"], isMainDashboardLink: true },
  { href: "/dashboard/supervisor/view-workloads", label: "Review Workloads", icon: Eye, roles: ["Supervisor"] },
  // Add other Supervisor specific links here if needed

  // Admin Routes
  { href: "/dashboard/admin", label: "Admin Dashboard", icon: LayoutDashboard, roles: ["Admin"], isMainDashboardLink: true },
  { href: "/dashboard/admin/users", label: "User Management", icon: UserCog, roles: ["Admin"] },
  { href: "/dashboard/admin/courses", label: "Course Management", icon: BookMarked, roles: ["Admin"] },
  { href: "/dashboard/admin/workloads", label: "Workload Overview", icon: FileText, roles: ["Admin"] },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { role } = useAuth();

  let filteredNavItems: NavItem[];

  if (role) {
    filteredNavItems = allNavItems.filter(item => item.roles.includes(role));
  } else {
    filteredNavItems = [];
  }

  if (!role) {
    return null; 
  }

  function getRolePathSegment(currentRole: UserRole): string {
    if (!currentRole) return '';
    switch (currentRole) {
      case "AcademicStaff":
        return "staff";
      case "Supervisor":
        return "supervisor";
      case "Admin":
        return "admin";
      default:
        return currentRole ? currentRole.toLowerCase() : '';
    }
  }

  return (
    <SidebarMenu>
      {filteredNavItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              isActive={pathname === item.href || (item.href !== `/dashboard/${getRolePathSegment(role)}` && pathname.startsWith(item.href) && !item.isMainDashboardLink) || (item.isMainDashboardLink && pathname === `/dashboard/${getRolePathSegment(role)}`)}
              tooltip={{ children: item.label, side: "right" }}
              className="w-full"
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
