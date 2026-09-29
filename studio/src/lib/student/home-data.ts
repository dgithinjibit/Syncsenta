/**
 * Student home data, read from the tables the deployed app actually writes.
 *
 * WHY THIS EXISTS. The learner home used to show three hand-written arrays —
 * `assignments` ("Mathematics — Algebra Practice, due Tomorrow"), `learningPath`
 * (85% / 72% / 68%), and `todaysClasses` ("2:00 PM — 3:00 PM") — and fill the
 * stats cards from `/api/test-personalization`. That endpoint was not a lie of
 * omission: `src/lib/personalized-learning.ts` kept profiles, sessions and
 * progress in `Map`s on the request-handling process and then tried to
 * `localStorage.setItem(...)` them, which does not exist in Node. Every Vercel
 * invocation therefore started empty, so the "personalized" numbers were always
 * zero and the learner's name came from `generateFriendlyName()`. Nothing about
 * a real child survived a cold start. The engine and that dev harness were
 * deleted on 2026-09-29 (see `lib/chat/learner-state.ts`).
 *
 * `chat_sessions` is different: it is a Supabase table, written by `/api/chat`
 * and protected by RLS with `auth.uid() = user_id`. So this module reads only
 * real rows, and when a learner has none it reports that honestly rather than
 * substituting demo content.
 *
 * `profiles.total_points` exists in production as of 2026-09-29 — the gamification migration
 * applied it and made the column a trigger-maintained cache of `point_transactions`. The read still
 * uses `maybeSingle()` and reports `null` rather than 0, because `null` and `0` mean different
 * things here: `null` is "this learner has no profile row to read", `0` is "the ledger is empty".
 * Note which one a learner sees today: the award path is written but not deployed, so every
 * account's ledger is empty and `/student` renders `—`.
 */

import type { Database } from '@/lib/supabase/types';
import { PLATFORM_TIME_ZONE, activityDateInTimeZone } from '@/lib/time/activity-date';

type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];

export interface SubjectSummary {
  subject: string;
  sessions: number;
  messages: number;
  lastActiveAt: string | null;
}

export interface StudentHomeData {
  /** Per-subject rows the learner has actually opened a tutor session in. */
  subjects: SubjectSummary[];
  /** Distinct calendar days with tutor activity, counting back from today. */
  streakDays: number;
  /** Lifetime tutor sessions across every subject. */
  totalSessions: number;
  /** Messages exchanged, i.e. how much work is on record. */
  totalMessages: number;
  /** `profiles.total_points`; null when the profile row is missing. */
  points: number | null;
}

const EMPTY: StudentHomeData = {
  subjects: [],
  streakDays: 0,
  totalSessions: 0,
  totalMessages: 0,
  points: null,
};

/**
 * The calendar day a timestamp falls on in the platform zone.
 *
 * `daily_activity.activity_date` is written on the learner's own day boundary
 * (lib/time/activity-date.ts), and a streak read here has to agree with it —
 * otherwise the student home and the progress row disagree for anyone working
 * between 21:00 and 23:59 UTC, which is 00:00–02:59 in Nairobi.
 */
function toDay(value: string, timeZone: string = PLATFORM_TIME_ZONE): string {
  const moment = new Date(value);
  if (Number.isNaN(moment.getTime())) return value.slice(0, 10);
  return activityDateInTimeZone(timeZone, moment);
}

/** `YYYY-MM-DD` for "now" in the platform zone, as a UTC-midnight Date. */
function platformDayCursor(moment: Date, timeZone: string): Date {
  return new Date(`${activityDateInTimeZone(timeZone, moment)}T00:00:00Z`);
}

/**
 * Consecutive-day count ending today (or yesterday — a streak is not broken
 * until a full day has passed without activity).
 */
export function computeStreakDays(
  dates: string[],
  today = new Date(),
  timeZone: string = PLATFORM_TIME_ZONE
): number {
  const days = new Set(dates.map((d) => toDay(d, timeZone)).filter(Boolean));
  if (days.size === 0) return 0;

  const cursor = platformDayCursor(today, timeZone);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  // Allow the streak to be "still alive" if the learner last worked yesterday.
  if (!days.has(iso(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!days.has(iso(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(iso(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

/**
 * Group raw sessions by subject. Pure so the tests can feed it fixtures
 * instead of a live database.
 */
export function summarizeBySubject(sessions: Pick<ChatSession, 'subject' | 'message_count' | 'last_message_at'>[]): SubjectSummary[] {
  const bySubject = new Map<string, SubjectSummary>();

  for (const session of sessions) {
    const subject = (session.subject || '').trim();
    if (!subject) continue;
    const current = bySubject.get(subject) ?? {
      subject,
      sessions: 0,
      messages: 0,
      lastActiveAt: null,
    };
    current.sessions += 1;
    current.messages += session.message_count ?? 0;
    if (!current.lastActiveAt || session.last_message_at > current.lastActiveAt) {
      current.lastActiveAt = session.last_message_at;
    }
    bySubject.set(subject, current);
  }

  return [...bySubject.values()].sort(
    (a, b) => (b.lastActiveAt ?? '').localeCompare(a.lastActiveAt ?? ''),
  );
}

/**
 * "Today", "Yesterday", "4 days ago", "3 weeks ago" — a learner-relative label,
 * because "Last active: 2026-09-21T08:11:02Z" is not something a Grade 5 child
 * reads. Returns null when there is no recorded activity, so the caller can say
 * "not yet" instead of inventing a time.
 */
export function describeLastActive(iso: string | null | undefined, now = new Date()): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;

  const days = Math.floor(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      Date.UTC(then.getUTCFullYear(), then.getUTCMonth(), then.getUTCDate())) /
      86_400_000,
  );

  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`;
  return `${Math.floor(days / 30)} month${days < 60 ? '' : 's'} ago`;
}

/**
 * Read the signed-in learner's own record. Identity comes from the caller
 * (`useAuth().user.id`), never from a query parameter, and the browser client
 * is anon-keyed, so RLS is what actually decides what comes back.
 */
export async function getStudentHomeData(userId: string): Promise<StudentHomeData> {
  const { supabase } = await import('@/lib/supabase/client');

  const [{ data: sessionRows }, { data: profileRow }] = await Promise.all([
    supabase
      .from('chat_sessions')
      .select('subject, message_count, last_message_at')
      .eq('user_id', userId)
      .neq('status', 'deleted')
      .order('last_message_at', { ascending: false })
      .limit(500),
    supabase.from('profiles').select('total_points').eq('id', userId).maybeSingle(),
  ]);

  const sessions = (sessionRows ?? []) as Pick<
    ChatSession,
    'subject' | 'message_count' | 'last_message_at'
  >[];

  if (sessions.length === 0 && !profileRow) return { ...EMPTY };

  const subjects = summarizeBySubject(sessions);

  return {
    subjects,
    streakDays: computeStreakDays(sessions.map((s) => s.last_message_at)),
    totalSessions: sessions.length,
    totalMessages: sessions.reduce((sum, s) => sum + (s.message_count ?? 0), 0),
    points: typeof profileRow?.total_points === 'number' ? profileRow.total_points : null,
  };
}
