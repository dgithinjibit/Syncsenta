/**
 * Gamification — points, awarded through the ledger.
 *
 * This module used to contain a client-side read-modify-write: read `profiles.total_points`, add a
 * number in JavaScript, write it back, and insert a row into `point_transactions`. It had no
 * importer anywhere in `src/`, and it is now refused by production rather than merely unused: the
 * `profiles_total_points_immutable` trigger reverts any write to that column that is not the
 * ledger's own recompute (see
 * `supabase/migrations_live/20260929000000_gamification_and_school_scope.sql`, applied 2026-09-29).
 *
 * What is left is the one thing the old shape could not be: an append to `point_transactions`
 * through `award_points()`, which is `SECURITY DEFINER`, recomputes the cache from the sum in the
 * same statement, and is granted to `service_role` only — `anon` and `authenticated` are revoked
 * explicitly, because Supabase's default privileges had handed EXECUTE to `anon` at create time
 * (that migration's defect 4).
 *
 * Two consequences for callers:
 *
 *   1. There is no default client. A browser cannot open the ledger, so a module-level singleton
 *      would be a promise this migration broke on purpose. Pass the service client.
 *   2. There is no `getStudentRank()` / leaderboard read here either. Those were direct
 *      `profiles` selects which RLS answers with zero rows; the mediated read is
 *      `client.rpc('get_leaderboard', …)`. Per the roadmap's rule — cut what is unusable, rebuild
 *      what the frontend references — they stay cut until a component calls them. `gamification-panel.tsx`
 *      is unmounted, so there is no caller to satisfy yet.
 *
 * Amounts are not arguments a caller invents: `awardCompetencyMastery` takes the mastery bonus from
 * this module's constant. The database accepts any non-negative total it is handed, which is exactly
 * why the function is not browser-callable, so the discipline stays here.
 *
 * Known gap, deliberately not papered over: `point_transactions` has no unique key for "this
 * competency has already paid its mastery bonus", so two concurrent transitions could both append.
 * The caller awards on the transition branch only, which makes it a race rather than a bug, and
 * `p_correlation_id` exists as the hook for a real idempotency key when one is added.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/types';

/** First mastery of a competency. Same figure the pre-ledger module claimed, now actually paid. */
export const COMPETENCY_MASTERY_POINTS = 50;

/** Which rule pack in this codebase awarded the row — `point_transactions.policy_version`. */
export const POINTS_POLICY_VERSION = 'studio-ts-2026-09-29';

type PointsClient = SupabaseClient<Database>;

export interface AwardOptions {
  /** Overrides the policy constant. Positive integers only; see the module header. */
  points?: number;
  /** The turn this award belongs to, for audit and future idempotency. */
  correlationId?: string | null;
}

/**
 * Append the mastery award for one competency to the ledger.
 *
 * Throws rather than logging. The old module swallowed every failure into `console.error` and
 * returned the number it had hoped to write, which is how a reward surface ended up showing zeros
 * in production while looking healthy in review.
 */
export async function awardCompetencyMastery(
  userId: string,
  competencyCode: string,
  client: PointsClient,
  options: AwardOptions = {}
): Promise<number> {
  const points = options.points ?? COMPETENCY_MASTERY_POINTS;

  // An award of zero would still append a row and recompute the cache, so it is a claim that
  // something was earned without anything being earned. Refuse it before the round trip.
  if (!Number.isInteger(points) || points <= 0) {
    throw new Error(`awardCompetencyMastery: points must be a positive integer, got ${points}`);
  }

  const { data, error } = await client.rpc('award_points', {
    p_user_id: userId,
    p_competency_code: competencyCode,
    p_transaction_type: 'competency_mastered',
    p_base_points: 0,
    p_mastery_bonus: points,
    p_policy_version: POINTS_POLICY_VERSION,
    p_correlation_id: options.correlationId ?? null,
  });

  if (error) {
    throw new Error(
      `award_points refused (${competencyCode} for ${userId}): ${error.message}`
    );
  }

  if (typeof data !== 'number') {
    throw new Error(`award_points returned no total for ${competencyCode}`);
  }

  return data;
}
