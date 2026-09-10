/**
 * Answer Quality Classifier
 *
 * Replaces the fragile "response ends with ?" heuristic used in the chat
 * route's post-stream persistence block. That check treated any response
 * ending in a question mark as "student didn't answer", which is wrong for
 * Socratic tutors — they always end with a question.
 *
 * This module analyses BOTH the student's message (input) AND the assistant's
 * response (output) together to determine answer quality. The result directly
 * feeds the Omega engine's `correct_answers` and `consecutive_wrong` signals.
 *
 * Architecture note:
 *   This is a pure function module with no I/O. It runs server-side only
 *   (inside the post-stream block of /api/chat/route.ts). All inputs are
 *   already in-memory at that point so there is no latency cost.
 *
 * Signal priority (highest wins):
 *   1. Explicit correctness markers in the assistant response
 *   2. Student answer pattern detection in the student message
 *   3. Response structure analysis (explanation vs. re-question)
 *   4. Scaffolding-context: Intensive responses rarely confirm a correct answer
 */

export type AnswerQuality =
  | 'correct'       // Student gave a correct / substantially correct answer
  | 'incorrect'     // Student gave a wrong answer and the tutor corrected it
  | 'partial'       // Student is on the right track but incomplete
  | 'unanswered';   // Student asked a question, changed topic, or didn't attempt

