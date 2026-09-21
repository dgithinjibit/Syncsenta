/**
 * Additive LMS contracts for CodeYetu-style delivery.
 *
 * This module is deliberately pure. It does not access Supabase, create a
 * session, or change the existing chat route. API and database adapters can
 * consume these contracts after authentication and consent checks.
 */

export type DeliveryMode = 'one_to_one' | 'coding_club' | 'community_cohort';
export type SessionKind = 'trial' | 'lesson' | 'project' | 'review';
export type ConnectivityProfile = 'online' | 'low_bandwidth' | 'offline_first';
export type OrganisationType = 'school' | 'community_programme' | 'nonprofit' | 'partner';
export type OrganisationStatus = 'active' | 'paused' | 'archived';
export type ProgrammeStatus = 'draft' | 'active' | 'paused' | 'archived';
export type CohortStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export type EnrollmentStatus = 'invited' | 'active' | 'paused' | 'completed' | 'withdrawn';
export type ConsentStatus = 'pending' | 'granted' | 'declined' | 'revoked';

export interface LmsOrganisation {
  id: string;
  slug: string;
  name: string;
  type: OrganisationType;
  countryCode: string;
  status: OrganisationStatus;
}

export interface ProgrammeProfile {
  id: string;
  displayName: string;
  deliveryModes: readonly DeliveryMode[];
  defaultSessionMinutes: number;
  trialSessionMinutes: number;
  mentorRequired: boolean;
  consentRequired: boolean;
  offlineFirst: boolean;
  supportedAgeRange: { min: number; max: number };
}

export interface LmsProgramme extends ProgrammeProfile {
  organisationId: string;
  slug: string;
  status: ProgrammeStatus;
  curriculumVersion: string;
}

export interface LmsCohort {
  id: string;
  programmeId: string;
  name: string;
  deliveryMode: DeliveryMode;
  mentorId?: string;
  locationName?: string;
  connectivityProfile: ConnectivityProfile;
  participantCapacity: number;
  status: CohortStatus;
  startsAt?: string;
  endsAt?: string;
}

export interface LmsEnrollment {
  id: string;
  cohortId: string;
  studentId: string;
  status: EnrollmentStatus;
  consentStatus: ConsentStatus;
  enrolledBy?: string;
  enrolledAt: string;
}

export interface LmsModule {
  id: string;
  title: string;
  subjectSlug: string;
  contentVersion: string;
  ageBands: readonly string[];
  competency: string;
  objective: string;
  offlineAlternative: string;
  sandboxActivity?: string;
}

export interface LessonSessionRequest {
  mode: DeliveryMode;
  kind: SessionKind;
  participantCount: number;
  consented: boolean;
  mentorAssigned: boolean;
  connectivity: ConnectivityProfile;
}

export type LessonSessionValidation =
  | { ok: true; offlineCapable: true }
  | {
      ok: false;
      reason:
        | 'invalid_participant_count'
        | 'consent_required'
        | 'mentor_required';
    };

export type CohortValidation =
  | { ok: true }
  | {
      ok: false;
      reason: 'invalid_name' | 'invalid_capacity' | 'mentor_required';
    };

export type EnrollmentValidation =
  | { ok: true }
  | { ok: false; reason: 'consent_required_for_active' | 'invalid_status_transition' };

export const CODEYETU_PROGRAMME: ProgrammeProfile = {
  id: 'codeyetu',
  displayName: 'CodeYetu Learning Programme',
  deliveryModes: ['one_to_one', 'coding_club', 'community_cohort'],
  defaultSessionMinutes: 60,
  trialSessionMinutes: 40,
  mentorRequired: true,
  consentRequired: true,
  offlineFirst: true,
  supportedAgeRange: { min: 6, max: 16 },
};

export const AI_LITERACY_FOUNDATIONS_MODULE: LmsModule = {
  id: 'ai-literacy-foundations',
  title: 'AI Literacy: Evidence Before Trust',
  subjectSlug: 'ai',
  contentVersion: '2026-09-v1',
  ageBands: ['grades-4-6', 'grades-7-9'],
  competency: 'critical thinking and problem solving',
  objective: 'Compare a synthetic AI output with evidence and explain when human review is required.',
  offlineAlternative: 'Use printed claim cards, a textbook, and a teacher-approved observation.',
  sandboxActivity: 'source-checker',
};

const PARTICIPANT_LIMITS: Record<DeliveryMode, { min: number; max: number }> = {
  one_to_one: { min: 1, max: 1 },
  coding_club: { min: 2, max: 24 },
  community_cohort: { min: 2, max: 40 },
};

export function validateLessonSession(
  request: LessonSessionRequest,
): LessonSessionValidation {
  const limits = PARTICIPANT_LIMITS[request.mode];
  if (request.participantCount < limits.min || request.participantCount > limits.max) {
    return { ok: false, reason: 'invalid_participant_count' };
  }
  if (!request.consented) {
    return { ok: false, reason: 'consent_required' };
  }
  if (!request.mentorAssigned) {
    return { ok: false, reason: 'mentor_required' };
  }
  return { ok: true, offlineCapable: true };
}

export function validateCohort(params: {
  name: string;
  deliveryMode: DeliveryMode;
  participantCapacity: number;
  mentorAssigned: boolean;
}): CohortValidation {
  const name = params.name.trim();
  const limits = PARTICIPANT_LIMITS[params.deliveryMode];
  if (name.length < 2 || name.length > 120) {
    return { ok: false, reason: 'invalid_name' };
  }
  if (
    params.participantCapacity < limits.min ||
    params.participantCapacity > limits.max
  ) {
    return { ok: false, reason: 'invalid_capacity' };
  }
  if (!params.mentorAssigned) {
    return { ok: false, reason: 'mentor_required' };
  }
  return { ok: true };
}

export function validateEnrollment(params: {
  nextStatus: EnrollmentStatus;
  consentStatus: ConsentStatus;
  currentStatus?: EnrollmentStatus;
}): EnrollmentValidation {
  if (params.nextStatus === 'active' && params.consentStatus !== 'granted') {
    return { ok: false, reason: 'consent_required_for_active' };
  }
  if (params.currentStatus === 'completed' && params.nextStatus !== 'completed') {
    return { ok: false, reason: 'invalid_status_transition' };
  }
  if (params.currentStatus === 'withdrawn' && params.nextStatus !== 'withdrawn') {
    return { ok: false, reason: 'invalid_status_transition' };
  }
  return { ok: true };
}

export function sessionDurationMinutes(
  kind: SessionKind,
  profile: ProgrammeProfile = CODEYETU_PROGRAMME,
): number {
  return kind === 'trial' ? profile.trialSessionMinutes : profile.defaultSessionMinutes;
}
