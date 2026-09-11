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

/**
 * RoleGate — wraps a route segment and enforces role-based access.
 *
 * The gate waits for BOTH the auth session AND the profile row to finish
 * loading before making any redirect decision. This prevents the race where
 * `loading` becomes false before `fetchProfile` completes, causing every
 * authenticated user to be bounced to /login on first render.
 *
 * Loading sequence (happy path):
 *   1. loading=true, profileLoading=true  → show spinner (no redirect)
 *   2. loading=true, profileLoading=true  → still loading
 *   3. loading=false, profileLoading=false, profile loaded → render children
 *
 * Edge cases handled:
 *   - No session at all        → redirect to /login?next=<pathname>
 *   - Session but no profile   → redirect to /login (broken account state)
 *   - Wrong role               → redirect to user's own home
 *   - profile.role is null/unknown → redirect to /login (safe default)
 */
export function RoleGate({
  allowedRoles,
  children,
}: {
  allowedRoles: AppRole[];
  children: ReactNode;
}) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, profile, loading, profileLoading } = useAuth();

  // Both loading states must settle before we make any decision.
  const isStillLoading = loading || profileLoading;

  useEffect(() => {
    // Never redirect while either loading flag is still true.
    if (isStillLoading) return;

    // Not authenticated at all → send to login.
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    // Authenticated but profile row is missing (broken account / new signup
    // race where the profile hasn't been created yet) → login to resolve.
    if (!profile) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    // Wrong role → send to the user's own home workspace.
    const role = profile.role as AppRole | null;
    if (!role || !allowedRoles.includes(role)) {
      router.replace(role && HOME_BY_ROLE[role] ? HOME_BY_ROLE[role] : '/login');
    }
  }, [allowedRoles, isStillLoading, pathname, profile, router, user]);

  // Show spinner while either loading flag is active, or while the user/profile
  // hasn't resolved yet. This prevents a flash of wrong content.
  if (isStillLoading || !user || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">
        Checking workspace access…
      </main>
    );
  }

  // Wrong role — show nothing while the redirect is in-flight.
  const role = profile.role as AppRole | null;
  if (!role || !allowedRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
}

export function RoleHome({ role }: { role: AppRole }) {
  return <>{HOME_BY_ROLE[role] ?? '/login'}</>;
}
