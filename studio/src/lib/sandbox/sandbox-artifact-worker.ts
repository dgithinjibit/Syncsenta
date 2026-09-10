import { providerIsAllowedForChildFacing, type SandboxArtifactKind, type SandboxProviderPlan } from './sandbox-provider';

export type WorkerArtifactStatus = 'queued' | 'processing' | 'ready' | 'failed' | 'cancelled';

export interface WorkerArtifactJob {
  id: string;
  artifactType: SandboxArtifactKind;
  prompt: string;
  grade: string;
  subject: string;
  competency: string | null;
  consentVerified: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  status: WorkerArtifactStatus;
  expiresAt: string;
  cancelRequestedAt?: string | null;
}

export interface ProviderArtifactResult {
  storagePath: string;
  containsLearnerData: boolean;
  moderationPassed: boolean;
}

export interface SandboxArtifactProvider {
  generate(job: WorkerArtifactJob, signal: AbortSignal): Promise<ProviderArtifactResult>;
}

export interface WorkerDecision {
  status: WorkerArtifactStatus;
  nextAction: 'human_review' | 'provider_retry' | 'none';
  errorCode: string | null;
  provider: SandboxProviderPlan['provider'];
  storagePath?: string;
}

export interface WorkerOptions {
  now?: Date;
  env?: Record<string, string | undefined>;
  dailyQuotaUsed?: number;
  dailyQuotaLimit?: number;
  timeoutMs?: number;
}

const DEFAULT_DAILY_QUOTA = 10;
const DEFAULT_TIMEOUT_MS = 30_000;

function decision(
  status: WorkerArtifactStatus,
  nextAction: WorkerDecision['nextAction'],
  errorCode: string | null,
  provider: SandboxProviderPlan['provider'],
): WorkerDecision {
  return { status, nextAction, errorCode, provider };
}

function timedGenerate(
  provider: SandboxArtifactProvider,
  job: WorkerArtifactJob,
  timeoutMs: number,
): Promise<ProviderArtifactResult> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error('provider_timeout'));
    }, timeoutMs);
  });

  return Promise.race([provider.generate(job, controller.signal), timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

/**
 * Worker policy boundary. Persistence and storage updates belong to the caller;
 * this function decides whether a queued job may cross into a provider call.
 */
export async function processSandboxArtifact(
  job: WorkerArtifactJob,
  plan: SandboxProviderPlan,
  provider: SandboxArtifactProvider | null,
  options: WorkerOptions = {},
): Promise<WorkerDecision> {
  const now = options.now ?? new Date();
  const quotaLimit = options.dailyQuotaLimit ?? DEFAULT_DAILY_QUOTA;
  const quotaUsed = options.dailyQuotaUsed ?? 0;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (job.status === 'cancelled' || job.cancelRequestedAt) return decision('cancelled', 'none', 'cancel_requested', plan.provider);
  if (new Date(job.expiresAt).getTime() <= now.getTime()) return decision('failed', 'none', 'artifact_expired', plan.provider);
  if (!job.consentVerified) return decision('failed', 'none', 'consent_verification_required', plan.provider);
  if (job.moderationStatus === 'rejected') return decision('failed', 'none', 'moderation_rejected', plan.provider);
  if (job.moderationStatus !== 'approved') return decision('queued', 'human_review', 'moderation_required', plan.provider);
  if (quotaUsed >= quotaLimit) return decision('failed', 'none', 'daily_quota_exceeded', plan.provider);
  if (!provider || !plan.enabled || !providerIsAllowedForChildFacing(job.artifactType, plan, options.env)) {
    return decision('queued', 'provider_retry', 'provider_not_ready', plan.provider);
  }

  try {
    const result = await timedGenerate(provider, job, timeoutMs);
    if (!result.storagePath || result.containsLearnerData || !result.moderationPassed) {
      return decision('failed', 'none', 'provider_output_rejected', plan.provider);
    }
    return { ...decision('ready', 'none', null, plan.provider), storagePath: result.storagePath };
  } catch (error) {
    const errorCode = error instanceof Error ? error.message : 'provider_failed';
    return decision('queued', 'provider_retry', errorCode, plan.provider);
  }
}
