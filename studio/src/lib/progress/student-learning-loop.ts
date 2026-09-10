export type LearningLoopStatus = 'active' | 'completed';

export interface LearningLoopState {
  lessonId: string;
  masteryThreshold: number;
  attemptCount: number;
  correctCount: number;
  currentIndex: number;
  hintLevel: number;
  mastered: boolean;
  status: LearningLoopStatus;
}

export interface LearningEvent {
  id: string;
  type: 'attempt' | 'hint_requested' | 'lesson_completed';
  payload: Record<string, unknown>;
}

export interface PersistedLearningLoop {
  version: 1;
  state: LearningLoopState;
  interestText: string;
  savedAt: number;
}

export function serializeLearningLoop(input: {
  state: LearningLoopState;
  interestText: string;
  savedAt?: number;
}): string {
  const payload: PersistedLearningLoop = {
    version: 1,
    state: input.state,
    interestText: input.interestText.slice(0, 120),
    savedAt: input.savedAt ?? Date.now(),
  };
  return JSON.stringify(payload);
}

export function restoreLearningLoop(
  raw: string | null,
  expected: { lessonId: string; masteryThreshold: number },
): { state: LearningLoopState; interestText: string } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedLearningLoop>;
    const state = parsed.state;
    if (
      parsed.version !== 1 ||
      !state ||
      state.lessonId !== expected.lessonId ||
      state.masteryThreshold !== Math.max(1, expected.masteryThreshold) ||
      !Number.isInteger(state.attemptCount) || state.attemptCount < 0 ||
      !Number.isInteger(state.correctCount) || state.correctCount < 0 ||
      !Number.isInteger(state.currentIndex) || state.currentIndex < 0 ||
      !Number.isInteger(state.hintLevel) || state.hintLevel < 0 || state.hintLevel > 3 ||
      (state.status !== 'active' && state.status !== 'completed') ||
      typeof state.mastered !== 'boolean'
    ) return null;
    return {
      state,
      interestText: typeof parsed.interestText === 'string' ? parsed.interestText.slice(0, 120) : '',
    };
  } catch {
    return null;
  }
}

export function createLearningLoop(input: {
  lessonId: string;
  masteryThreshold: number;
}): LearningLoopState {
  return {
    lessonId: input.lessonId,
    masteryThreshold: Math.max(1, input.masteryThreshold),
    attemptCount: 0,
    correctCount: 0,
    currentIndex: 0,
    hintLevel: 0,
    mastered: input.masteryThreshold <= 0,
    status: input.masteryThreshold <= 0 ? 'completed' : 'active',
  };
}

export function evaluateAttempt(
  state: LearningLoopState,
  input: { correct: boolean; answer: string },
): LearningLoopState {
  const correctCount = state.correctCount + (input.correct ? 1 : 0);
  const mastered = correctCount >= state.masteryThreshold;
  return {
    ...state,
    attemptCount: state.attemptCount + 1,
    correctCount,
    currentIndex: input.correct ? state.currentIndex + 1 : state.currentIndex,
    hintLevel: input.correct ? 0 : Math.min(state.hintLevel + 1, 3),
    mastered,
    status: mastered ? 'completed' : 'active',
  };
}

export function getNextHint(state: LearningLoopState): string {
  if (state.hintLevel <= 0) return 'Explain how you are thinking, then choose the next step.';
  if (state.hintLevel === 1) return 'Try again: identify the whole and the equal parts first.';
  if (state.hintLevel === 2) return 'Look at the denominator. It tells how many equal parts make the whole.';
  return 'Use the visual parts one at a time, then count only the parts that match the question.';
}

export function buildTutorContext(input: {
  state: LearningLoopState;
  grade: string;
  subject: string;
  competency: string;
  question: string;
}): string {
  return [
    `grade=${input.grade}`,
    `subject=${input.subject}`,
    `competency=${input.competency}`,
    `lesson_id=${input.state.lessonId}`,
    `attempts=${input.state.attemptCount}`,
    `correct=${input.state.correctCount}`,
    `current_index=${input.state.currentIndex}`,
    `hint_level=${input.state.hintLevel}`,
    'policy:bounded_hint',
    'policy:encourage_student_agency',
    `question=${input.question.slice(0, 240)}`,
  ].join('\n');
}

export function enqueueLearningEvent(
  queue: LearningEvent[],
  event: LearningEvent,
): LearningEvent[] {
  if (queue.some((queued) => queued.id === event.id)) return queue;
  return [...queue, event];
}
