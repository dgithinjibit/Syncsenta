import { redirect } from 'next/navigation';

/**
 * `/login` is a compatibility alias for the real sign-in page.
 *
 * It used to be a client stub that bounced to `/signup`, where an anonymous
 * visitor could click a role and mint `userRole`/`userName` cookies with no
 * credentials — those cookies were then read by `/dashboard`, which could never
 * resolve an identity and rendered an unresolved loading skeleton.
 *
 * Sign-in itself lives at `/auth/signin` (`SignInForm`, Supabase password +
 * demo accounts, role home via `getRoleHome()`). The redirect is server-side so
 * there is no flash of an empty card, and `dynamic = 'force-dynamic'` keeps the
 * query string out of any static optimization cache.
 */
export const dynamic = 'force-dynamic';

// Next.js 14 hands `searchParams` to a server page as a plain object; the
// Promise form only arrived in 15, so awaiting it here would be misleading.
export default function LoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const query = new URLSearchParams();
  const next = typeof searchParams?.next === 'string' ? searchParams.next : undefined;
  const error = typeof searchParams?.error === 'string' ? searchParams.error : undefined;
  if (next) query.set('next', next);
  if (error) query.set('error', error);

  const suffix = query.toString();
  redirect(suffix ? `/auth/signin?${suffix}` : '/auth/signin');
}
