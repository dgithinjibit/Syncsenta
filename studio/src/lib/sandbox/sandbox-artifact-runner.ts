import { getSupabaseServerClient } from '../supabase/server';
import { processSandboxArtifact, type SandboxArtifactProvider, type WorkerArtifactJob } from './sandbox-artifact-worker';
import { selectSandboxProvider } from './sandbox-provider';
import { createSandboxProvider, type SandboxProviderRuntimeDependencies } from './sandbox-provider-runtime';
import { checkProductionFixtureGuard } from '../production-fixture-guard';

export interface RunnerResult {
  state: 'disabled' | 'idle' | 'processed';
  artifactId?: string;
  status?: string;
  errorCode?: string | null;
}

function isEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.SYNC_SENTA_ENABLE_ARTIFACT_WORKER === 'true' || env.SYNC_SENTA_ENABLE_ARTIFACT_WORKER === '1';
}

function jobFromClaim(row: Record<string, unknown>): WorkerArtifactJob {
  return {
    id: String(row.id),
    artifactType: row.artifact_type as WorkerArtifactJob['artifactType'],
    prompt: String(row.prompt),
    grade: String(row.grade),
    subject: String(row.subject),
    competency: typeof row.competency === 'string' ? row.competency : null,
    consentVerified: row.consent_verified === true,
    moderationStatus: row.moderation_status as WorkerArtifactJob['moderationStatus'],
    status: row.status as WorkerArtifactJob['status'],
    expiresAt: String(row.expires_at),
    cancelRequestedAt: typeof row.cancel_requested_at === 'string' ? row.cancel_requested_at : null,
  };
}

/**
 * Processes at most one artifact. The default is disabled and safe: no claim,
 * provider call, or database mutation occurs unless explicitly enabled.
 */
export async function runSandboxArtifactWorkerOnce(options: {
  workerId?: string;
  provider?: SandboxArtifactProvider | null;
  dailyQuotaUsed?: number;
  dailyQuotaLimit?: number;
  timeoutMs?: number;
  env?: Record<string, string | undefined>;
  supabase?: ReturnType<typeof getSupabaseServerClient>;
  providerRuntime?: SandboxProviderRuntimeDependencies;
} = {}): Promise<RunnerResult> {
  if (!isEnabled(options.env)) return { state: 'disabled' };
  const productionGuard = checkProductionFixtureGuard(options.env);
  if (!productionGuard.allowed) return { state: 'disabled', errorCode: 'production_configuration_blocked' };

  const workerId = options.workerId ?? `sandbox-worker-${process.pid}`;
  const supabase = options.supabase ?? getSupabaseServerClient();
  const { data: claimed, error: claimError } = await supabase
    .rpc('claim_sandbox_artifact', { p_worker_id: workerId })
    .maybeSingle();

  if (claimError) throw new Error('artifact_claim_failed');
  if (!claimed) return { state: 'idle' };

  const job = jobFromClaim(claimed);
  const plan = selectSandboxProvider(job.artifactType, options.env);
  const runtimeProvider = options.provider ?? createSandboxProvider(job, {
    ...(options.providerRuntime ?? {}),
    env: options.env,
  });
  const decision = await processSandboxArtifact(job, plan, runtimeProvider, {
    dailyQuotaUsed: options.dailyQuotaUsed,
    dailyQuotaLimit: options.dailyQuotaLimit,
    timeoutMs: options.timeoutMs,
    env: options.env,
  });

  const patch = decision.status === 'ready'
    ? { status: 'ready' as const, storage_path: decision.storagePath ?? null, provider: decision.provider, error_code: null, last_error: null, updated_at: new Date().toISOString() }
    : { status: decision.status, error_code: decision.errorCode, last_error: decision.errorCode, updated_at: new Date().toISOString() };

  const { error: updateError } = await supabase
    .from('sandbox_artifacts')
    .update(patch)
    .eq('id', job.id)
    .eq('status', 'processing');
  if (updateError) throw new Error('artifact_persist_failed');

  return { state: 'processed', artifactId: job.id, status: decision.status, errorCode: decision.errorCode };
}
