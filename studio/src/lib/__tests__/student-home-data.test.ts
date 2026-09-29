import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  computeStreakDays,
  describeLastActive,
  summarizeBySubject,
} from '../student/home-data';

/**
 * The learner home page used to be demo content: three hand-written arrays
 * (fake homework with due dates, invented 85/72/68 progress bars, class times
 * nobody scheduled) plus stats from `/api/test-personalization`, whose engine
 * kept everything in per-process Maps and then persisted them with
 * `localStorage` inside a Vercel function — so it always came back empty with a
 * randomly generated name. Both the engine and that dev harness were deleted on
 * 2026-09-29. These tests cover the replacement: pure derivations
 * over the `chat_sessions` rows the tutor actually writes, and a check that the
 * fabricated content stays deleted.
 */

const TODAY = new Date('2026-09-26T10:00:00.000Z');

describe('computeStreakDays', () => {
  it('is zero with no activity', () => {
    expect(computeStreakDays([], TODAY)).toBe(0);
  });

  it('counts today as a one-day streak', () => {
    expect(computeStreakDays(['2026-09-26T08:11:02.000Z'], TODAY)).toBe(1);
  });

  it('does not break the streak just because today has not happened yet', () => {
    expect(computeStreakDays(['2026-09-25T18:00:00.000Z'], TODAY)).toBe(1);
  });

  it('counts consecutive days and ignores repeated days', () => {
    const dates = [
      '2026-09-26T09:00:00.000Z',
      '2026-09-26T07:00:00.000Z',
      '2026-09-25T09:00:00.000Z',
      '2026-09-24T09:00:00.000Z',
    ];
    expect(computeStreakDays(dates, TODAY)).toBe(3);
  });

  it('resets after a missed day', () => {
    const dates = ['2026-09-26T09:00:00.000Z', '2026-09-24T09:00:00.000Z'];
    expect(computeStreakDays(dates, TODAY)).toBe(1);
  });

  it('is zero when the last activity is older than yesterday', () => {
    expect(computeStreakDays(['2026-08-02T09:00:00.000Z'], TODAY)).toBe(0);
  });
});

describe('summarizeBySubject', () => {
  it('groups sessions per subject and totals messages', () => {
    const rows = [
      { subject: 'mathematics', message_count: 6, last_message_at: '2026-09-26T09:00:00.000Z' },
      { subject: 'mathematics', message_count: 4, last_message_at: '2026-09-20T09:00:00.000Z' },
      { subject: 'english', message_count: 2, last_message_at: '2026-09-24T09:00:00.000Z' },
    ];
    expect(summarizeBySubject(rows)).toEqual([
      { subject: 'mathematics', sessions: 2, messages: 10, lastActiveAt: '2026-09-26T09:00:00.000Z' },
      { subject: 'english', sessions: 1, messages: 2, lastActiveAt: '2026-09-24T09:00:00.000Z' },
    ]);
  });

  it('drops rows with no subject instead of rendering an empty card', () => {
    const rows = [{ subject: '   ', message_count: 1, last_message_at: '2026-09-26T09:00:00.000Z' }];
    expect(summarizeBySubject(rows)).toEqual([]);
  });

  it('treats a null message_count as zero rather than poisoning the total', () => {
    const rows = [
      { subject: 'mathematics', message_count: null as unknown as number, last_message_at: '2026-09-26T09:00:00.000Z' },
    ];
    expect(summarizeBySubject(rows)[0].messages).toBe(0);
  });
});

describe('describeLastActive', () => {
  it('says nothing when there is no activity to describe', () => {
    expect(describeLastActive(null, TODAY)).toBeNull();
    expect(describeLastActive(undefined, TODAY)).toBeNull();
    expect(describeLastActive('not a date', TODAY)).toBeNull();
  });

  it('uses learner words, not ISO timestamps', () => {
    expect(describeLastActive('2026-09-26T06:00:00.000Z', TODAY)).toBe('today');
    expect(describeLastActive('2026-09-25T06:00:00.000Z', TODAY)).toBe('yesterday');
    expect(describeLastActive('2026-09-22T06:00:00.000Z', TODAY)).toBe('4 days ago');
    expect(describeLastActive('2026-09-12T06:00:00.000Z', TODAY)).toBe('2 weeks ago');
    expect(describeLastActive('2026-08-01T06:00:00.000Z', TODAY)).toBe('1 month ago');
  });
});

describe('the learner home page no longer fabricates content', () => {
  function source(): string {
    // Strip comments first: the docstring that explains what was removed must
    // not count as the thing being present.
    return readFileSync(join(process.cwd(), 'src/app/student/page.tsx'), 'utf8')
      .replace(/(^|[^:])\/\/.*$/gm, '$1')
      .replace(/\/\*[\s\S]*?\*\//g, '');
  }

  const page = source();

  it('has no hardcoded homework, timetable or progress percentages', () => {
    expect(page).not.toMatch(/const assignments/);
    expect(page).not.toMatch(/const learningPath/);
    expect(page).not.toMatch(/const todaysClasses/);
    expect(page).not.toMatch(/due this week/i);
    expect(page).not.toMatch(/11:59 PM/);
    expect(page).not.toMatch(/2:00 PM/);
  });

  it('takes the learner from the Supabase session, not the in-memory personalization API', () => {
    expect(page).toMatch(/useAuth\(\)/);
    expect(page).toMatch(/getStudentHomeData/);
    expect(page).not.toMatch(/test-personalization/);
    expect(page).not.toMatch(/localStorage\.getItem\('userName'\)/);
  });

  it('reads the profile and session tables that RLS protects', () => {
    const data = readFileSync(
      join(process.cwd(), 'src/lib/student/home-data.ts'),
      'utf8',
    );
    expect(data).toMatch(/from\('chat_sessions'\)/);
    expect(data).toMatch(/from\('profiles'\)/);
    // Never the service-role client: it reports a null user and bypasses RLS.
    expect(data).not.toMatch(/SERVICE_ROLE/);
  });
});
