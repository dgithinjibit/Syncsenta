/**
 * Omega Tutoring Decision Engine
 *
 * TypeScript port of Rust decide_tutoring() in rust-core/src/agent_runtime.rs.
 *
 * This is the ONLY production-active component of the MeTTa subsystem.
 * The full MeTTa neuro-symbolic infrastructure (MeTTaEducationKnowledgeGraph,
 * MeTTaInterpreter, MeTTaSession, MeTTaRouter, etc.) has been archived to
 * studio/archive/metta-prototype/ pending an integration decision.
 * See OMEGA_METTA_STATUS.md for context.
 *
 * â”€â”€â”€ Sync contract â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * All numeric thresholds MUST stay identical to the Rust source of truth:
 *   rust-core/src/agent_runtime.rs â†’ decide_tutoring()
 *
 *   hints_used >= 2      â†’ Intensive
 *   mastery_percent < 40 â†’ Intensive
 *   mastery_percent < 80 â†’ Guided
 *
 * The CI script scripts/check-omega-thresholds.mjs enforces this automatically.
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *
 * Mastery calc uses integer truncation (Math.floor) to match Rust's integer
 * division â€” see masteryPercent() in lib/subject-session.ts.
 */

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Types
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface TutoringDecision {
  scaffolding: 'Independent' | 'Guided' | 'Intensive';
  hint: string;
  nextAction: string;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Thresholds â€” single source of truth for TS side.
// Must match rust-core/src/agent_runtime.rs decide_tutoring() exactly.
// CI script validates these via scripts/check-omega-thresholds.mjs.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** @internal exported so the CI threshold check script can import and verify */
export const OMEGA_THRESHOLDS = {
  INTENSIVE_MASTERY_MAX:  40,  // mastery < 40  â†’ Intensive
  GUIDED_MASTERY_MAX:     80,  // mastery < 80  â†’ Guided (else Independent)
  INTENSIVE_HINTS_MIN:     2,  // hintsUsed >= 2 â†’ Intensive
} as const;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Decision function
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function evaluateTutoringDecision(state: {
  attempts: number;
  correctAttempts: number;
  hintsUsed: number;
  frustrationSignal: boolean;
}): TutoringDecision {
  // Use integer truncation to match Rust: floor((correct * 100) / attempts)
  const masteryPct =
    state.attempts === 0
      ? 0
      : Math.floor((Math.min(state.correctAttempts, state.attempts) * 100) / state.attempts);

  // Intensive: frustrated, too many hints, or very low mastery
  if (
    state.frustrationSignal ||
    state.hintsUsed >= OMEGA_THRESHOLDS.INTENSIVE_HINTS_MIN ||
    (state.attempts > 0 && masteryPct < OMEGA_THRESHOLDS.INTENSIVE_MASTERY_MAX)
  ) {
    return {
      scaffolding: 'Intensive',
      hint: 'Let us take one small step together. Look for the part you already know.',
      nextAction: 'show_conceptual_example',
    };
  }

  // Guided: no attempts yet, or mastery below 80%
  if (state.attempts === 0 || masteryPct < OMEGA_THRESHOLDS.GUIDED_MASTERY_MAX) {
    return {
      scaffolding: 'Guided',
      hint: 'What do you notice first? Say or write one idea before trying the next step.',
      nextAction: 'ask_guiding_question',
    };
  }

  // Independent: mastery >= 80%, no frustration, hints < 2
  return {
    scaffolding: 'Independent',
    hint: 'Try the next question independently, then explain how you got your answer.',
    nextAction: 'present_next_challenge',
  };
}

