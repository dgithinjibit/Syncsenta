"use client"

/**
 * InteractiveSandbox — Phase 1 of the MeTTa Cognitive Data Streams pillar.
 *
 * The sandbox is the foundation of the entire adaptive-learning system
 * (see `.kiro/METTA_KEY_INSIGHTS.md`): without it, chat-only interaction
 * produces no behavioural signal, and Phase 2 (Analysis/Intervention
 * agents) has nothing to read.
 *
 * What this component captures, end-to-end:
 *
 *   1. Dwell time   — hover-over-target intervals, per target.
 *   2. Pathing      — ordered sequence of clicks/drags so the path can
 *                     be replayed and classified (linear/exploratory/
 *                     circular).
 *   3. Erasure rate — undo + erase events vs. constructive actions.
 *   4. Tool usage   — which manipulative the learner picked, and how
 *                     often they switched.
 *
 * Two activity types ship in this first cut:
 *
 *   - `fractions`   — drag fraction bars into an answer box.
 *   - `counting`    — drag counting tokens to match a target number.
 *
 * The component stays self-contained: it owns its canvas, hit-tests in
 * canvas-space, and POSTs the full batch to `/telemetry/capture` on
 * submit. The backend persists raw events + behavioural profile + xAPI
 * statements (see `ai-agents/.../telemetry_api.py`) — the frontend does
 * not need to know about that.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, RotateCcw, Send, Eraser, Sparkles } from 'lucide-react'
import { buildApiUrl, API_ENDPOINTS } from '@/lib/api-config'
import { getRenderScale, toLogicalPoint, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '@/lib/sandbox/sandbox-geometry'
import {
  buildTutorContext,
  createLearningLoop,
  enqueueLearningEvent,
  getNextHint,
  restoreLearningLoop,
  serializeLearningLoop,
  type LearningEvent,
  type LearningLoopState,
} from '@/lib/progress/student-learning-loop'
import { buildAdaptiveLearningStep } from '@/lib/sandbox/sandbox-personalization'
import { applyAdaptiveDecision, buildAdaptiveDecisionRequest, createAdaptiveQuestionBridge, createServerAdaptiveDecision } from '@/lib/progress/adaptive-question-bridge'
import { resolveTeacherApprovedMedia, type TeacherApprovedSandboxMedia } from '@/lib/sandbox/sandbox-media'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SandboxActivityType = 'fractions' | 'counting'

/**
 * One question in a micro-assessment loop. The lesson advances through
 * the list and is marked mastered once `masteryThreshold` are answered
 * correctly (or the list is exhausted, whichever comes first).
 */
export interface SandboxVariation {
  question: string
  correctAnswerValue: number
  correctAnswerLabel?: string
}

/**
 * Per-variation result captured for the structured `onComplete` payload
 * so parents (root page, deep route) can persist the right metric.
 */
export interface VariationAttempt {
  index: number
  question: string
  studentAnswerValue: number
  studentAnswerLabel: string
  correct: boolean
  durationMs: number
}

export interface SandboxCompletionResult {
  /** True iff `masteryThreshold` variations were answered correctly. */
  mastered: boolean
  /** Number of correct variations (0..variations.length). */
  score: number
  /** Total elapsed ms from first variation start to completion. */
  timeSpent: number
  attempts: VariationAttempt[]
}

export interface TelemetryEvent {
  timestamp: number
  event_type:
    | 'click'
    | 'hover'
    | 'drag'
    | 'drop'
    | 'undo'
    | 'erase'
    | 'tool_select'
    | 'object_modify'
    | 'submit'
    | 'input'
  target: string
  position?: [number, number]
  duration?: number
  metadata?: Record<string, unknown>
}

interface DraggableToken {
  id: string
  label: string
  value: number              // numeric meaning of the token (e.g. 0.5 for 1/2)
  x: number
  y: number
  w: number
  h: number
  color: string
  inDropZone: boolean        // true once the learner has dragged it into the answer box
}

