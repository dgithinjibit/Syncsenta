export type SandboxProvider = 'gemini' | 'local_template' | 'not_configured';
export type SandboxArtifactKind = 'image' | 'video' | 'presentation';

export interface SandboxProviderPlan {
  provider: SandboxProvider;
  model: string | null;
  enabled: boolean;
  reason: 'configured' | 'feature_disabled' | 'missing_api_key' | 'local_fallback';
}

function enabledFlag(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

/**
 * Server-only provider selection. It never returns or logs credentials.
 * Generation stays disabled unless the deployment explicitly opts in.
 */
export function selectSandboxProvider(
  kind: SandboxArtifactKind,
  env: Record<string, string | undefined> = process.env,
): SandboxProviderPlan {
  if (kind === 'presentation') {
    return { provider: 'local_template', model: null, enabled: true, reason: 'local_fallback' };
  }

  const hasGeminiKey = Boolean(env.GEMINI_API_KEY);
  const mediaEnabled = enabledFlag(env.SYNC_SENTA_ENABLE_MEDIA_GENERATION);
  if (!hasGeminiKey) {
    return { provider: 'not_configured', model: null, enabled: false, reason: 'missing_api_key' };
  }
  if (!mediaEnabled) {
    return { provider: 'gemini', model: null, enabled: false, reason: 'feature_disabled' };
  }

  const model = kind === 'image'
    ? env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image'
    : env.GEMINI_VIDEO_MODEL || 'gemini-omni-flash';
  return { provider: 'gemini', model, enabled: true, reason: 'configured' };
}

export interface SandboxProviderPreflight {
  workerEnabled: boolean;
  mediaGenerationEnabled: boolean;
  childVideoEnabled: boolean;
  geminiKeyPresent: boolean;
  imageProviderReady: boolean;
  videoProviderReady: boolean;
  presentationProviderReady: boolean;
  status: 'ready_for_mocked_activation' | 'blocked_missing_secret' | 'blocked_feature_flag' | 'safe_local_only';
}

/**
 * Returns a redacted activation report for deployment checks. It deliberately
 * exposes no key material and does not imply that real provider calls are safe
 * until authenticated role probes and moderation evidence are complete.
 */
export function getSandboxProviderPreflight(
  env: Record<string, string | undefined> = process.env,
): SandboxProviderPreflight {
  const workerEnabled = enabledFlag(env.SYNC_SENTA_ENABLE_ARTIFACT_WORKER);
  const mediaGenerationEnabled = enabledFlag(env.SYNC_SENTA_ENABLE_MEDIA_GENERATION);
  const childVideoEnabled = enabledFlag(env.SYNC_SENTA_ENABLE_CHILD_VIDEO);
  const geminiKeyPresent = Boolean(env.GEMINI_API_KEY);
  const imageProviderReady = geminiKeyPresent && mediaGenerationEnabled;
  const videoProviderReady = imageProviderReady && childVideoEnabled;
  const presentationProviderReady = true;

  let status: SandboxProviderPreflight['status'] = 'safe_local_only';
  if (imageProviderReady && workerEnabled) status = 'ready_for_mocked_activation';
  else if (!geminiKeyPresent && mediaGenerationEnabled) status = 'blocked_missing_secret';
  else if (geminiKeyPresent && !mediaGenerationEnabled) status = 'blocked_feature_flag';

  return {
    workerEnabled,
    mediaGenerationEnabled,
    childVideoEnabled,
    geminiKeyPresent,
    imageProviderReady,
    videoProviderReady,
    presentationProviderReady,
    status,
  };
}

export function providerIsAllowedForChildFacing(
  kind: SandboxArtifactKind,
  plan: SandboxProviderPlan,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (!plan.enabled) return false;
  if (kind === 'video' && plan.provider === 'gemini') {
    return enabledFlag(env.SYNC_SENTA_ENABLE_CHILD_VIDEO);
  }
  return kind === 'image' && plan.provider === 'gemini' || kind === 'presentation' && plan.provider === 'local_template';
}
