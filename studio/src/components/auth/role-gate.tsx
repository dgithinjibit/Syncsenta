'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getRoleHome } from '@/lib/auth/role-home';

export type AppRole = 'student' | 'teacher' | 'parent' | 'admin' | 'head';

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
 *   - No session at all        → /auth/signin?next=<pathname>, so the visitor
 *                                comes back to the page they were denied
 *   - Session but no profile   → /auth/onboarding (the profile is the missing
 *                                part; a sign-in form cannot create it)
 *   - Wrong role               → that person's own home, from `getRoleHome()`
 *   - role null/unknown        → /auth/onboarding
 *
 * The role->home decision used to be duplicated here as `HOME_BY_ROLE`, which
 * drifted from `ROLE_HOME`: it had no `county_officer` entry, so a county
 * officer who opened /teacher was redirected to '/login' — a page they could
 * never leave, because /login forwards anyone who is already signed in. There
 * is now one map, in `lib/auth/role-home.ts`, and this gate reads it.
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

    // Not authenticated at all → send to the real sign-in page.
    if (!user) {
      router.replace(`/auth/signin?next=${encodeURIComponent(pathname)}`);
      return;
    }

    // Authenticated but no readable profile row: nothing a sign-in form can
    // fix. Profile completion is the screen that can create the row.
    if (!profile) {
      router.replace('/auth/onboarding');
      return;
    }

    // Wrong role → send to the user's own home workspace.
    const role = typeof profile.role === 'string' ? profile.role : null;
    if (!role || !allowedRoles.includes(role as AppRole)) {
      router.replace(getRoleHome(role, '/auth/onboarding'));
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
  const role = typeof profile.role === 'string' ? profile.role : null;
  if (!role || !allowedRoles.includes(role as AppRole)) {
    return null;
  }

  return <>{children}</>;
}
