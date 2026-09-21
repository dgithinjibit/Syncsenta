import { NextResponse } from 'next/server';
import {
  badRequest,
  forbidden,
  getAuthenticatedLmsClient,
  serverError,
} from '@/lib/lms-api';

const ORGANISATION_TYPES = new Set([
  'school',
  'community_programme',
  'nonprofit',
  'partner',
]);

export async function GET() {
  const { supabase, response } = await getAuthenticatedLmsClient();
  if (response) return response;

  const { data, error } = await supabase
    .from('lms_organisations')
    .select('id, slug, name, organisation_type, country_code, status, created_at')
    .order('name');
  if (error) {
    console.error('[/api/lms/organisations GET]', error);
    return serverError();
  }
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const { supabase, user, response } = await getAuthenticatedLmsClient();
  if (response || !user) return response ?? forbidden();

  let body: {
    slug?: string;
    name?: string;
    organisationType?: string;
    countryCode?: string;
  };
  try {
    body = await request.json();
  } catch {
    return badRequest('Request body must be valid JSON');
  }

  const slug = body.slug?.trim().toLowerCase();
  const name = body.name?.trim();
  const organisationType = body.organisationType ?? 'school';
  const countryCode = (body.countryCode ?? 'KE').trim().toUpperCase();

  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return badRequest('slug must use lowercase letters, numbers, and hyphens');
  }
  if (!name || name.length < 2 || name.length > 120) {
    return badRequest('name must contain 2–120 characters');
  }
  if (!ORGANISATION_TYPES.has(organisationType)) {
    return badRequest('Unsupported organisation type');
  }
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return badRequest('countryCode must be an ISO-style two-letter code');
  }

  const { data: organisation, error } = await supabase
    .from('lms_organisations')
    .insert({
      slug,
      name,
      organisation_type: organisationType,
      country_code: countryCode,
      created_by: user.id,
    })
    .select('id, slug, name, organisation_type, country_code, status, created_at')
    .single();
  if (error || !organisation) {
    console.error('[/api/lms/organisations POST]', error);
    return NextResponse.json(
      { error: error?.code === '23505' ? 'Organisation slug already exists' : 'Organisation could not be created' },
      { status: error?.code === '23505' ? 409 : 403 },
    );
  }

  const { error: membershipError } = await supabase
    .from('lms_organisation_members')
    .insert({ organisation_id: organisation.id, user_id: user.id, role: 'owner' });
  if (membershipError) {
    console.error('[/api/lms/organisations membership]', membershipError);
    return serverError('Organisation was created but owner membership could not be created');
  }

  return NextResponse.json(organisation, { status: 201 });
}
