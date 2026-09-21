import { NextResponse } from 'next/server';
import { badRequest, getAuthenticatedLmsClient, serverError } from '@/lib/lms-api';
import { validateCohort, type DeliveryMode, type ConnectivityProfile } from '@/lib/lms-contract';

const DELIVERY_MODES = new Set<DeliveryMode>(['one_to_one', 'coding_club', 'community_cohort']);
const CONNECTIVITY = new Set<ConnectivityProfile>(['online', 'low_bandwidth', 'offline_first']);
const STATUS = new Set(['planned', 'active', 'completed', 'cancelled']);

export async function GET(request: Request) {
  const { supabase, response } = await getAuthenticatedLmsClient();
  if (response) return response;

  const programmeId = new URL(request.url).searchParams.get('programmeId');
  let query = supabase
    .from('lms_cohorts')
    .select('id, programme_id, name, delivery_mode, mentor_id, location_name, connectivity_profile, participant_capacity, starts_at, ends_at, status, created_at')
    .order('starts_at', { ascending: true });
  if (programmeId) query = query.eq('programme_id', programmeId);

  const { data, error } = await query;
  if (error) {
    console.error('[/api/lms/cohorts GET]', error);
    return serverError();
  }
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const { supabase, user, response } = await getAuthenticatedLmsClient();
  if (response || !user) return response ?? NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  let body: {
    programmeId?: string;
    name?: string;
    deliveryMode?: DeliveryMode;
    mentorId?: string;
    locationName?: string;
    connectivityProfile?: ConnectivityProfile;
    participantCapacity?: number;
    startsAt?: string;
    endsAt?: string;
    status?: string;
  };
  try {
    body = await request.json();
  } catch {
    return badRequest('Request body must be valid JSON');
  }

  const mode = body.deliveryMode ?? 'coding_club';
  const connectivity = body.connectivityProfile ?? 'offline_first';
  const capacity = body.participantCapacity ?? (mode === 'one_to_one' ? 1 : 24);
  const status = body.status ?? 'planned';
  if (!body.programmeId) return badRequest('programmeId is required');
  if (!DELIVERY_MODES.has(mode)) return badRequest('Unsupported delivery mode');
  if (!CONNECTIVITY.has(connectivity)) return badRequest('Unsupported connectivity profile');
  if (!STATUS.has(status)) return badRequest('Unsupported cohort status');

  const validation = validateCohort({
    name: body.name ?? '',
    deliveryMode: mode,
    participantCapacity: capacity,
    mentorAssigned: Boolean(body.mentorId) || status === 'planned',
  });
  if (!validation.ok) return badRequest(validation.reason);

  const { data, error } = await supabase
    .from('lms_cohorts')
    .insert({
      programme_id: body.programmeId,
      name: body.name?.trim(),
      delivery_mode: mode,
      mentor_id: body.mentorId || null,
      location_name: body.locationName?.trim() || null,
      connectivity_profile: connectivity,
      participant_capacity: capacity,
      starts_at: body.startsAt || null,
      ends_at: body.endsAt || null,
      status,
      created_by: user.id,
    })
    .select('id, programme_id, name, delivery_mode, mentor_id, location_name, connectivity_profile, participant_capacity, starts_at, ends_at, status, created_at')
    .single();
  if (error || !data) {
    console.error('[/api/lms/cohorts POST]', error);
    return NextResponse.json(
      { error: error?.code === '23505' ? 'Cohort name already exists in this programme' : 'Cohort could not be created' },
      { status: error?.code === '23505' ? 409 : 403 },
    );
  }
  return NextResponse.json(data, { status: 201 });
}
