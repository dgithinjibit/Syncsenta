import type { TeacherResource } from '@/lib/types';
import type { CreateTeacherResourceInput } from './resource-contract';

type ResourceResponse = { resource: TeacherResource };
type ResourcesResponse = { resources: TeacherResource[] };

async function responseJson<T>(response: Response): Promise<T> {
  try {
    return await response.json() as T;
  } catch {
    throw new Error('The resource service returned an invalid response.');
  }
}

async function throwResponseError(response: Response): Promise<never> {
  const body = await responseJson<{ error?: string }>(response);
  throw new Error(body.error || `Resource request failed (${response.status}).`);
}

export async function saveTeacherResource(
  input: CreateTeacherResourceInput,
): Promise<TeacherResource> {
  const response = await fetch('/api/teacher/resources', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) return throwResponseError(response);
  const body = await responseJson<ResourceResponse>(response);
  return body.resource;
}

export async function getTeacherResources(): Promise<TeacherResource[]> {
  const response = await fetch('/api/teacher/resources', {
    credentials: 'same-origin',
  });

  if (!response.ok) return throwResponseError(response);
  const body = await responseJson<ResourcesResponse>(response);
  return body.resources;
}

export async function deleteTeacherResource(id: string): Promise<void> {
  const response = await fetch(`/api/teacher/resources?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });

  if (!response.ok) return throwResponseError(response);
}
