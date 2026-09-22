

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
  TrendingUp
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
import { getServerUser } from "@/lib/auth";
import type { UserRole } from "@/lib/types";
import { useEffect, useState } from "react";


const teacherNavItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/tools", icon: Bot, label: "Teacher Tools" },
    { href: "/dashboard/learning-lab", icon: FlaskConical, label: "Learning Lab" },
    { href: "/dashboard/reports", icon: Library, label: "My Library" },
    { href: "/dashboard/improvements", icon: TrendingUp, label: "Improvements" },
];

const schoolHeadNavItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/reports", icon: Megaphone, label: "Announcements" },
    { href: "/dashboard/school-staff", icon: Users, label: "Staff" },
    { href: "/dashboard/school-finance", icon: Wallet, label: "Finance" },
];

const countyOfficerNavItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/curriculum", icon: Database, label: "Curriculum" },
    { href: "/dashboard/schools", icon: School, label: "Schools" },
    { href: "/dashboard/county-teachers", icon: BookUser, label: "Teachers" },
    { href: "/dashboard/county-comms", icon: Megaphone, label: "Comms" },
    { href: "/dashboard/county-resources", icon: Briefcase, label: "Resources" },
];


export function AppSidebar() {
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
         const user = await getServerUser();
         setRole(user?.role as UserRole);
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
