/**
 * Omega Server Enrichment
 *
 * Provides the server-side equivalent of OmegaAgent.makeDecision() and
 * OmegaAgent.getCulturalAdaptations() from core.ts — without any browser
 * APIs, setInterval, or client-side Supabase that make core.ts unsuitable
 * for use inside Next.js API routes.
 *
 * What this adds to every chat turn (beyond the basic scaffolding decision):
 *   - Culturally-grounded example set (matatus, shillings, etc.) inserted
 *     into the system prompt when scaffolding is Intensive.
 *   - Teacher alert text when the student shows high frustration or is
 *     stuck (consecutive_wrong ≥ 3 or mastery < 30%).
 *   - Next-activity recommendation for the post-stream metadata SSE event.
 *
 * The result is merged into buildDynamicSystemPrompt and returned in the
 * SSE [DONE] metadata packet so teacher dashboards see real-time alerts.
 */

import type { TutoringDecision } from './metta-core';

// ─────────────────────────────────────────────────────────────────────────────
// Cultural context (extracted from OmegaAgent.getCulturalAdaptations)
// ─────────────────────────────────────────────────────────────────────────────

const KENYAN_CULTURAL_CONTEXT: Record<string, string[]> = {
  counting:      ['matatu passengers', 'safari animals', 'market fruits'],
  shapes:        ['traditional huts', 'Kenyan flag patterns', 'Maasai shields'],
  money:         ['shilling coins', 'market prices', 'school fees'],
  animals:       ['elephants', 'zebras', 'lions', 'giraffes', 'rhinos'],
  transport:     ['matatus', 'boda bodas', 'tuk tuks', 'safari vehicles'],
  food:          ['ugali', 'sukuma wiki', 'chapati', 'mandazi', 'maize'],
  measurement:   ['road distance in km', 'market stall lengths', 'water jerry cans'],
  fractions:     ['sharing chapati', 'dividing sukuma wiki', 'half a matatu route'],
  addition:      ['coins in a mkokoteni', 'passengers boarding a matatu', 'fruits at Gikomba'],
  subtraction:   ['change from a market stall', 'goats sold at Marigiti', 'fuel left in boda boda'],
  time:          ['school bell times', 'market opening hours', 'sunset at the coast'],
  environment:   ['Lake Victoria fish', 'Maasai Mara animals', 'tea farms in Kericho'],
};

const CULTURAL_FALLBACK = ['Kenyan classroom', 'school friends', 'local community'];

/**
 * Returns up to 3 culturally-grounded examples for the given subject/topic.
 * Matches loosely — checks if any key appears anywhere in the subject string.
 */
export function getCulturalExamples(subjectOrTopic: string): string[] {
  const normalised = subjectOrTopic.toLowerCase();
  for (const [key, examples] of Object.entries(KENYAN_CULTURAL_CONTEXT)) {
    if (normalised.includes(key)) {
      return examples.slice(0, 3);
    }
  }
  return CULTURAL_FALLBACK;
}

// ─────────────────────────────────────────────────────────────────────────────
// Teacher alert generation (server-side port of OmegaAgent.generateTeacherAlert)
// ─────────────────────────────────────────────────────────────────────────────

export interface OmegaEnrichment {
  /** Cultural examples injected into Intensive prompts. */
  culturalExamples: string[];
  /** Non-null when a teacher alert should be surfaced. */
  teacherAlert: string | null;
  /** Urgency level for the teacher alert. */
  alertUrgency: 'low' | 'medium' | 'high' | null;
  /** Suggested next activity type for the teacher dashboard. */
  nextActivityType: 'advancement' | 'reinforcement' | 'continuation';
}

/**
 * Derives enrichment signals from the Omega decision + raw DB counters.
 *
 * Runs synchronously — no I/O, safe to call inside the SSE start() block.
 */
export function buildOmegaEnrichment(params: {
  decision: TutoringDecision;
  subject: string;
  consecutiveWrong: number;
  masteryPct: number;
  competencyName: string;
  studentName?: string;
}): OmegaEnrichment {
  const { decision, subject, consecutiveWrong, masteryPct, competencyName, studentName } = params;

  const culturalExamples = getCulturalExamples(subject);

  // ── Teacher alert logic ───────────────────────────────────────────────────
  let teacherAlert: string | null = null;
  let alertUrgency: 'low' | 'medium' | 'high' | null = null;
  const name = studentName ?? 'The student';

  if (consecutiveWrong >= 5 || masteryPct === 0) {
    teacherAlert =
      `🚨 ${name} has been stuck on "${competencyName}" ` +
      `(${consecutiveWrong} consecutive wrong turns, ${masteryPct}% mastery). ` +
      `Direct intervention recommended.`;
    alertUrgency = 'high';
  } else if (consecutiveWrong >= 3 || masteryPct < 30) {
    teacherAlert =
      `⚠️ ${name} is struggling with "${competencyName}" ` +
      `(${masteryPct}% mastery, ${consecutiveWrong} wrong in a row). ` +
      `Consider providing visual examples or hands-on practice.`;
    alertUrgency = 'medium';
  } else if (decision.scaffolding === 'Intensive') {
    teacherAlert =
      `ℹ️ ${name} is in Intensive support mode for "${competencyName}". ` +
      `Tutor is breaking concepts into small steps.`;
    alertUrgency = 'low';
  }

  // ── Next activity suggestion ──────────────────────────────────────────────
  let nextActivityType: OmegaEnrichment['nextActivityType'];
  if (masteryPct >= 80) {
    nextActivityType = 'advancement';
  } else if (consecutiveWrong >= 3 || masteryPct < 40) {
    nextActivityType = 'reinforcement';
  } else {
    nextActivityType = 'continuation';
  }

  return { culturalExamples, teacherAlert, alertUrgency, nextActivityType };
}

// ─────────────────────────────────────────────────────────────────────────────
// Enriched system prompt builder
//
// Extends buildDynamicSystemPrompt (subject-session.ts) with cultural examples
// and next-step guidance derived from the OmegaAgent layer.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Appends cultural context examples to the system prompt when the scaffolding
 * level is Intensive. For Guided/Independent, the base prompt is sufficient.
 *
 * Returns the enriched prompt string — does NOT mutate the input.
 */
export function enrichSystemPrompt(
  basePrompt: string,
  enrichment: OmegaEnrichment,
  scaffolding: TutoringDecision['scaffolding'],
): string {
  if (scaffolding !== 'Intensive') return basePrompt;

  const exampleList = enrichment.culturalExamples.join(', ');
  const culturalLine =
    `Use these specific Kenyan examples to make the concept concrete: ${exampleList}.`;

  return `${basePrompt}\n${culturalLine}`;
}
