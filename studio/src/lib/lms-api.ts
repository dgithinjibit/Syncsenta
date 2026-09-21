import { NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';

export async function getAuthenticatedLmsClient() {
  const supabase = await createSupabaseRouteHandlerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { supabase, user: null, response: unauthorized() } as const;
  }
  return { supabase, user: data.user, response: null } as const;
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized() {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: 'Insufficient LMS permissions' }, { status: 403 });
}

export function serverError(message = 'LMS request failed') {
  return NextResponse.json({ error: message }, { status: 500 });
}
