import { describe, expect, it } from 'vitest'
import {
  applyAdaptiveDecision,
  buildAdaptiveDecisionRequest,
  createAdaptiveQuestionBridge,
} from '@/lib/progress/adaptive-question-bridge'
import { createLearningLoop } from '@/lib/progress/student-learning-loop'

describe('adaptive question bridge', () => {
  const request = buildAdaptiveDecisionRequest({
    state: createLearningLoop({ lessonId: 'fractions-1', masteryThreshold: 2 }),
    grade: 'Grade 2',
    subject: 'Mathematics',
    competency: 'MATH.G2.FRACTIONS',
    currentIndex: 0,
    totalQuestions: 3,
    lastCorrect: true,
    interest: 'octopus',
    masteryThreshold: 2,
    answer: '1/2',
  })

  it('uses a deterministic privacy-safe fallback', async () => {
    const decision = await createAdaptiveQuestionBridge().decide(request)
    expect(decision.action).toBe('advance')
    expect(decision.nextIndex).toBe(1)
    expect(decision.source).toBe('fallback')
    expect(decision.mettaQuery).toContain('interest-anchor=true')
    expect(decision.mettaQuery).not.toContain('octopus')
  })

  it('accepts a native decision without exposing raw request text', async () => {
    const bridge = createAdaptiveQuestionBridge(async input => ({
      action: 'retry',
      nextIndex: input.currentIndex,
      difficultyDelta: -1,
      interestAnchorPresent: Boolean(input.interest),
      mettaQuery: '!(syncsenta-next-question native=true)',
    }))
    const decision = await bridge.decide(request)
    expect(decision.source).toBe('native')
    expect(decision.action).toBe('retry')
    expect(decision.mettaQuery).not.toContain('octopus')
  })

  it('falls back if native policy is unavailable', async () => {
    const bridge = createAdaptiveQuestionBridge(async () => {
      throw new Error('native bridge unavailable')
    })
    const decision = await bridge.decide(request)
    expect(decision.source).toBe('fallback')
    expect(decision.action).toBe('advance')
  })

  it('applies the verified answer to the resumable loop', () => {
    const next = applyAdaptiveDecision(request.state, { lastCorrect: true, answer: request.answer })
    expect(next.attemptCount).toBe(1)
    expect(next.correctCount).toBe(1)
    expect(next.currentIndex).toBe(1)
  })
})
