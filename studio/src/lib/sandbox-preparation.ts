import { gradeNameToId } from '@/lib/curriculum/grade-id';
import { getActivitiesForGradeSubject } from '@/lib/sandbox/sandbox-activities';
import type { GradeId, SubjectId } from '@/lib/sandbox/sandbox-types';

export interface SandboxPreparation {
  grade: string;
  gradeId: GradeId;
  subject: string;
  subjectId: SubjectId | null;
  firstActivityId: string | null;
  preparedAt: string;
}

export function subjectToSandboxId(subject: string): SubjectId | null {
  const normalized = subject.toLowerCase();
  if (normalized.includes('math')) return 'mathematics';
  if (normalized.includes('kiswahili')) return 'kiswahili';
  if (normalized.includes('environment')) return 'environmental';
  if (normalized.includes('social')) return 'social-studies';
  if (normalized.includes('creative')) return 'creative';
  if (normalized.includes('english')) return 'english';
  if (normalized === 'cre' || normalized.includes('religious')) return 'cre';
  if (normalized.includes('indigenous')) return 'indigenous';
  return null;
}

export function subjectToLearningSlug(subject: string): string {
  const normalized = subject.toLowerCase();
  if (normalized.includes('blockchain')) return 'blockchain';
  if (normalized.includes('financial')) return 'financial-literacy';
  if (normalized === 'agi' || normalized.includes('artificial intelligence') || normalized === 'ai') return 'ai';
  if (normalized.includes('math')) return 'mathematics';
  if (normalized.includes('kiswahili')) return 'kiswahili';
  if (normalized.includes('environment')) return 'environmental';
  if (normalized.includes('social')) return 'social-studies';
  if (normalized.includes('creative')) return 'creative';
  if (normalized.includes('english')) return 'english';
  if (normalized.includes('religious') || normalized === 'cre') return 'cre';
  if (normalized.includes('indigenous')) return 'indigenous';
  return subjectToSandboxId(subject) ?? 'mathematics';
}

export function getSubjectLearningPath(grade: string, subject: string): string {
  const gradeMatch = grade.trim().match(/(?:grade[- ]?|g)([1-9])$/i);
  const gradeId = gradeMatch ? `g${gradeMatch[1]}` : gradeNameToId(grade);
  const subjectId = subjectToSandboxId(subject);
  if (subjectId) return `/student/sandbox/${gradeId}/${subjectId}`;
  return `/student/subject/${encodeURIComponent(subjectToLearningSlug(subject))}`;
}

export function prepareSandboxForSubject(grade: string, subject: string): SandboxPreparation {
  const gradeMatch = grade.trim().match(/(?:grade[- ]?|g)([1-9])$/i);
  const gradeId = (gradeMatch ? `g${gradeMatch[1]}` : gradeNameToId(grade)) as GradeId;
  const subjectId = subjectToSandboxId(subject);
  const firstActivity = subjectId ? getActivitiesForGradeSubject(gradeId, subjectId)[0] : null;
  return {
    grade,
    gradeId,
    subject,
    subjectId,
    firstActivityId: firstActivity?.id ?? null,
    preparedAt: new Date().toISOString(),
  };
}

export function cacheSandboxPreparation(preparation: SandboxPreparation): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem('learningJourney.sandboxPreparation', JSON.stringify(preparation));
}

export function readSandboxPreparation(): SandboxPreparation | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem('learningJourney.sandboxPreparation');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SandboxPreparation;
  } catch {
    return null;
  }
}
