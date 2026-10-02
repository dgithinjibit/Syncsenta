import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';
import { touchLastSeen } from '@/lib/presence/touch-presence';

/**
 * API Route: /api/presence/touch
 *
 * Stamps the caller's own `profiles.last_seen_at` so the teacher roster's
 * online/idle chip reflects reality. Called fire-and-forget by the learner
 * home on mount; nothing in the UI blocks on it.
 *
 * The user id always comes from `auth.getUser()` — the body is not read at
 * all, so there is no way to ask the server to stamp someone else. RLS
 * `profiles_update_own` backs that up. Handler-only export, per the Next
 * route contract that `route-exports.test.ts` guards (spoon 13 lost a
 * Vercel build to a helper left in a route module).
 */

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await touchLastSeen(supabase as any, user.id);
    if (!result.ok) {
      // Presence is cosmetic; report honestly but never 500 the learner home.
      return NextResponse.json({ success: false, reason: result.message }, { status: 200 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/presence/touch:', error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
