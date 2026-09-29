/**
 * Activity Day Boundary
 *
 * `daily_activity.activity_date` is a `date`, and streaks are computed from
 * consecutive dates. Whoever writes a row therefore decides when a learner's
 * day rolls over — and the server that decides it runs in UTC while a Kenyan
 * classroom runs three hours ahead.
 *
 * That mismatch made streaks wrong in two directions: a learner who chatted at
 * 10:00 in the morning could be credited for the previous calendar day, and an
 * evening session after 21:00 UTC was already counted as tomorrow. A streak is
 * the reward surface the learner actually sees, so the boundary has to be the
 * day the learner lives in, not the day the host process thinks it is.
 *
 * Everything that writes or reads `activity_date` should use these helpers:
 *   - lib/progress/progress-tracking.ts  (writes + streak)
 *   - lib/student/home-data.ts           (student home streak/messages)
 *   - components/teacher/analytics-tab.tsx (teacher 7-day view)
 *   - app/api/teacher/export-report/route.ts (report window)
 */

/** SyncSenta is a Kenya CBC product; `profiles.timezone` defaults to this. */
export const PLATFORM_TIME_ZONE = 'Africa/Nairobi';

/**
 * The calendar date in `timeZone` for a moment in time, as `YYYY-MM-DD`.
 *
 * Falls back to the UTC date when the zone is missing or invalid, so a
 * half-populated profile cannot turn a write into an exception.
 */
export function activityDateInTimeZone(
  timeZone: string | null | undefined = PLATFORM_TIME_ZONE,
  moment: Date = new Date(),
): string {
  const zone = timeZone || PLATFORM_TIME_ZONE;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(moment);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value;
    const year = get('year');
    const month = get('month');
    const day = get('day');

    if (!year || !month || !day) return moment.toISOString().slice(0, 10);
    return `${year}-${month}-${day}`;
  } catch {
    // `profiles.timezone` is free text, so an unsupported zone name must not
    // take a learner's message write down with it.
    return moment.toISOString().slice(0, 10);
  }
}

/**
 * `days` before `timeZone`'s current date, as `YYYY-MM-DD`.
 *
 * The shift happens in absolute time (a day is 24h of wall-clock here) and the
 * result is then read back in the zone, which keeps the answer correct across
 * a zone with no DST — and avoids the "date arithmetic in UTC then format"
 * drift that produced the original bug.
 */
export function activityDateOffset(
  days: number,
  timeZone: string | null | undefined = PLATFORM_TIME_ZONE,
  moment: Date = new Date(),
): string {
  return activityDateInTimeZone(
    timeZone,
    new Date(moment.getTime() - days * 24 * 60 * 60 * 1000),
  );
}
