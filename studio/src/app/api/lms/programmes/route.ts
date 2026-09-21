import { NextResponse } from 'next/server';
import { badRequest, getAuthenticatedLmsClient, serverError } from '@/lib/lms-api';

export async function GET(request: Request) {
  const { supabase, response } = await getAuthenticatedLmsClient();
  if (response) return response;

  const organisationId = new URL(request.url).searchParams.get('organisationId');
  let query = supabase
    .from('lms_programmes')
    .select('id, organisation_id, slug, name, description, supported_age_min, supported_age_max, default_session_minutes, trial_session_minutes, mentor_required, consent_required, offline_first, curriculum_version, status, created_at')
    .order('name');
  if (organisationId) query = query.eq('organisation_id', organisationId);

  const { data, error } = await query;
  if (error) {
    console.error('[/api/lms/programmes GET]', error);
    return serverError();
  }
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const { supabase, user, response } = await getAuthenticatedLmsClient();
  if (response || !user) return response ?? NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  let body: {
    organisationId?: string;
    slug?: string;
    name?: string;
    description?: string;
    supportedAgeMin?: number;
    supportedAgeMax?: number;
    defaultSessionMinutes?: number;
    trialSessionMinutes?: number;
    curriculumVersion?: string;
  };
  try {
    body = await request.json();
  } catch {
    return badRequest('Request body must be valid JSON');
  }

  const slug = body.slug?.trim().toLowerCase();
  const name = body.name?.trim();
  const ageMin = body.supportedAgeMin ?? 6;
  const ageMax = body.supportedAgeMax ?? 16;
  const defaultMinutes = body.defaultSessionMinutes ?? 60;
  const trialMinutes = body.trialSessionMinutes ?? 40;

  if (!body.organisationId) return badRequest('organisationId is required');
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return badRequest('Invalid programme slug');
  if (!name || name.length < 2 || name.length > 120) return badRequest('name must contain 2–120 characters');
  if (ageMin < 0 || ageMax < ageMin || ageMax > 21) return badRequest('Invalid supported age range');
  if (defaultMinutes < 15 || defaultMinutes > 180 || trialMinutes < 15 || trialMinutes > 120) {
    return badRequest('Session duration is outside the supported range');
  }

  const { data, error } = await supabase
    .from('lms_programmes')
    .insert({
      organisation_id: body.organisationId,
      slug,
      name,
      description: body.description?.trim() || null,
      supported_age_min: ageMin,
      supported_age_max: ageMax,
      default_session_minutes: defaultMinutes,
      trial_session_minutes: trialMinutes,
      mentor_required: true,
      consent_required: true,
      offline_first: true,
      curriculum_version: body.curriculumVersion?.trim() || '2026-09-v1',
      created_by: user.id,
    })
    .select('id, organisation_id, slug, name, description, supported_age_min, supported_age_max, default_session_minutes, trial_session_minutes, mentor_required, consent_required, offline_first, curriculum_version, status, created_at')
    .single();
  if (error || !data) {
    console.error('[/api/lms/programmes POST]', error);
    return NextResponse.json(
      { error: error?.code === '23505' ? 'Programme slug already exists in this organisation' : 'Programme could not be created' },
      { status: error?.code === '23505' ? 409 : 403 },
    );
  }
  return NextResponse.json(data, { status: 201 });
}