interface InteractiveSandboxProps {
  activityType: SandboxActivityType
  competency: string
  grade: string
  subject: string
  question: string
  /**
   * Numeric correct answer. The sandbox computes the student's answer
   * from the dropped tokens (sum of values) and compares with a small
   * tolerance.
   */
  correctAnswerValue: number
  /** Display label, e.g. "3/4" or "5". Not used for grading. */
  correctAnswerLabel?: string
  studentId?: string
  /**
   * Optional micro-assessment variations (Synthesis-style mastery
   * gating). When provided, the first variation overrides
   * `question`/`correctAnswerValue`/`correctAnswerLabel`; subsequent
   * variations are advanced to on each correct submission.
   *
   * If omitted, the sandbox behaves as a single-shot question.
   */
  variations?: SandboxVariation[]
  /**
   * Number of correct variations needed to mark the lesson mastered.
   * Defaults to `variations.length` (mastery requires all of them) but
   * a smaller number (e.g. 2 of 3) gives the Synthesis behaviour where
   * a consistent streak ends the lesson early.
   */
  masteryThreshold?: number
  /**
   * Stable id for the lesson session that spans variations. Each
   * variation gets its OWN `session_id` (so the backend's
   * `behavioral_profiles` upsert on `session_id` doesn't stomp the
   * earlier variation's profile) but they all share this `lesson_id`
   * in `activity_data` so the misconception pipeline can group them.
   */
  lessonId?: string
  /** Optional teacher-approved video; unsafe or mismatched assets never render. */
  media?: TeacherApprovedSandboxMedia
  onComplete?: (result: SandboxCompletionResult) => void
  /** Resume from a specific variation index (0-based). Used by the
   *  Redis resume-point feature on the activity page. */
  initialVariationIndex?: number
}

// ---------------------------------------------------------------------------
// Activity definitions
// ---------------------------------------------------------------------------

const DROP_ZONE = { x: 360, y: 90, w: 180, h: 110 }
const adaptiveQuestionBridge = createAdaptiveQuestionBridge(createServerAdaptiveDecision())

function makeFractionTokens(): DraggableToken[] {
  return [
    { id: 'frac_1_2', label: '1/2', value: 0.5, x: 40, y: 40, w: 110, h: 60, color: '#3b82f6', inDropZone: false },
    { id: 'frac_1_3', label: '1/3', value: 1 / 3, x: 40, y: 110, w: 90, h: 60, color: '#8b5cf6', inDropZone: false },
    { id: 'frac_1_4', label: '1/4', value: 0.25, x: 40, y: 180, w: 70, h: 60, color: '#10b981', inDropZone: false },
    { id: 'frac_1_6', label: '1/6', value: 1 / 6, x: 160, y: 40, w: 50, h: 60, color: '#f59e0b', inDropZone: false },
    { id: 'frac_1_8', label: '1/8', value: 0.125, x: 160, y: 110, w: 40, h: 60, color: '#ef4444', inDropZone: false },
    { id: 'frac_1_12', label: '1/12', value: 1 / 12, x: 160, y: 180, w: 36, h: 60, color: '#ec4899', inDropZone: false },
  ]
}

function makeCountingTokens(): DraggableToken[] {
  const tokens: DraggableToken[] = []
  for (let i = 0; i < 10; i++) {
    tokens.push({
      id: `count_${i}`,
      label: '●',
      value: 1,
      x: 50 + (i % 5) * 50,
      y: 50 + Math.floor(i / 5) * 70,
      w: 40,
      h: 40,
      color: '#0ea5e9',
      inDropZone: false,
    })
  }
  return tokens
}

