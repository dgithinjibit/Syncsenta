'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export type AppRole = 'student' | 'teacher' | 'parent' | 'admin';

const HOME_BY_ROLE: Record<AppRole, string> = {
  student: '/student',
  teacher: '/teacher',
  parent: '/parent',
  admin: '/head',
};

export function RoleGate({ allowedRoles, children }: { allowedRoles: AppRole[]; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!allowedRoles.includes(profile.role as AppRole)) {
      router.replace(HOME_BY_ROLE[profile.role as AppRole] ?? '/login');
    }
  }, [allowedRoles, loading, pathname, profile, router, user]);

  if (loading || !user || !profile || !allowedRoles.includes(profile.role as AppRole)) {
    return <main className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">Checking workspace access…</main>;
  }

  return <>{children}</>;
}

export function RoleHome({ role }: { role: AppRole }) {
  return <>{HOME_BY_ROLE[role]}</>;
}
