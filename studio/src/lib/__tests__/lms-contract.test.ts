import { describe, expect, it } from 'vitest';
import {
  AI_LITERACY_FOUNDATIONS_MODULE,
  CODEYETU_PROGRAMME,
  sessionDurationMinutes,
  validateCohort,
  validateEnrollment,
  validateLessonSession,
} from '../lms-contract';

describe('CodeYetu-compatible LMS contract', () => {
  it('supports one-to-one, club, and community delivery without changing chat slugs', () => {
    expect(CODEYETU_PROGRAMME.deliveryModes).toEqual([
      'one_to_one',
      'coding_club',
      'community_cohort',
    ]);
    expect(AI_LITERACY_FOUNDATIONS_MODULE.subjectSlug).toBe('ai');
    expect(AI_LITERACY_FOUNDATIONS_MODULE.sandboxActivity).toBe('source-checker');
  });

  it('keeps CodeYetu trial and regular lesson durations explicit', () => {
    expect(sessionDurationMinutes('trial')).toBe(40);
    expect(sessionDurationMinutes('lesson')).toBe(60);
  });

  it('fails closed without consent or a mentor', () => {
    expect(
      validateLessonSession({
        mode: 'one_to_one',
        kind: 'trial',
        participantCount: 1,
        consented: false,
        mentorAssigned: true,
        connectivity: 'online',
      }),
    ).toEqual({ ok: false, reason: 'consent_required' });

    expect(
      validateLessonSession({
        mode: 'coding_club',
        kind: 'lesson',
        participantCount: 5,
        consented: true,
        mentorAssigned: false,
        connectivity: 'low_bandwidth',
      }),
    ).toEqual({ ok: false, reason: 'mentor_required' });
  });

  it('accepts a bounded offline-capable club session', () => {
    expect(
      validateLessonSession({
        mode: 'coding_club',
        kind: 'lesson',
        participantCount: 12,
        consented: true,
        mentorAssigned: true,
        connectivity: 'offline_first',
      }),
    ).toEqual({ ok: true, offlineCapable: true });
  });

  it('requires a mentor and bounded capacity for cohorts', () => {
    expect(
      validateCohort({
        name: 'Saturday Coding Club',
        deliveryMode: 'coding_club',
        participantCapacity: 12,
        mentorAssigned: true,
      }),
    ).toEqual({ ok: true });

    expect(
      validateCohort({
        name: 'Unmentored Club',
        deliveryMode: 'coding_club',
        participantCapacity: 12,
        mentorAssigned: false,
      }),
    ).toEqual({ ok: false, reason: 'mentor_required' });
  });

  it('does not activate enrollment before consent', () => {
    expect(
      validateEnrollment({ nextStatus: 'active', consentStatus: 'pending' }),
    ).toEqual({ ok: false, reason: 'consent_required_for_active' });
    expect(
      validateEnrollment({
        currentStatus: 'completed',
        nextStatus: 'active',
        consentStatus: 'granted',
      }),
    ).toEqual({ ok: false, reason: 'invalid_status_transition' });
  });
});