function makeInitialTokens(type: SandboxActivityType): DraggableToken[] {
  return type === 'fractions' ? makeFractionTokens() : makeCountingTokens()
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InteractiveSandbox({
  activityType,
  competency,
  grade,
  subject,
  question,
  correctAnswerValue,
  correctAnswerLabel,
  studentId,
  variations,
  masteryThreshold,
  lessonId,
  media,
  onComplete,
  initialVariationIndex = 0,
}: InteractiveSandboxProps) {
  // ----- Variation / lesson state -----------------------------------------
  //
  // The lesson is a sequence of one or more `SandboxVariation`s. If the
  // caller didn't pass `variations`, we synthesise a single-item list
  // from the legacy single-question props so the rest of the component
  // can treat both shapes uniformly.
  const lessonVariations: SandboxVariation[] = useMemo(
    () =>
      variations && variations.length > 0
        ? variations
        : [{ question, correctAnswerValue, correctAnswerLabel }],
    [variations, question, correctAnswerValue, correctAnswerLabel],
  )
  const masteryGoal = masteryThreshold ?? lessonVariations.length

  const [variationIndex, setVariationIndex] = useState(initialVariationIndex)
  const [correctCount, setCorrectCount] = useState(0)
  const [learningLoop, setLearningLoop] = useState<LearningLoopState>(() =>
    createLearningLoop({ lessonId: lessonId ?? 'sandbox-lesson', masteryThreshold: masteryGoal }),
  )
  const offlineEvents = useRef<LearningEvent[]>([])
  const attemptsRef = useRef<VariationAttempt[]>([])
  const variationStartRef = useRef<number>(Date.now())
  const lessonStartRef = useRef<number>(Date.now())
  const stableLessonId = useMemo(
    () => lessonId ?? `${grade}-${subject}-${question}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 120),
    [grade, lessonId, question, subject],
  )

  const currentVariation = lessonVariations[variationIndex] ?? lessonVariations[0]
  const activeCorrectAnswerValue = currentVariation.correctAnswerValue
  const activeCorrectAnswerLabel = currentVariation.correctAnswerLabel
  const activeQuestion = currentVariation.question

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tokens, setTokens] = useState<DraggableToken[]>(() => makeInitialTokens(activityType))
  // Undo stack — full token snapshots before each constructive action.
  // Snapshots-not-deltas is intentional: easier to test, and the
  // sandbox is small enough that memory doesn't matter.
  const undoStack = useRef<DraggableToken[][]>([])
  const events = useRef<TelemetryEvent[]>([])
  // One session_id PER variation. The backend upserts on session_id in
  // `behavioral_profiles`, so re-using a single id across variations
  // would silently overwrite the earlier variation's profile. We tie
  // variations together via `lesson_id` in `activity_data`.
  // Keep the server/client render identical; generate a unique telemetry
  // session only after hydration to avoid visible hydration mismatches.
  const [sessionId, setSessionId] = useState('pending')
  const [canSpeak, setCanSpeak] = useState(false)
  useEffect(() => {
    setSessionId(`sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
    setCanSpeak('speechSynthesis' in window)
  }, [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [interestText, setInterestText] = useState('')
  const interestInputRef = useRef<HTMLInputElement>(null)
  // Drag state — held in a ref because we don't want to re-render on
  // every pointer-move; canvas redraws are driven directly.
  const drag = useRef<{
    tokenId: string | null
    offsetX: number
    offsetY: number
    startedAt: number
    pathPoints: number
  }>({ tokenId: null, offsetX: 0, offsetY: 0, startedAt: 0, pathPoints: 0 })
  // Hover tracker — per-target dwell times.
  const hover = useRef<{ target: string | null; enteredAt: number }>({ target: null, enteredAt: 0 })
  const [eventCount, setEventCount] = useState(0)

  const tokensInZone = useMemo(
    () => tokens.filter((token) => inDropZone(token)),
    [tokens],
  )
  const currentAnswerValue = useMemo(
    () => tokensInZone.reduce((sum, token) => sum + token.value, 0),
    [tokensInZone],
  )
  const currentAnswerLabel = useMemo(
    () => tokensInZone.map((token) => token.label).join(' + ') || '(empty)',
    [tokensInZone],
  )

  const resolvedStudentId =
    studentId ||
    (typeof window !== 'undefined' && (localStorage.getItem('studentId') || localStorage.getItem('userId'))) ||
    'student_demo'
  const loopStorageKey = `syncsenta-learning-loop-${resolvedStudentId}-${stableLessonId}`
  const [hasRestoredState, setHasRestoredState] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const restored = restoreLearningLoop(
      window.localStorage.getItem(loopStorageKey),
      { lessonId: stableLessonId, masteryThreshold: masteryGoal },
    )
    if (restored) {
      setLearningLoop(restored.state)
      setCorrectCount(restored.state.correctCount)
      setVariationIndex(Math.min(restored.state.currentIndex, Math.max(lessonVariations.length - 1, 0)))
      setInterestText(restored.interestText)
    }
    setHasRestoredState(true)
  }, [lessonVariations.length, loopStorageKey, masteryGoal, stableLessonId])
  useEffect(() => {
    if (typeof window === 'undefined' || !hasRestoredState) return
    window.localStorage.setItem(
      loopStorageKey,
      serializeLearningLoop({ state: learningLoop, interestText }),
    )
  }, [hasRestoredState, interestText, learningLoop, loopStorageKey])

  const resolvedMedia = useMemo(
    () => resolveTeacherApprovedMedia({ media, competency }),
    [media, competency],
  )

  const adaptiveStep = useMemo(
    () =>
      buildAdaptiveLearningStep({
        baseQuestion: activeQuestion,
        subject,
        grade,
        competency,
        interestText,
        feedbackText: feedback ?? '',
        difficulty: 1,
      }),
    [activeQuestion, subject, grade, competency, interestText, feedback],
  )

  // ----- Event helpers -----------------------------------------------------

  const captureEvent = useCallback((evt: TelemetryEvent) => {
    events.current.push(evt)
    // Cheap state bump so the badge updates; the events array itself
    // stays in a ref to avoid render storms during a drag.
    setEventCount(events.current.length)
  }, [])

  // ----- Canvas drawing ----------------------------------------------------

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Keep a logical 600×300 coordinate system while scaling the backing store
    // to the CSS size. This keeps touch hit-testing identical on every device.
    const dpr = window.devicePixelRatio || 1
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
    }
    const scale = getRenderScale(w, h)
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0)
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)

    // Drop zone (right side).
    ctx.strokeStyle = '#94a3b8'
    ctx.setLineDash([6, 4])
    ctx.lineWidth = 2
    ctx.strokeRect(DROP_ZONE.x, DROP_ZONE.y, DROP_ZONE.w, DROP_ZONE.h)
    ctx.setLineDash([])
    ctx.fillStyle = '#64748b'
    ctx.font = '13px ui-sans-serif, system-ui'
    ctx.fillText('Drop your answer here', DROP_ZONE.x + 28, DROP_ZONE.y + DROP_ZONE.h / 2 + 4)

    // Tokens.
    for (const t of tokens) {
      ctx.fillStyle = t.color
      ctx.fillRect(t.x, t.y, t.w, t.h)
      ctx.fillStyle = '#ffffff'
      ctx.font = activityType === 'counting' ? '24px ui-sans-serif, system-ui' : 'bold 18px ui-sans-serif, system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(t.label, t.x + t.w / 2, t.y + t.h / 2)
    }
    ctx.textAlign = 'start'
    ctx.textBaseline = 'alphabetic'
  }, [tokens, activityType])

  useEffect(() => {
    draw()
  }, [draw])

  // ----- Hit testing -------------------------------------------------------

  const hitTest = useCallback(
    (x: number, y: number): DraggableToken | null => {
      for (let i = tokens.length - 1; i >= 0; i--) {
        const t = tokens[i]
        if (x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) return t
      }
      return null
    },
    [tokens],
  )

  function inDropZone(token: DraggableToken) {
    const cx = token.x + token.w / 2
    const cy = token.y + token.h / 2
    return (
      cx >= DROP_ZONE.x &&
      cx <= DROP_ZONE.x + DROP_ZONE.w &&
      cy >= DROP_ZONE.y &&
      cy <= DROP_ZONE.y + DROP_ZONE.h
    )
  }

  // ----- Pointer handlers --------------------------------------------------

  const localCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return toLogicalPoint(e.clientX, e.clientY, r)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = localCoords(e)
    const hit = hitTest(x, y)
    if (!hit) {
      captureEvent({
        timestamp: Date.now(),
        event_type: 'click',
        target: 'canvas_background',
        position: [x, y],
      })
      return
    }
    // Snapshot for undo BEFORE the drag mutates anything.
    undoStack.current.push(JSON.parse(JSON.stringify(tokens)))
    drag.current = {
      tokenId: hit.id,
      offsetX: x - hit.x,
      offsetY: y - hit.y,
      startedAt: Date.now(),
      pathPoints: 0,
    }
    captureEvent({
      timestamp: Date.now(),
      event_type: 'click',
      target: hit.id,
      position: [x, y],
      metadata: { activity_type: activityType, value: hit.value },
    })
    canvasRef.current?.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = localCoords(e)

    // Hover tracking — per-target dwell. Emitted on exit so we get the
    // duration alongside the target name.
    const hit = hitTest(x, y)
    const target = hit ? hit.id : 'canvas_background'
    if (hover.current.target !== target) {
      if (hover.current.target && hover.current.target !== 'canvas_background') {
        captureEvent({
          timestamp: Date.now(),
          event_type: 'hover',
          target: hover.current.target,
          duration: Date.now() - hover.current.enteredAt,
        })
      }
      hover.current = { target, enteredAt: Date.now() }
    }

    // Drag — update token position and redraw immediately.
    if (drag.current.tokenId) {
      drag.current.pathPoints += 1
      setTokens((prev) =>
        prev.map((t) =>
          t.id === drag.current.tokenId
            ? { ...t, x: x - drag.current.offsetX, y: y - drag.current.offsetY }
            : t,
        ),
      )
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current.tokenId) return
    const { x, y } = localCoords(e)
    const draggedId = drag.current.tokenId
    const dragDurationMs = Date.now() - drag.current.startedAt
    const pathPoints = drag.current.pathPoints
    drag.current = { tokenId: null, offsetX: 0, offsetY: 0, startedAt: 0, pathPoints: 0 }

    // Did the token end up in the drop zone? Update inDropZone flag.
    setTokens((prev) =>
      prev.map((t) => (t.id === draggedId ? { ...t, inDropZone: inDropZone(t) } : t)),
    )

    captureEvent({
      timestamp: Date.now(),
      event_type: 'drag',
      target: draggedId,
      position: [x, y],
      duration: dragDurationMs,
      metadata: { path_points: pathPoints },
    })

    // Look up the latest version of the dragged token (post-state-update)
    // to decide drop vs object_modify. We can't read it from `tokens`
    // here because setTokens above is async — peek using localCoords
    // against the current event position instead.
    const droppedInZone =
      x >= DROP_ZONE.x &&
      x <= DROP_ZONE.x + DROP_ZONE.w &&
      y >= DROP_ZONE.y &&
      y <= DROP_ZONE.y + DROP_ZONE.h
    captureEvent({
      timestamp: Date.now(),
      event_type: droppedInZone ? 'drop' : 'object_modify',
      target: droppedInZone ? 'answer_box' : draggedId,
      position: [x, y],
    })
  }

  const onPointerLeave = () => {
    if (hover.current.target && hover.current.target !== 'canvas_background') {
      captureEvent({
        timestamp: Date.now(),
        event_type: 'hover',
        target: hover.current.target,
        duration: Date.now() - hover.current.enteredAt,
      })
    }
    hover.current = { target: null, enteredAt: 0 }
  }

  // ----- Toolbar actions ---------------------------------------------------

  const handleUndo = () => {
    captureEvent({ timestamp: Date.now(), event_type: 'undo', target: 'undo_button' })
    const snap = undoStack.current.pop()
    if (snap) setTokens(snap)
  }

  const handleClear = () => {
    // "Clear" is a hard erase — counts toward the erasure rate signal.
    captureEvent({ timestamp: Date.now(), event_type: 'erase', target: 'clear_button' })
    undoStack.current.push(JSON.parse(JSON.stringify(tokens)))
    setTokens(makeInitialTokens(activityType))
    setFeedback(null)
    events.current = []
    setEventCount(0)
  }

  /**
   * Reset everything that's scoped to a single variation: token layout,
   * undo stack, event buffer, drag/hover refs, and the session id. We
   * deliberately roll a NEW session id here so the next variation's
   * telemetry batch doesn't upsert-overwrite the previous one's
   * behavioural profile in Supabase.
   */
  const resetForNextVariation = useCallback(() => {
    setTokens(makeInitialTokens(activityType))
    undoStack.current = []
    events.current = []
    setEventCount(0)
    drag.current = { tokenId: null, offsetX: 0, offsetY: 0, startedAt: 0, pathPoints: 0 }
    hover.current = { target: null, enteredAt: 0 }
    setFeedback(null)
    variationStartRef.current = Date.now()
    setSessionId(`sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
  }, [activityType])

  const handleSubmit = async () => {
    // Compute student's answer from tokens currently inside the drop zone.
    const droppedTokens = tokens.filter((t) => inDropZone(t))
    const studentAnswerValue = droppedTokens.reduce((sum, t) => sum + t.value, 0)
    const studentAnswerLabel = droppedTokens.map((t) => t.label).join(' + ') || '(empty)'

    captureEvent({
      timestamp: Date.now(),
      event_type: 'submit',
      target: 'submit_button',
      metadata: {
        student_answer_value: studentAnswerValue,
        student_answer_label: studentAnswerLabel,
        tokens_in_zone: droppedTokens.length,
        variation_index: variationIndex,
        lesson_id: stableLessonId,
      },
    })

    const correct = Math.abs(studentAnswerValue - activeCorrectAnswerValue) < 1e-3
    const decision = await adaptiveQuestionBridge.decide(buildAdaptiveDecisionRequest({
      state: learningLoop,
      grade,
      subject,
      competency,
      currentIndex: variationIndex,
      totalQuestions: lessonVariations.length,
      lastCorrect: correct,
      interest: interestText,
      masteryThreshold: masteryGoal,
      answer: studentAnswerLabel,
    }))
    const nextLoop = applyAdaptiveDecision(learningLoop, {
      lastCorrect: correct,
      answer: studentAnswerLabel,
    })
    setLearningLoop(nextLoop)
    offlineEvents.current = enqueueLearningEvent(offlineEvents.current, {
      id: `${stableLessonId}-${variationIndex}-${attemptsRef.current.length}`,
      type: 'attempt',
      payload: {
        correct,
        answer: studentAnswerLabel,
        competency,
                    hintLevel: nextLoop.hintLevel,
            adaptive_action: decision.action,
            adaptive_source: decision.source,
            metta_query: decision.mettaQuery,

      },
    })

    setIsSubmitting(true)
    setFeedback(null)
    try {
      await fetch(buildApiUrl(API_ENDPOINTS.TELEMETRY_CAPTURE), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          student_id: resolvedStudentId,
          activity_type: activityType,
          competency,
          grade,
          subject,
          events: events.current,
          activity_data: {
            tutor_context: buildTutorContext({
              state: nextLoop,
              grade,
              subject,
              competency,
              question: activeQuestion,
            }),
            lesson_id: stableLessonId,
            variation_index: variationIndex,
            variation_total: lessonVariations.length,
            mastery_threshold: masteryGoal,
            question: activeQuestion,
            correct_answer: activeCorrectAnswerLabel ?? String(activeCorrectAnswerValue),
            correct_answer_value: activeCorrectAnswerValue,
            student_answer: studentAnswerLabel,
            student_answer_value: studentAnswerValue,
            is_correct: correct,
          },
        }),
      })

      // Record the attempt for the structured onComplete payload.
      attemptsRef.current.push({
        index: variationIndex,
        question: activeQuestion,
        studentAnswerValue,
        studentAnswerLabel,
        correct,
        durationMs: Date.now() - variationStartRef.current,
      })

      // Quick local feedback. The richer "you have a misconception about
      // common-denominator addition" feedback comes from the backend
      // analysis pipeline — we surface it to the teacher dashboard,
      // not the student directly.
      const nextCorrectCount = correct ? correctCount + 1 : correctCount
      const reachedMastery = nextCorrectCount >= masteryGoal
      const lessonComplete = decision.action === 'complete' || reachedMastery

      if (correct) {
        setCorrectCount(nextCorrectCount)
        if (lessonComplete) {
          setFeedback(
            reachedMastery
              ? `🎉 Mastered! ${nextCorrectCount} of ${lessonVariations.length} correct.`
              : `✅ Lesson complete: ${nextCorrectCount}/${lessonVariations.length}.`,
          )
          onComplete?.({
            mastered: reachedMastery,
            score: nextCorrectCount,
            timeSpent: Date.now() - lessonStartRef.current,
            attempts: [...attemptsRef.current],
          })
        } else {
          // Advance to next variation; fresh session_id, fresh canvas.
          setFeedback(
            `✅ Correct! Next question (${variationIndex + 2} of ${lessonVariations.length})…`,
          )
          setVariationIndex(() => decision.nextIndex)
          // Defer the reset by a tick so the student sees the feedback
          // briefly before the canvas wipes.
          setTimeout(resetForNextVariation, 600)
        }
      } else {
        const hint = getNextHint(nextLoop)
        setFeedback(
          `🤔 You answered ${studentAnswerLabel} (${studentAnswerValue.toFixed(3)}). ${hint}`,
        )
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel()
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(hint))
        }
      }
    } catch (err) {
      console.error('Telemetry submit failed:', err)
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          `syncsenta-learning-queue-${resolvedStudentId}`,
          JSON.stringify(offlineEvents.current),
        )
      }
      setFeedback('Could not reach the tutor — your work is saved locally.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ----- Render ------------------------------------------------------------

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-lg">{adaptiveStep.prompt}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {grade} • {subject} • {competency}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground md:items-end">
            {lessonVariations.length > 1 && (
              <Badge variant="secondary" className="gap-1">
                Question {variationIndex + 1} of {lessonVariations.length}
                {' '}• {correctCount}/{masteryGoal} mastered
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {eventCount} signals
            </Badge>
            <span className="text-xs text-muted-foreground">
              Session active
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Drag tokens from the canvas into the answer box on the right. The sandbox checks the sum of tokens inside the drop zone and grades your answer when you submit.
        </div>

        <div className="grid gap-3 rounded-2xl border border-border bg-background p-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className="text-sm">
            <span className="font-medium text-foreground">Connect this lesson to something you like</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              For example: “I am interested in octopus.” This stays a short learning signal; it is not a profile or biometric record.
            </span>
            <input
              ref={interestInputRef}
              defaultValue=""
              onInput={(event) => setInterestText(event.currentTarget.value.slice(0, 240))}
              onChange={(event) => setInterestText(event.currentTarget.value.slice(0, 240))}
              onKeyUp={(event) => setInterestText(event.currentTarget.value.slice(0, 240))}
              onBlur={(event) => {
                setInterestText(event.currentTarget.value.slice(0, 240))
                if (event.currentTarget.value.trim()) {
                  captureEvent({
                    timestamp: Date.now(),
                    event_type: 'input',
                    target: 'learner_interest',
                    metadata: { signal: 'interest_text', length: interestText.trim().length },
                  })
                }
              }}
              placeholder="I am interested in octopus"
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="A topic or interest to connect to this lesson"
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2 w-fit"
            onClick={() => {
              const value = interestInputRef.current?.value.slice(0, 240) ?? ''
              setInterestText(value)
              if (value.trim()) {
                captureEvent({
                  timestamp: Date.now(),
                  event_type: 'input',
                  target: 'learner_interest',
                  metadata: { signal: 'interest_text', length: value.trim().length },
                })
              }
            }}
          >
            Use this interest
          </Button>
          <Badge variant="outline" className="w-fit">
            {adaptiveStep.interestSignal.tags.includes('unknown') ? 'No interest selected' : `Using: ${adaptiveStep.interestSignal.tags.join(', ')}`}
          </Badge>
        </div>

        {interestText.trim() && !adaptiveStep.interestSignal.tags.includes('unknown') && (
          <div className="grid gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 md:grid-cols-2" aria-live="polite">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-primary">Personalised connection</p>
              <p className="mt-2 text-sm text-foreground">{adaptiveStep.explanation}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-primary">Media status</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Video is not connected in this build. The lesson can still adapt safely with text, canvas, and speech guidance.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.12em] text-primary">Tutor guidance</p>
            <Badge variant="outline">Hint level {learningLoop.hintLevel}</Badge>
          </div>
          <p className="mt-2 text-sm text-foreground">{feedback ? adaptiveStep.hint : getNextHint(learningLoop)}</p>
          {canSpeak && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 px-0"
              onClick={() => window.speechSynthesis.speak(new SpeechSynthesisUtterance(feedback ? adaptiveStep.hint : getNextHint(learningLoop)))}
            >
              Read guidance aloud
            </Button>
          )}
        </div>

        {resolvedMedia && (
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.12em] text-primary">Teacher-approved visual lesson</p>
              <Badge variant="outline">Curriculum matched</Badge>
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">{resolvedMedia.title}</p>
            <video
              className="mt-3 aspect-video w-full rounded-xl bg-black object-contain"
              controls
              playsInline
              preload="metadata"
              poster={resolvedMedia.posterUrl}
              aria-label={resolvedMedia.title}
            >
              <source src={resolvedMedia.videoUrl} type="video/mp4" />
              Your browser does not support embedded video.
            </video>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[1.7fr_0.9fr]">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-full aspect-[2/1] h-auto min-h-0 rounded-2xl border border-border bg-background touch-none select-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerLeave={onPointerLeave}
            />
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground">
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-primary">Current answer</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {currentAnswerLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  Value: {currentAnswerValue.toFixed(3)}
                </p>
              </div>

              <div className="rounded-xl bg-muted p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Drop zone details
                </p>
                <p className="mt-2 text-sm">
                  Tokens are accepted when their center lands inside the gray box. You can move them back out to change your answer.
                </p>
              </div>

              <div className="rounded-xl bg-muted p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Tip</p>
                <p className="mt-2 text-sm">
                  Submit when the answer box shows the quantity you want. If you need a fresh start, use Clear.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleUndo} disabled={isSubmitting}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Undo
          </Button>
          <Button variant="outline" onClick={handleClear} disabled={isSubmitting}>
            <Eraser className="h-4 w-4 mr-2" />
            Clear
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 min-w-[160px]">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analysing…
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit answer
              </>
            )}
          </Button>
        </div>

        {feedback && (
          <div className="rounded-lg border p-3 text-sm bg-muted/30">{feedback}</div>
        )}

        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            Debug: {eventCount} events captured · undo depth {undoStack.current.length}
          </summary>
          <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-40">
            {JSON.stringify(events.current.slice(-6), null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  )
}
