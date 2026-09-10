import type {
  ProviderArtifactResult,
  SandboxArtifactProvider,
  WorkerArtifactJob,
} from './sandbox-artifact-worker'
import { selectSandboxProvider, type SandboxArtifactKind } from './sandbox-provider'

export interface SandboxProviderRuntime {
  generate(job: WorkerArtifactJob, signal: AbortSignal): Promise<ProviderArtifactResult>
}

export interface SandboxProviderRuntimeDependencies {
  generateImage?: (input: { prompt: string; grade: string; subject: string; competency: string | null }, signal: AbortSignal) => Promise<Uint8Array>
  generateVideo?: (input: { prompt: string; grade: string; subject: string; competency: string | null }, signal: AbortSignal) => Promise<Uint8Array>
  upload?: (input: { artifactId: string; kind: SandboxArtifactKind; bytes: Uint8Array; contentType: string }) => Promise<string>
  env?: Record<string, string | undefined>
}

/**
 * Creates the server-side provider seam used by the artifact worker.
 * Generation is intentionally dependency-injected: a deployment must supply
 * the provider implementation and Storage uploader explicitly. This prevents
 * a browser request or a missing SDK/key from silently becoming a provider call.
 */
export function createSandboxProvider(
  job: WorkerArtifactJob,
  dependencies: SandboxProviderRuntimeDependencies = {},
): SandboxArtifactProvider | null {
  const plan = selectSandboxProvider(job.artifactType, dependencies.env)
  if (!plan.enabled || plan.provider !== 'gemini') return null

  const generator = job.artifactType === 'image'
    ? dependencies.generateImage
    : dependencies.generateVideo
  const upload = dependencies.upload
  if (!generator || !upload) return null

  return {
    async generate(currentJob, signal) {
      const bytes = await generator(
        {
          prompt: currentJob.prompt,
          grade: currentJob.grade,
          subject: currentJob.subject,
          competency: currentJob.competency,
        },
        signal,
      )
      const contentType = currentJob.artifactType === 'image' ? 'image/png' : 'video/mp4'
      const storagePath = await upload({
        artifactId: currentJob.id,
        kind: currentJob.artifactType,
        bytes,
        contentType,
      })
      return {
        storagePath,
        containsLearnerData: false,
        moderationPassed: true,
      }
    },
  }
}

export function providerRuntimeFrom(
  job: WorkerArtifactJob,
  dependencies: SandboxProviderRuntimeDependencies,
): SandboxProviderRuntime | null {
  return createSandboxProvider(job, dependencies)
}
