/**
 * The single role -> workspace map.
 *
 * Every redirect that puts a signed-in visitor somewhere uses this file. It
 * exists because two other copies of the same decision used to disagree:
 * `components/auth/role-gate.tsx` kept its own `HOME_BY_ROLE`, and
 * `app/(main)/dashboard/page.tsx` hardcoded what to do when this map answered
 * `/login`. Divergence between those copies is how a signed-in learner ended up
 * bounced back to the sign-in form they had just left.
 *
 * `county_officer` maps to `/teacher` deliberately: there is no county
 * workspace outside the legacy `/dashboard/**` shell, so the teacher home is
 * the closest real surface. It is not the same thing as a teacher role, and
 * `app-sidebar.tsx` still renders the county nav for that role.
 */
export const ROLE_HOME: Record<string, string> = {
  student: '/student',
  teacher: '/teacher',
  parent: '/parent',
  admin: '/head',
  head: '/head',
  school_head: '/head',
  school_admin: '/head',
  national_admin: '/head',
  county_officer: '/teacher',
};

/**
 * Where to put a visitor we cannot place.
 *
 * `/login` is correct when nobody is authenticated — it is an alias for
 * `/auth/signin`, which is where the credentials form lives.
 *
 * It is the wrong answer for someone who is already signed in, because the form
 * they land on cannot tell them anything: their session is fine, their
 * `profiles` row is not (missing, or a role string this map does not place).
 * Callers in that position pass `'/auth/onboarding'` — profile completion is the
 * one screen that can finish the job — rather than relying on the default.
 */

export function getRoleHome(
  role: string | null | undefined,
  fallback: string = '/login',
): string {
  return (role && ROLE_HOME[role]) || fallback;
}
