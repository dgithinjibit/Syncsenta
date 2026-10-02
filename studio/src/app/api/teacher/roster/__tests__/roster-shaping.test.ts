import { describe, expect, it } from 'vitest';

/**
 * Spoon 13 (teacher monitoring): /api/teacher/roster replaces the dead Rust
 * `/students` call in the legacy TeacherDashboard. These are the route's pure
 * shaping helpers — no Supabase, no network.
 *
 * Shape mirrors production rows measured in the SQL editor on 2026-10-02:
 * teacher_student_assignments joins students (FK student_id -> students.id),
 * and students.user_id mirrors profiles.id for the last-seen timestamp.
 */

import { buildRoster, deriveStatus } from '@/app/api/teacher/roster/route';

const NOW = new Date('2026-10-02T15:00:00.000Z');

describe('deriveStatus', () => {
  it('calls a learner seen within 5 minutes online', () => {
    expect(deriveStatus('2026-10-02T14:57:00.000Z', NOW)).toBe('online');
  });

  it('calls a learner seen within the hour idle', () => {
    expect(deriveStatus('2026-10-02T14:20:00.000Z', NOW)).toBe('idle');
  });

  it('calls a stale or missing last_seen offline', () => {
    expect(deriveStatus('2026-09-08T00:00:00.000Z', NOW)).toBe('offline');
    expect(deriveStatus(null, NOW)).toBe('offline');
  });
});

describe('buildRoster', () => {
  it("collapses one learner's two subjects into a single roster entry", () => {
    const roster = buildRoster(
      [
        { student_id: 'stu-1', subject: 'Artificial Intelligence', class_name: 'Grade 8' },
        { student_id: 'stu-1', subject: 'Blockchain', class_name: 'Grade 8' },
      ],
      [{ id: 'stu-1', student_name: 'Amina Test Learner', grade: 'Grade 8', school_name: 'Kibera Girls’ Secondary', user_id: 'usr-1' }],
      [{ id: 'usr-1', last_seen_at: '2026-10-02T14:59:00.000Z' }],
      NOW,
    );

    expect(roster).toHaveLength(1);
    expect(roster[0]).toMatchObject({
      id: 'stu-1',
      name: 'Amina Test Learner',
      grade: 'Grade 8',
      subject: 'Artificial Intelligence · Blockchain',
      location: 'Kibera Girls’ Secondary',
      status: 'online',
    });
  });

  it('drops assignment rows whose student record is missing', () => {
    const roster = buildRoster(
      [{ student_id: 'phantom', subject: 'Blockchain', class_name: 'Grade 8' }],
      [],
      [],
      NOW,
    );
    expect(roster).toEqual([]);
  });

  it('keeps a learner even when no profile row gives a last_seen', () => {
    const roster = buildRoster(
      [{ student_id: 'stu-2', subject: 'Blockchain', class_name: 'Grade 8' }],
      [{ id: 'stu-2', student_name: 'Demo Student', grade: 'Grade 8', school_name: null, user_id: null }],
      [],
      NOW,
    );
    expect(roster).toHaveLength(1);
    expect(roster[0].status).toBe('offline');
    expect(roster[0].location).toBe('');
  });
});
