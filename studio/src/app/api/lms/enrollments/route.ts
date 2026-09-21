import { NextResponse } from 'next/server';
import { badRequest, getAuthenticatedLmsClient, serverError } from '@/lib/lms-api';
import {
  validateEnrollment,
  type ConsentStatus,
  type EnrollmentStatus,
} from '@/lib/lms-contract';

const STATUSES = new Set<EnrollmentStatus>(['invited', 'active', 'paused', 'completed', 'withdrawn']);
const CONSENTS = new Set<ConsentStatus>(['pending', 'granted', 'declined', 'revoked']);

export async function GET(request: Request) {
  const { supabase, response } = await getAuthenticatedLmsClient();
  if (response) return response;

  const params = new URL(request.url).searchParams;
  const cohortId = params.get('cohortId');
  const studentId = params.get('studentId');
  let query = supabase
    .from('lms_enrollments')
    .select('id, cohort_id, student_id, status, consent_status, enrolled_by, enrolled_at, updated_at')
    .order('enrolled_at', { ascending: false });
  if (cohortId) query = query.eq('cohort_id', cohortId);
  if (studentId) query = query.eq('student_id', studentId);

  const { data, error } = await query;
  if (error) {
    console.error('[/api/lms/enrollments GET]', error);
    return serverError();
  }
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const { supabase, user, response } = await getAuthenticatedLmsClient();
  if (response || !user) return response ?? NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  let body: {
    cohortId?: string;
    studentId?: string;
    status?: EnrollmentStatus;
    consentStatus?: ConsentStatus;
  };
  try {
    body = await request.json();
  } catch {
    return badRequest('Request body must be valid JSON');
  }

  const status = body.status ?? 'invited';
  const consentStatus = body.consentStatus ?? 'pending';
  if (!body.cohortId || !body.studentId) return badRequest('cohortId and studentId are required');
  if (!STATUSES.has(status) || !CONSENTS.has(consentStatus)) return badRequest('Unsupported enrollment state');

  const validation = validateEnrollment({ nextStatus: status, consentStatus });
  if (!validation.ok) return badRequest(validation.reason);

  const { data, error } = await supabase
    .from('lms_enrollments')
    .insert({
      cohort_id: body.cohortId,
      student_id: body.studentId,
      status,
      consent_status: consentStatus,
      enrolled_by: user.id,
    })
    .select('id, cohort_id, student_id, status, consent_status, enrolled_by, enrolled_at, updated_at')
    .single();
  if (error || !data) {
    console.error('[/api/lms/enrollments POST]', error);
    return NextResponse.json(
      { error: error?.code === '23505' ? 'Student is already enrolled in this cohort' : 'Enrollment could not be created' },
      { status: error?.code === '23505' ? 409 : 403 },
    );
  }
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const { supabase, user, response } = await getAuthenticatedLmsClient();
  if (response || !user) return response ?? NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  let body: { enrollmentId?: string; status?: EnrollmentStatus; consentStatus?: ConsentStatus };
  try {
    body = await request.json();
  } catch {
    return badRequest('Request body must be valid JSON');
  }
  if (!body.enrollmentId) return badRequest('enrollmentId is required');
  if (body.status && !STATUSES.has(body.status)) return badRequest('Unsupported enrollment status');
  if (body.consentStatus && !CONSENTS.has(body.consentStatus)) return badRequest('Unsupported consent status');

  const { data: current, error: currentError } = await supabase
    .from('lms_enrollments')
    .select('id, status, consent_status')
    .eq('id', body.enrollmentId)
    .single();
  if (currentError || !current) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });

  const nextStatus = body.status ?? current.status;
  const nextConsent = body.consentStatus ?? current.consent_status;
  const validation = validateEnrollment({
    currentStatus: current.status,
    nextStatus,
    consentStatus: nextConsent,
  });
  if (!validation.ok) return badRequest(validation.reason);

  const { data, error } = await supabase
    .from('lms_enrollments')
    .update({ status: nextStatus, consent_status: nextConsent, updated_at: new Date().toISOString() })
    .eq('id', body.enrollmentId)
    .select('id, cohort_id, student_id, status, consent_status, enrolled_by, enrolled_at, updated_at')
    .single();
  if (error || !data) {
    console.error('[/api/lms/enrollments PATCH]', error);
    return serverError();
  }
  return NextResponse.json(data);
}
