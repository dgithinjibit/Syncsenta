export type SandboxArtifactType = 'image' | 'video' | 'presentation';

export interface SandboxArtifactRequestInput {
  artifactType: SandboxArtifactType;
  prompt: string;
  grade: string;
  subject: string;
  competency?: string;
  consentVersion: string;
  consentVerified: boolean;
  studentProfileId?: string;
}

export interface SandboxArtifactInsert {
  artifact_type: SandboxArtifactType;
  prompt: string;
  grade: string;
  subject: string;
  competency: string | null;
  consent_version: string;
  consent_verified: true;
  student_profile_id: string | null;
  status: 'queued';
  moderation_status: 'pending';
  provider: 'not_configured';
  storage_path: null;
  expires_at: string;
}

const MAX_PROMPT_LENGTH = 2000;
const MAX_GRADE_LENGTH = 40;
const MAX_SUBJECT_LENGTH = 80;
const MAX_COMPETENCY_LENGTH = 160;
const MAX_CONSENT_VERSION_LENGTH = 80;

function bounded(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function buildSandboxArtifactInsert(input: SandboxArtifactRequestInput): SandboxArtifactInsert {
  const prompt = bounded(input.prompt, MAX_PROMPT_LENGTH);
  const grade = bounded(input.grade, MAX_GRADE_LENGTH);
  const subject = bounded(input.subject, MAX_SUBJECT_LENGTH);
  const competency = bounded(input.competency, MAX_COMPETENCY_LENGTH);
  const consentVersion = bounded(input.consentVersion, MAX_CONSENT_VERSION_LENGTH);

  if (!['image', 'video', 'presentation'].includes(input.artifactType)) {
    throw new Error('unsupported_artifact_type');
  }
  if (!prompt || !grade || !subject || !consentVersion) throw new Error('missing_artifact_metadata');
  if (!input.consentVerified) throw new Error('consent_verification_required');
  if (input.studentProfileId && !/^[0-9a-f-]{36}$/i.test(input.studentProfileId)) {
    throw new Error('invalid_student_profile_id');
  }

  return {
    artifact_type: input.artifactType,
    prompt,
    grade,
    subject,
    competency: competency || null,
    consent_version: consentVersion,
    consent_verified: true,
    student_profile_id: input.studentProfileId ?? null,
    status: 'queued',
    moderation_status: 'pending',
    provider: 'not_configured',
    storage_path: null,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
}
