

"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Bot,
  FlaskConical,
  HelpCircle,
  Library,
  Database,
  Palette,
  Briefcase,
  Users,
  Building,
  School,
  Wallet,
  BookUser,
  Megaphone,
  TrendingUp,
  Calendar,
  FileText,
  ClipboardList,
  Target,
  Brain,
  MessageSquare,
} from "lucide-react";
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { useEffect, useState } from "react";
import type { UserRole } from "@/lib/types";

// Client-side function to get user role from cookies
function getClientRole(): UserRole | null {
  if (typeof window === 'undefined') return null;
  
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };
  
  const role = getCookie('userRole') as UserRole;
  return role || null;
}


const teacherNavItems = [
    { href: "/teacher",              icon: LayoutDashboard, label: "Dashboard" },
    { href: "/teacher/scheme-wizard", icon: Calendar,       label: "Schemes of Work" },
    { href: "/teacher/dashboard",    icon: ClipboardList,   label: "Students & Analytics" },
    { href: "/teacher/exams",        icon: FileText,        label: "Exams & Assessments" },
    { href: "/teacher/metta-analytics", icon: Brain,        label: "Learning Analytics" },
    // The routes below resolve to a graceful "Coming Soon" stub via the
    // dynamic /teacher/grade/[grade]/[...slug] handler — no 404s.
    { href: "/teacher/grade/Grade%205/lesson-plans",    icon: FileText,   label: "Lesson Plans" },
    { href: "/teacher/grade/Grade%205/differentiation", icon: Target,     label: "Differentiation" },
    { href: "/teacher/grade/Grade%205/resources",       icon: Library,    label: "Resource Library" },
    { href: "/teacher/grade/Grade%205/communication",   icon: MessageSquare, label: "Communication" },
];

const schoolHeadNavItems = [
    { href: "/head", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/school-staff", icon: Users, label: "Staff" },
    { href: "/dashboard/school-finance", icon: Wallet, label: "Finance" },
];

const countyOfficerNavItems = [
    { href: "/teacher", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/schools", icon: School, label: "Schools" },
    { href: "/dashboard/county-teachers", icon: BookUser, label: "Teachers" },
    { href: "/dashboard/county-comms", icon: Megaphone, label: "Comms" },
    { href: "/dashboard/county-finance", icon: Wallet, label: "Finance" },
    { href: "/dashboard/county-resources", icon: Briefcase, label: "Resources" },
];


export function AppSidebar() {
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    // Guard against SSR
    if (typeof window === 'undefined') return;
    
    const fetchRole = async () => {
         // Use client-side cookie reading only
         const role = getClientRole();
         if (role) {
           setRole(role);
         }
    }
    fetchRole();
  }, []);

  const getNavItems = () => {
    switch (role) {
        case 'teacher':
            return teacherNavItems;
        case 'school_head':
            return schoolHeadNavItems;
        case 'county_officer':
            return countyOfficerNavItems;
        default:
            return []; // Return an empty array if role is not determined yet
    }
  };

  const navItems = getNavItems();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <h2 className="font-headline text-lg font-semibold tracking-tight">SyncSenta</h2>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild tooltip={item.label}>
                <Link href={item.href} prefetch={true}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Guide">
                <Link href="/dashboard/guide" prefetch={true}>
                    <HelpCircle />
                    <span>Guide</span>
                </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
