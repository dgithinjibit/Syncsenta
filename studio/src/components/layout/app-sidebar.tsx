

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
import { useAuth } from "@/hooks/use-auth";
import { getRoleHome } from "@/lib/auth/role-home";


const teacherNavItems = [
    { href: "/dashboard/tools", icon: Bot, label: "Teacher Tools" },
    { href: "/dashboard/learning-lab", icon: FlaskConical, label: "Learning Lab" },
    { href: "/dashboard/reports", icon: Library, label: "My Library" },
    { href: "/dashboard/improvements", icon: TrendingUp, label: "Improvements" },
];

const schoolHeadNavItems = [
    { href: "/dashboard/reports", icon: Megaphone, label: "Announcements" },
    { href: "/dashboard/school-staff", icon: Users, label: "Staff" },
    { href: "/dashboard/school-finance", icon: Wallet, label: "Finance" },
];

const countyOfficerNavItems = [
    { href: "/dashboard/curriculum", icon: Database, label: "Curriculum" },
    { href: "/dashboard/schools", icon: School, label: "Schools" },
    { href: "/dashboard/county-teachers", icon: BookUser, label: "Teachers" },
    { href: "/dashboard/county-comms", icon: Megaphone, label: "Comms" },
    { href: "/dashboard/county-resources", icon: Briefcase, label: "Resources" },
];

/**
 * Which nav set a `profiles.role` value gets, in the spellings that can actually
 * reach this component.
 *
 * The deployed `profiles.role` column allows `student | teacher | parent | admin
 * | head`, and `/signup` stores a school head as `head`. This switch used to test
 * for `school_head` and `county_officer` — spellings from the wider frontend
 * `UserRole` union that no Supabase row can hold — so a signed-in head fell
 * through to `default:` and the legacy dashboard rendered with no navigation at
 * all, the same blank-shell failure this branch has been removing everywhere
 * else. Both spellings are accepted now: `getRoleHome()` already treats them as
 * aliases, so a legacy or mock row using either still lands somewhere.
 */
type ShellGroup = 'teacher' | 'head' | 'county';

function shellGroupForRole(role: string | null | undefined): ShellGroup | null {
    switch (role) {
        case 'teacher':
            return 'teacher';
        case 'head':
        case 'admin':
        case 'school_head':
        case 'school_admin':
        case 'national_admin':
            return 'head';
        case 'county_officer':
            return 'county';
        default:
            // No nav for a session that is still loading, and none for roles
            // whose workspaces live outside this shell (/student, /parent).
            // Those visitors should not be in /dashboard at all: the index page
            // redirects them to their role home.
            return null;
    }
}

const NAV_ITEMS_BY_GROUP: Record<ShellGroup, typeof teacherNavItems> = {
    teacher: teacherNavItems,
    head: schoolHeadNavItems,
    county: countyOfficerNavItems,
};


export function AppSidebar() {
  // Role comes from the Supabase session and its `profiles` row, the same
  // source the sign-in form and the route redirects use. This component used
  // to call the `getServerUser()` server action, which reconstructs an
  // identity from `userEmail`/`userRole` cookies that nothing writes any more;
  // it always returned null, so the switch below fell through to an empty nav
  // and the legacy dashboard rendered with no navigation at all.
  const { profile } = useAuth();
  const group = shellGroupForRole(profile?.role);

  // "Home" points at `getRoleHome()` for the signed-in role, not at
  // `/dashboard`. That index now redirects every role to the same place, so the
  // old link was a detour through a redirect — and for anyone whose role maps
  // outside this shell it was a way to leave it without meaning to.
  const navItems = group
    ? [{ href: getRoleHome(profile?.role), icon: LayoutDashboard, label: "Home" }, ...NAV_ITEMS_BY_GROUP[group]]
    : [];

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
