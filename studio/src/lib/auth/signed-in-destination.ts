/**
 * Where an already-authenticated visitor belongs.
 *
 * The app had three different answers to "someone with a live session arrives
 * at a page meant for people who need one":
 *
 *   - `/` (the landing page) showed them the marketing page and a "Sign In"
 *     button, so they had to enter credentials they had already entered;
 *   - `/signup` showed them an anonymous role picker that signs a *different*
 *     demo account in over theirs;
 *   - `/dashboard` sent them to `/login` when their role was unmapped, which
 *     is `/auth/signin`, i.e. the form they had just left.
 *
 * This helper is the single answer: their `?next` target if one was requested
 * and it is safe, otherwise the workspace their `profiles.role` maps to,
 * otherwise profile completion. `null` means "not signed in, render the page".
 *
 * Anonymous visitors cost nothing: `auth.getUser()` without a session cookie
 * returns locally, with no network call.
 */
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';
import { getRoleHome } from '@/lib/auth/role-home';
import { safeRedirectTarget } from '@/lib/auth/redirect-target';

export async function getSignedInDestination(
  next?: string | string[] | null,
): Promise<string | null> {
  let supabase;
  try {
    supabase = await createSupabaseRouteHandlerClient();
  } catch {
    // `cookies()` throws when called outside a request that can read them.
    // A page that cannot resolve a session should show itself, not 500.
    return null;
  }

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Missing NEXT_PUBLIC_* values leave the placeholder client here, and it
    // cannot reach a real auth server. Treat that as signed out.
    return null;
  }

  if (!user) return null;

  const target = safeRedirectTarget(next);
  if (target) return target;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>();

  return getRoleHome(profile?.role, '/auth/onboarding');
}
