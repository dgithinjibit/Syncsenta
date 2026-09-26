import { redirect } from 'next/navigation';

/**
 * `/signin` is the Firebase-era sign-in page and is now a redirect.
 *
 * It authenticated against Firebase Auth (which was stripped when the platform
 * moved to Supabase), derived a role by string-matching the email address
 * (`email.includes('teacher') ? 'teacher' : ...`), POSTed that to
 * `/api/set-auth-cookie`, and then navigated non-students to `/dashboard`.
 *
 * Two things were wrong with that beyond the dead Firebase calls. The role came
 * from the email text rather than the database, so any address containing
 * "teacher" or "head" was handed that workspace; and the `/dashboard` it
 * forwarded to could not resolve an identity at all, so it rendered a blank
 * page. Nothing in the app linked here — it was only reachable by URL — so the
 * safest thing is to keep the URL alive and send it to the real sign-in page.
 */
export const dynamic = 'force-dynamic';

// Next.js 14 hands `searchParams` to a server page as a plain object; the
// Promise form only arrived in 15, so awaiting it here would be misleading.
export default function SignInAliasPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const query = new URLSearchParams();
  const next = searchParams?.next;
  if (typeof next === 'string' && next) query.set('next', next);

  const suffix = query.toString();
  redirect(suffix ? `/auth/signin?${suffix}` : '/auth/signin');
}
