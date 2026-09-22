import { cookies } from 'next/headers';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import type { UserRole } from '@/lib/types';

export const trustRequestSchema = z.object({
  category: z.enum(['support', 'privacy', 'deletion', 'safety']),
  summary: z.string().trim().min(10).max(4000),
  requesterEmail: z.string().trim().email().max(320).optional(),
  schoolId: z.string().trim().min(1).max(120).optional(),
  subjectId: z.string().trim().min(1).max(120).optional(),
  urgent: z.boolean().default(false),
});

export const consentSchema = z.object({
  childId: z.string().trim().min(1).max(120),
  schoolId: z.string().trim().min(1).max(120).optional(),
  consentVersion: z.string().trim().min(1).max(80),
  purposes: z.array(z.enum(['learning', 'voice', 'communications'])).min(1),
  granted: z.boolean(),
});

export const dataRequestSchema = z.object({
  type: z.enum(['access', 'correction', 'export', 'restriction', 'deletion']),
  subjectId: z.string().trim().min(1).max(120),
  schoolId: z.string().trim().min(1).max(120).optional(),
  details: z.string().trim().max(2000).optional(),
});

const demoRoles: UserRole[] = ['student', 'teacher', 'parent', 'school_head', 'school_admin', 'county_officer', 'national_admin'];

export type BackendActor = {
  id: string;
  name?: string;
  email?: string;
  role: UserRole;
  isDemo: boolean;
};

export function getBackendActor(): BackendActor | null {
  const cookieStore = cookies();
  const role = cookieStore.get('userRole')?.value as UserRole | undefined;
  const email = cookieStore.get('userEmail')?.value;
  const name = cookieStore.get('userName')?.value;
  if (!role || !demoRoles.includes(role)) return null;
  return { id: email || `demo:${name || role}`, name, email, role, isDemo: !email };
}

export function isTrustBackendEnabled() {
  return process.env.TRUST_BACKEND_ENABLED === 'true';
}

export function canManageConsent(actor: BackendActor) {
  return ['parent', 'teacher', 'school_head', 'school_admin', 'national_admin'].includes(actor.role);
}

export function canManageSchool(actor: BackendActor) {
  return ['school_head', 'school_admin', 'county_officer', 'national_admin'].includes(actor.role);
}

export function canManageSubjectData(actor: BackendActor, subjectId: string) {
  return actor.role === 'parent' || actor.role === 'school_head' || actor.role === 'school_admin' || actor.role === 'national_admin' || actor.id === subjectId;
}

export async function persistTrustRecord(collectionName: string, payload: Record<string, unknown>) {
  if (!isTrustBackendEnabled()) {
    return { persisted: false, mode: 'demo' as const, id: `demo-${crypto.randomUUID()}` };
  }
  const record = await addDoc(collection(db, collectionName), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return { persisted: true, mode: 'firestore' as const, id: record.id };
}
