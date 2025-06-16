
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - UniWorkload",
  description: "Manage your university workload.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
