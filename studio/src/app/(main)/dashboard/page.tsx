import { redirect } from 'next/navigation';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';
import { getRoleHome } from '@/lib/auth/role-home';

/**
 * Legacy `/dashboard` index → the visitor's real role home.
 *
 * This page used to be a client component that resolved a role through
 * `getServerUser()`, which reads a `userEmail` cookie. That cookie was written
 * only by the Firebase-era `signupUser()` server action, so under Supabase it
 * was never present: the role stayed `null`, the switch fell to its `default:`
 * branch, and that branch rendered `<DashboardSkeleton />` even though
 * `loading` was already `false`. Every visitor — including a signed-in
 * student — saw a permanently blank page, and because `/dashboard` was not in
 * the middleware's protected list, anonymous visitors saw it too.
 *
 * Identity now comes from the Supabase session and `profiles.role`, the same
 * source of truth `SignInForm` and `/api/auth/demo-login` use, and the result
 * is a redirect rather than a placeholder. `getRoleHome()` deliberately has no
 * `/dashboard` entry, so this page can no longer be a landing destination — it
 * only forwards.
 *
 * The `/dashboard/**` sub-routes (tools, learning-lab, reports, county and
 * school screens) are untouched pending the feature-collision audit; this
 * change only stops the index from swallowing people.
 */
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createSupabaseRouteHandlerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>();

  // An authenticated account with no profile row has no workspace to land in;
  // send it to sign-in rather than inventing a surface to show.
  redirect(getRoleHome(profile?.role));
}
