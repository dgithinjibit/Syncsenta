import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';
import { z } from 'zod';
import type { UserRole } from '@/lib/types';

/**
 * Trust surface (consent, safety reports, data requests, school controls).
 *
 * Two things were true of the previous implementation and are now corrected:
 *
 * 1. Identity came from `userRole` / `userEmail` / `userName` cookies. Those are
 *    Firebase-era leftovers that nothing in the Supabase auth flow writes any
 *    more (the endpoint that minted them, `/api/set-auth-cookie`, has been
 *    deleted), so every request was rejected as unauthenticated while the pages
 *    still looked functional. Identity is now read from the real Supabase
 *    session, through the RLS-enforcing route-handler client — deliberately NOT
 *    `getSupabaseServerClient()`, which carries the service-role key, bypasses
 *    RLS, and reports a null user.
 *
 * 2. Writes went to Firebase Firestore behind `TRUST_BACKEND_ENABLED`, a flag
 *    that exists nowhere in `.env.example` or the deployed config, so the branch
 *    was unreachable. Leaving it in place meant that switching it on would have
 *    started storing children's consent records in a database the product no
 *    longer treats as its source of truth, with no reviewed access policy. That
 *    branch is gone: `persistTrustRecord` now says plainly that nothing was
 *    stored. Durable trust records need Supabase tables plus RLS policies, which
 *    is a migration decision, not a bug fix — see AGENTS.md "Current State".
 */

export const trustRequestSchema = z.object({
  category: z.enum(['support', 'privacy', 'deletion', 'safety']),
  summary: z.string().trim().min(10).max(4000),
  requesterEmail: z.string().trim().email().max(320).optional(),
  schoolId: z.string().trim().min(1).max(120).optional(),
  subjectId: z.string().trim().min(1).max(120).optional(),
  urgent: z.boolean().default(false),
});

export const consentSchema = z.object({
  childId: z.string().trim().min(1).max(120),
  schoolId: z.string().trim().min(1).max(120).optional(),
  consentVersion: z.string().trim().min(1).max(80),
  purposes: z.array(z.enum(['learning', 'voice', 'communications'])).min(1),
  granted: z.boolean(),
});

export const dataRequestSchema = z.object({
  type: z.enum(['access', 'correction', 'export', 'restriction', 'deletion']),
  subjectId: z.string().trim().min(1).max(120),
  schoolId: z.string().trim().min(1).max(120).optional(),
  details: z.string().trim().max(2000).optional(),
});

/**
 * Roles that may act on the trust surface.
 *
 * `head` and `admin` are not in the `UserRole` union, but they are what
 * `profiles.role` actually stores for those accounts (the signup role picker
 * sends `school_head` → `head`). `getRoleHome()` accepts both spellings, so the
 * trust guards must too — otherwise a headteacher silently fails every
 * consent, school-control and data-request check.
 */
export type TrustActorRole = UserRole | 'head' | 'admin';

export const TRUST_ACTOR_ROLES = [
  'student',
  'teacher',
  'parent',
  'head',
  'admin',
  'school_head',
  'school_admin',
  'county_officer',
  'national_admin',
] as const satisfies readonly TrustActorRole[];

const TRUST_ACTOR_ROLE_SET: ReadonlySet<string> = new Set<string>(TRUST_ACTOR_ROLES);

export function isTrustActorRole(role: string | null | undefined): role is TrustActorRole {
  return !!role && TRUST_ACTOR_ROLE_SET.has(role);
}

export type BackendActor = {
  id: string;
  name?: string;
  email?: string;
  role: TrustActorRole;
};

/**
 * Resolve the calling user from their Supabase session, or `null` when there is
 * no session or their profile carries no usable role. Callers must treat `null`
 * as "unauthenticated", never as "demo".
 */
export async function getBackendActor(): Promise<BackendActor | null> {
  const supabase = await createSupabaseRouteHandlerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>();

  const role = profile?.role;
  if (!isTrustActorRole(role)) return null;

  return {
    id: user.id,
    email: user.email ?? undefined,
    role,
  };
}

export function canManageConsent(actor: BackendActor) {
  return ['parent', 'teacher', 'head', 'school_head', 'admin', 'school_admin', 'national_admin'].includes(actor.role);
}

export function canManageSchool(actor: BackendActor) {
  return ['school_head', 'school_admin', 'county_officer', 'national_admin', 'head', 'admin'].includes(actor.role);
}

export function canManageSubjectData(actor: BackendActor, subjectId: string) {
  return (
    actor.role === 'parent'
    || actor.role === 'school_head'
    || actor.role === 'head'
    || actor.role === 'school_admin'
    || actor.role === 'admin'
    || actor.role === 'national_admin'
    || actor.id === subjectId
  );
}

export type TrustRecordMode = 'demo';

/**
 * Acknowledge a trust record without storing it anywhere.
 *
 * There is currently no durable, correctly-governed home for these records, so
 * the only honest result is `persisted: false`. The public pages already branch
 * on `mode === 'demo'` and tell the visitor that no real record was created;
 * keep that copy accurate by never returning `persisted: true` until a Supabase
 * table with RLS policies exists.
 */
export async function persistTrustRecord(
  collectionName: string,
  payload: Record<string, unknown>,
): Promise<{ persisted: false; mode: TrustRecordMode; id: string }> {
  // Log the shape only. Consent text and safety-report summaries can name a
  // child, so the payload itself must never reach the logs.
  console.info('[trust] demo-only acknowledgement (nothing persisted)', {
    collectionName,
    fieldCount: Object.keys(payload).length,
  });

  return { persisted: false, mode: 'demo', id: `demo-${crypto.randomUUID()}` };
}
