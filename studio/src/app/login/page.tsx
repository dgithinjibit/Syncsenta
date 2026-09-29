import { redirect } from 'next/navigation';
import { getSignedInDestination } from '@/lib/auth/signed-in-destination';

/**
 * `/login` is a compatibility alias for the real sign-in page.
 *
 * It used to be a client stub that bounced to an anonymous role picker, where a
 * visitor could click a role and mint `userRole`/`userName` cookies with no
 * credentials — those cookies were then read by `/dashboard`, which could never
 * resolve an identity and rendered an unresolved loading skeleton.
 *
 * Sign-in itself lives at `/auth/signin` (`SignInForm`, Supabase password +
 * demo accounts, role home via `getRoleHome()`). The redirect is server-side so
 * there is no flash of an empty card, and `dynamic = 'force-dynamic'` keeps the
 * query string out of any static optimization cache.
 *
 * A visitor who already has a session does not get the form: `/login` is where
 * `RoleGate` and older links send people, and showing a credentials form to
 * someone who is already signed in is the "press again" step this app is
 * removing. They go to the `next` target they asked for, or their own home.
 */
export const dynamic = 'force-dynamic';

// Next.js 14 hands `searchParams` to a server page as a plain object; the
// Promise form only arrived in 15, so awaiting it here would be misleading.
export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const next = typeof searchParams?.next === 'string' ? searchParams.next : undefined;
  const destination = await getSignedInDestination(next);
  if (destination) redirect(destination);

  const query = new URLSearchParams();
  if (next) query.set('next', next);
  const error = typeof searchParams?.error === 'string' ? searchParams.error : undefined;
  if (error) query.set('error', error);

  const suffix = query.toString();
  redirect(suffix ? `/auth/signin?${suffix}` : '/auth/signin');
}
