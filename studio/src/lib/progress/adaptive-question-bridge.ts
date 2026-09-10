import {
  evaluateAttempt,
  type LearningLoopState,
} from '@/lib/student-learning-loop'

export type AdaptiveDecisionAction = 'retry' | 'advance' | 'complete'

export interface AdaptiveDecisionRequest {
  lessonId: string
  grade: string
  subject: string
  competency: string
  currentIndex: number
  totalQuestions: number
  attemptCount: number
  correctCount: number
  hintLevel: number
  lastCorrect: boolean
  interest?: string
  masteryThreshold: number
  state: LearningLoopState
  answer: string
}

export interface AdaptiveDecision {
  action: AdaptiveDecisionAction
  nextIndex: number
  difficultyDelta: number
  interestAnchorPresent: boolean
  mettaQuery: string
  source: 'native' | 'fallback'
}

export type NativeAdaptiveDecision = (
  request: Omit<AdaptiveDecisionRequest, 'state' | 'answer'>,
) => Promise<Omit<AdaptiveDecision, 'source'> | null>

export interface AdaptiveQuestionBridge {
  decide(request: AdaptiveDecisionRequest): Promise<AdaptiveDecision>
}

function sanitizeAtom(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120)
}

function fallbackDecision(request: AdaptiveDecisionRequest): AdaptiveDecision {
  const mastered = request.correctCount >= request.masteryThreshold
  const action: AdaptiveDecisionAction = mastered
    ? 'complete'
    : request.lastCorrect && request.currentIndex + 1 < request.totalQuestions
      ? 'advance'
      : request.lastCorrect
        ? 'complete'
        : 'retry'
  const nextIndex = action === 'advance' ? request.currentIndex + 1 : request.currentIndex
  const interestAnchorPresent = Boolean(request.interest?.trim())
  return {
    action,
    nextIndex,
    difficultyDelta: action === 'retry' && request.hintLevel >= 2 ? -1 : 0,
    interestAnchorPresent,
    mettaQuery: `!(syncsenta-next-question lesson=${sanitizeAtom(request.lessonId)} competency=${sanitizeAtom(request.competency)} index=${request.currentIndex} attempts=${request.attemptCount} correct=${request.correctCount} hint-level=${request.hintLevel} interest-anchor=${interestAnchorPresent} mastery=${request.masteryThreshold})`,
    source: 'fallback',
  }
}

export function createServerAdaptiveDecision(): NativeAdaptiveDecision | undefined {
  if (process.env.NEXT_PUBLIC_SYNC_SENTA_ADAPTIVE_ROUTE !== 'true') return undefined
  return async request => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 120)
    try {
      const response = await fetch('/api/student/adaptive-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      })
      if (!response.ok) return null
      const payload = await response.json() as Partial<Omit<AdaptiveDecision, 'source'>>
      if (
        (payload.action !== 'retry' && payload.action !== 'advance' && payload.action !== 'complete') ||
        !Number.isInteger(payload.nextIndex) ||
        !Number.isInteger(payload.difficultyDelta) ||
        typeof payload.interestAnchorPresent !== 'boolean' ||
        typeof payload.mettaQuery !== 'string'
      ) return null
      return {
        action: payload.action,
        nextIndex: payload.nextIndex as number,
        difficultyDelta: payload.difficultyDelta as number,
        interestAnchorPresent: payload.interestAnchorPresent,
        mettaQuery: payload.mettaQuery,
      }
    } catch {
      return null
    } finally {
      window.clearTimeout(timeoutId)
    }
  }
}

export function createAdaptiveQuestionBridge(nativeDecision?: NativeAdaptiveDecision): AdaptiveQuestionBridge {
  return {
    async decide(request) {
      if (nativeDecision) {
        try {
          const native = await nativeDecision({
            lessonId: request.lessonId,
            grade: request.grade,
            subject: request.subject,
            competency: request.competency,
            currentIndex: request.currentIndex,
            totalQuestions: request.totalQuestions,
            attemptCount: request.attemptCount,
            correctCount: request.correctCount,
            hintLevel: request.hintLevel,
            lastCorrect: request.lastCorrect,
            interest: request.interest,
            masteryThreshold: request.masteryThreshold,
          })
          if (native) return { ...native, source: 'native' }
        } catch {
          // Native policy is advisory at this boundary; local policy remains safe.
        }
      }
      return fallbackDecision(request)
    },
  }
}

export function buildAdaptiveDecisionRequest(input: {
  state: LearningLoopState
  grade: string
  subject: string
  competency: string
  currentIndex: number
  totalQuestions: number
  lastCorrect: boolean
  interest?: string
  masteryThreshold: number
  answer: string
}): AdaptiveDecisionRequest {
  return {
    lessonId: input.state.lessonId,
    grade: input.grade,
    subject: input.subject,
    competency: input.competency,
    currentIndex: input.currentIndex,
    totalQuestions: input.totalQuestions,
    attemptCount: input.state.attemptCount,
    correctCount: input.state.correctCount,
    hintLevel: input.state.hintLevel,
    lastCorrect: input.lastCorrect,
    interest: input.interest,
    masteryThreshold: input.masteryThreshold,
    state: input.state,
    answer: input.answer,
  }
}

export function applyAdaptiveDecision(
  state: LearningLoopState,
  request: Pick<AdaptiveDecisionRequest, 'lastCorrect' | 'answer'>,
): LearningLoopState {
  return evaluateAttempt(state, {
    correct: request.lastCorrect,
    answer: request.answer,
  })
}
