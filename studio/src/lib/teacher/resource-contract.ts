import type { TeacherResource } from '@/lib/types';

export const MAX_TEACHER_RESOURCE_CONTENT_LENGTH = 1_000_000;

const RESOURCE_TYPES: readonly TeacherResource['type'][] = [
  'Lesson Plan',
  'Scheme of Work',
  'Rubric',
  'Worksheet',
  'Differentiated Worksheet',
  'AI Tutor Context',
  'Other',
];

export type CreateTeacherResourceInput = {
  title: string;
  type: TeacherResource['type'];
  content: string;
  grade?: string;
  subject?: string;
  joinCode?: string;
};

function optionalText(value: unknown, maximumLength: number): string | undefined | null {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > maximumLength ? null : text || undefined;
}

export function parseCreateTeacherResourceInput(
  value: unknown,
): CreateTeacherResourceInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;

  if (
    typeof body.title !== 'string' ||
    typeof body.type !== 'string' ||
    typeof body.content !== 'string'
  ) {
    return null;
  }

  const title = body.title.trim();
  if (!title || title.length > 200 || !body.content.trim()) return null;
  if (new TextEncoder().encode(body.content).byteLength > MAX_TEACHER_RESOURCE_CONTENT_LENGTH) return null;
  if (!RESOURCE_TYPES.includes(body.type as TeacherResource['type'])) return null;

  const grade = optionalText(body.grade, 40);
  const subject = optionalText(body.subject, 100);
  const joinCode = optionalText(body.joinCode, 100);
  if (grade === null || subject === null || joinCode === null) return null;

  return {
    title,
    type: body.type as TeacherResource['type'],
    content: body.content,
    ...(grade ? { grade } : {}),
    ...(subject ? { subject } : {}),
    ...(joinCode ? { joinCode } : {}),
  };
}
