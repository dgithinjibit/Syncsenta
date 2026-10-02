/**
 * Learner presence: stamp `profiles.last_seen_at` with the server's current
 * time for the authenticated user only.
 *
 * Why this exists (2026-10-03, submission night): the teacher roster at
 * `/teacher` derives online/idle/offline from `profiles.last_seen_at`
 * (`roster-shaping.ts`, 5-minute online window), but nothing in the deployed
 * studio ever wrote that column. Every learner was frozen at its seeded
 * value, so the roster could only ever show "offline" — and the roadmap line
 * "a learner login during the video will flip them to online" was false.
 * This is the write that makes the chip mean what it says.
 *
 * Security: `userId` must come from `auth.getUser()` at the call site, never
 * from the request body — same rule as `/api/teacher/roster`. RLS
 * `profiles_update_own` (`id = auth.uid()`) is the second defense; a caller
 * cannot stamp someone else's row even if this function were misused.
 */

// The route-handler client's generated types do not cover hand-written chains
// here; the roster route set the same precedent (`supabase as any`). Call the
// seam with any Supabase client exposing `.from()`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbClient = { from: (table: string) => any };

export type TouchResult = { ok: true } | { ok: false; message?: string };

export async function touchLastSeen(
  db: DbClient,
  userId: string,
  now: Date = new Date(),
): Promise<TouchResult> {
  if (!userId) {
    // Unscoped write guard: no id means no update, not an update-all.
    return { ok: false, message: 'missing user id' };
  }
  const { error } = await db
    .from('profiles')
    .update({ last_seen_at: now.toISOString() })
    .eq('id', userId);
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