export interface AnswerClassification {
  quality: AnswerQuality;
  /**
   * How confident we are in the classification, 0–1.
   * Confident (> 0.7) results are used to increment correct_answers.
   * Below that threshold we don't move the counter — "when in doubt, don't".
   */
  confidence: number;
  /** Short reason string, useful for logging / debugging. */
  reason: string;
  /**
   * Whether to increment correct_answers in the DB.
   * True only when quality === 'correct' AND confidence >= 0.7.
   */
  shouldIncrementCorrect: boolean;
  /**
   * Whether to reset consecutive_wrong to 0.
   * True when student gave any substantive answer (even partial).
   */
  shouldResetConsecutiveWrong: boolean;
  /**
   * How much to add to consecutive_wrong (0 or 1).
   * 1 only when quality === 'unanswered' or 'incorrect'.
   */
  consecutiveWrongDelta: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Correctness signal word-lists
// ─────────────────────────────────────────────────────────────────────────────

/** Phrases in the assistant response that signal the student got it right. */
const CORRECT_SIGNALS: RegExp[] = [
  // "correct" alone as confirmation, but NOT "the correct answer is" (that's a correction)
  /\b(exactly|that'?s? right|well done|ndiyo|good (job|work|answer|thinking))\b/i,
  /\b(you'?ve? got it|spot on|perfect|excellent|great answer|wonderful)\b/i,
  /\b(yes[!,. ]+that'?s?)\b/i,
  // Kiswahili confirmations — sawa + exclamation only (sawa, without ! is just "OK")
  /\bsawa\s*!|\bndio\b.*\bsahihi\b/i,
  // "correct!" as a standalone exclamation — must be followed by space/punct, not "answer"
  /\bcorrect[!,. ]\s*(?!answer\b)/i,
];

/** Phrases that signal the student's answer was wrong or needed correction. */
const INCORRECT_SIGNALS: RegExp[] = [
  /\b(not quite|not exactly|almost|close,? but|that'?s? not|let'?s? try again)\b/i,
  /\b(remember that|actually,|the (correct|right) answer is)\b/i,
  /\b(si sahihi|jaribu tena)\b/i,
];

/** Patterns in the student message that indicate they gave an answer (not a question). */
const STUDENT_ANSWER_PATTERNS: RegExp[] = [
  /^\s*(i think|i believe|the answer is|it is|it'?s|that'?s|my answer|nadhani|jibu ni)/i,
  /^\s*\d[\d\s+\-*/=.,]*$/,         // Pure numeric answer (e.g. "42" or "3 + 4 = 7")
  /^\s*(yes|no|ndiyo|hapana)\b/i,   // Binary yes/no response
  /\b(because|since|so that|kwa sababu)\b/i,  // Explanatory sentence
];

/** Student messages that are clearly questions, not answers. */
const STUDENT_QUESTION_PATTERNS: RegExp[] = [
  /\?$/,                            // Ends with question mark
  /^(what|how|why|when|where|who|which|can you|could you|please explain|nisaidie)\b/i,
  /\b(i don'?t (know|understand)|sijui|sielewi|help me)\b/i,
];

// ─────────────────────────────────────────────────────────────────────────────
// Main classifier
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classify the quality of a student's answer based on what they said and
 * how the assistant responded.
 *
 * @param studentMessage  - The raw student message sent this turn.
 * @param assistantResponse - The full assistant response text (post-stream).
 * @param scaffolding - Current scaffolding level, used to weight confidence.
 */
export function classifyAnswerQuality(
  studentMessage: string,
  assistantResponse: string,
  scaffolding: 'Independent' | 'Guided' | 'Intensive' = 'Guided',
): AnswerClassification {
  const msg = studentMessage.trim();
  const resp = assistantResponse.trim();

  // ── 1. Check for explicit correctness signals in the response ────────────
  const hasCorrectSignal = CORRECT_SIGNALS.some((re) => re.test(resp));
  const hasIncorrectSignal = INCORRECT_SIGNALS.some((re) => re.test(resp));

  // ── 2. Analyse the student message structure ─────────────────────────────
  const studentIsAskingQuestion = STUDENT_QUESTION_PATTERNS.some((re) => re.test(msg));
  const studentGaveAnswer = STUDENT_ANSWER_PATTERNS.some((re) => re.test(msg));

  // ── 3. Response structure: does it end with a follow-up challenge? ────────
  //   A Socratic tutor asking a follow-up question after validating ("Great!
  //   Now can you try the next one?") should still count as CORRECT, not
  //   unanswered. So we strip terminal question marks before deciding.
  const respWithoutTerminalQ = resp.replace(/\?+\s*$/, '');
  const responseConfirmsProgress = CORRECT_SIGNALS.some((re) => re.test(respWithoutTerminalQ));

  // ── 4. Decision tree ──────────────────────────────────────────────────────

  // 4a. Check for explicit correctness/incorrectness in the response first —
  //   these override student message structure, because the tutor's response
  //   is the ground truth signal. A student can phrase an answer as a question
  //   ("Is it 7?") and still be right; the tutor's confirmation confirms it.
  if (hasCorrectSignal || responseConfirmsProgress) {
    const confidenceAdjust = scaffolding === 'Intensive' ? -0.15 : 0;
    const confidence = Math.min(0.95, 0.85 + confidenceAdjust);
    return {
      quality: 'correct',
      confidence,
      reason: 'Assistant response contains explicit correctness confirmation.',
      shouldIncrementCorrect: confidence >= 0.7,
      shouldResetConsecutiveWrong: true,
      consecutiveWrongDelta: 0,
    };
  }

  if (hasIncorrectSignal) {
    return {
      quality: 'incorrect',
      confidence: 0.80,
      reason: 'Assistant response contains an explicit correction or redirect.',
      shouldIncrementCorrect: false,
      shouldResetConsecutiveWrong: false,
      consecutiveWrongDelta: 1,
    };
  }

  // 4b. Student is just asking a question — not an answer attempt.
  //   Only reached if the response had no clear correct/incorrect signal.
  if (studentIsAskingQuestion && !studentGaveAnswer) {
    return {
      quality: 'unanswered',
      confidence: 0.85,
      reason: 'Student asked a question without providing an answer.',
      shouldIncrementCorrect: false,
      shouldResetConsecutiveWrong: false,
      consecutiveWrongDelta: 0, // asking a question is not "wrong"
    };
  }

  // 4c. Student provided an answer-like message but response is neutral
  //   (no clear confirm or deny — the tutor is probing further).
  //   Count as partial: it moves the student forward but doesn't confirm mastery.
  if (studentGaveAnswer) {
    return {
      quality: 'partial',
      confidence: 0.60,
      reason: 'Student gave an answer but assistant response is neutral — probing further.',
      shouldIncrementCorrect: false,   // 0.60 < 0.70 threshold
      shouldResetConsecutiveWrong: true, // they tried, so reset the streak
      consecutiveWrongDelta: 0,
    };
  }

  // 4d. Fallback — can't determine quality
  return {
    quality: 'unanswered',
    confidence: 0.50,
    reason: 'Unable to determine answer quality from message/response content.',
    shouldIncrementCorrect: false,
    shouldResetConsecutiveWrong: false,
    consecutiveWrongDelta: 0,
  };
}
