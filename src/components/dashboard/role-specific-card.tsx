
import type React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface RoleSpecificCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children?: React.ReactNode;
  className?: string;
}

export function RoleSpecificCard({ title, description, icon: Icon, children, className }: RoleSpecificCardProps) {
  return (
    <Card className={`shadow-lg hover:shadow-xl transition-shadow duration-300 ${className}`}>
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className="p-3 rounded-md bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );
}
