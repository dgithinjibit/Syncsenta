/**
 * Omega Claw student-learning rules — TypeScript mirror.
 *
 * `backend/syncsenta-backend/data/omega_claw_rules.metta` holds these rules in
 * MeTTa form and `src/metta_core/omega_claw.rs` is the Rust façade over them.
 * That service is deployed nowhere, so until this file existed the only
 * consumer of the rules was `studio/src/app/api/omega-claw/*`, which POSTs to
 * `SYNCSENTA_BACKEND_URL || http://127.0.0.1:8080/api/v1`. On
 * sentastudio.vercel.app that address is the function's own container, nothing
 * listens there, and both endpoints answered
 * `503 {"error":"Omega Claw backend is unavailable"}` — measured again on
 * 2026-09-28. The learner-facing challenge path therefore ran entirely on its
 * in-component fallback strings, and the symbolic progression the pedagogy is
 * built around never fired.
 *
 * The rules are a fixed, tiny decision table with no persistence and no
 * secrets, so the app can answer them itself. `proxyOmegaClaw()` still prefers
 * the Rust service when `SYNCSENTA_BACKEND_URL` is configured, because that is
 * where auth, persistence and teacher approval belong; this module is what lets
 * the pedagogy work while that service is undeployed rather than after.
 *
 * `omega-claw-rules.test.ts` parses the `.metta` file next to the Rust façade
 * and fails if the two packs disagree, so this is a mirror with an alarm rather
 * than a fork.
 */

export type OmegaClawScope = 'introductory' | 'senior-deep' | 'blocked';

export type OmegaClawNextAction =
  | 'scaffold-retry'
  | 'celebrate-transfer'
  | 'mastery-review'
  | 'unlock-next-node';

export type OmegaClawHint = 'notice' | 'isolate-step' | 'representation' | 'worked-example';

/**
 * `(= (omega-claw-scope-for <grade>) <scope>)`, minus the catch-all
 * `$lower-grade` rule, which is the `else` branch of `omegaClawScopeFor()`.
 */
const SCOPE_BY_GRADE: Record<string, OmegaClawScope> = {
  grade6: 'introductory',
  grade10: 'senior-deep',
  grade11: 'senior-deep',
  grade12: 'senior-deep',
  'senior-school': 'senior-deep',
};

/** `(omega-claw-activity <grade> <activity>)` */
const ACTIVITIES: ReadonlyArray<readonly [string, string]> = [
  ['grade6', 'ai-input-output'],
  ['grade6', 'blockchain-shared-record'],
  ['grade6', 'responsible-digital-citizenship'],
  ['senior-school', 'ai-data-literacy'],
  ['senior-school', 'ai-evaluation-and-bias'],
  ['senior-school', 'blockchain-consensus'],
  ['senior-school', 'blockchain-governance'],
  ['grade10', 'ai-data-literacy'],
  ['grade11', 'ai-data-literacy'],
  ['grade12', 'ai-data-literacy'],
  ['grade10', 'blockchain-consensus'],
  ['grade11', 'blockchain-consensus'],
  ['grade12', 'blockchain-consensus'],
];

/** `(= (omega-claw-next-action <outcome>) <action>)` */
const NEXT_ACTION_BY_OUTCOME: Record<string, OmegaClawNextAction> = {
  incorrect: 'scaffold-retry',
  correct: 'celebrate-transfer',
  explained: 'mastery-review',
  mastered: 'unlock-next-node',
};

/** `(= (omega-claw-hint <level>) <hint>)` — the ladder: notice, isolate, represent, model. */
const HINT_BY_LEVEL: Record<number, OmegaClawHint> = {
  1: 'notice',
  2: 'isolate-step',
  3: 'representation',
  4: 'worked-example',
};

/** `(omega-claw-blocked-topic <topic>)` */
const BLOCKED_TOPICS = [
  'crypto-trading',
  'investment-advice',
  'wallet-custody',
  'unsupervised-attack',
  'public-deployment',
  'unnecessary-personal-data',
] as const;

export type OmegaClawBlockedTopic = (typeof BLOCKED_TOPICS)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Normalisation — mirrors canonical_grade / canonical_token in Rust
// ─────────────────────────────────────────────────────────────────────────────

/** `canonical_token()`: lowercase, spaces and underscores become hyphens. */
export function canonicalOmegaClawToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_]+/g, '-');
}

/** `canonical_grade()`: folds the spellings a CBC record actually arrives with. */
export function canonicalOmegaClawGrade(grade: string): string {
  // Rust drops every space, hyphen and underscore rather than collapsing them
  // into hyphens, so "Grade-6" and "grade 6" both become "grade6".
  const compact = grade.toLowerCase().replace(/[\s-_]+/g, '');
  switch (compact) {
    case 'g6':
    case 'grade6':
      return 'grade6';
    case 'g10':
    case 'grade10':
      return 'grade10';
    case 'g11':
    case 'grade11':
      return 'grade11';
    case 'g12':
    case 'grade12':
      return 'grade12';
    case 'senior':
    case 'seniorschool':
      return 'senior-school';
    default:
      return compact;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule evaluation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `OmegaClawRules::scope_for()`.
 *
 * The MeTTa pack matches both a concrete row and the `$lower-grade` catch-all
 * for Grade 6 and the senior grades, and the Rust façade resolves that by
 * testing `introductory`, then `senior-deep`, before falling back to
 * `blocked`. Same precedence here, for the same reason: a learner in Grade 6
 * must not be told they are out of scope.
 */
export function omegaClawScopeFor(grade: string): OmegaClawScope {
  const normalized = canonicalOmegaClawGrade(grade);
  return SCOPE_BY_GRADE[normalized] ?? 'blocked';
}

/** `OmegaClawRules::is_activity_allowed()` — scope first, then the table. */
export function isOmegaClawActivityAllowed(grade: string, activity: string): boolean {
  if (omegaClawScopeFor(grade) === 'blocked') return false;
  const gradeKey = canonicalOmegaClawGrade(grade);
  const activityKey = canonicalOmegaClawToken(activity);
  return ACTIVITIES.some(([rowGrade, rowActivity]) => rowGrade === gradeKey && rowActivity === activityKey);
}

/**
 * `OmegaClawRules::activities_for()` — the listing half, in the pack's own row order.
 *
 * The card's question is "what may this learner do next", which is a listing question and could only be
 * answered one activity at a time by `isOmegaClawActivityAllowed()`. Two things this deliberately does not
 * do: it never falls back to the whole pack when a grade has no rows, because a Grade 4 learner shown the
 * Grade 12 blockchain strand is the failure the `blocked` scope exists to prevent; and it selects on the
 * canonical *grade* symbol rather than the scope, so a Grade 10 gets the two rows the pack pins for
 * `grade10` and not the four pinned for `senior-school` — which is what the façade's
 * `(omega-claw-activity {normalized} $activity)` query returns, and the drift lock in
 * `omega-claw-rules.test.ts` asks the `.metta` file rather than this array.
 */
export function omegaClawActivitiesFor(grade: string): readonly string[] {
  if (omegaClawScopeFor(grade) === 'blocked') return [];
  const gradeKey = canonicalOmegaClawGrade(grade);
  return ACTIVITIES.filter(([rowGrade]) => rowGrade === gradeKey).map(([, rowActivity]) => rowActivity);
}

/** `OmegaClawRules::next_action_for_outcome()`; throws so the caller can 400. */
export function omegaClawNextActionForOutcome(outcome: string): OmegaClawNextAction {
  const action = NEXT_ACTION_BY_OUTCOME[canonicalOmegaClawToken(outcome)];
  if (!action) {
    throw new OmegaClawUnknownOutcome(outcome);
  }
  return action;
}

export class OmegaClawUnknownOutcome extends Error {
  constructor(outcome: string) {
    super(`unknown Omega Claw progression outcome: ${outcome}`);
    this.name = 'OmegaClawUnknownOutcome';
  }
}

/** `OmegaClawRules::hint_for()` — levels outside 1–4 clamp rather than fail. */
export function omegaClawHintFor(level: number): OmegaClawHint {
  const clamped = Math.min(Math.max(Math.trunc(level) || 1, 1), 4);
  return HINT_BY_LEVEL[clamped];
}

/** The level `hint_for()` was actually answered at; the Rust handler echoes it as `hintLevel`. */
export function clampOmegaClawHintLevel(level: number): number {
  return Math.min(Math.max(Math.trunc(level) || 1, 1), 4);
}

/**
 * `OmegaClawRules::can_unlock_transfer()`.
 *
 * Only `(true, true)` unlocks. A correct answer that the learner cannot
 * explain is memorisation, and the pedagogy refuses to advance it — the
 * transfer step is the assessment.
 */
export function omegaClawCanUnlockTransfer(correct: boolean, explained: boolean): boolean {
  return correct === true && explained === true;
}

/** The `(omega-claw-blocked-topic …)` boundary, as a query rather than prose. */
export function omegaClawBlockedTopic(
  queryOrContent: string,
): OmegaClawBlockedTopic | null {
  const haystack = queryOrContent.toLowerCase().replace(/[\s_]+/g, '-');
  return BLOCKED_TOPICS.find((topic) => haystack.includes(topic)) ?? null;
}

export function isBlockedOmegaClawTopic(queryOrContent: string): boolean {
  return omegaClawBlockedTopic(queryOrContent) !== null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Learner-facing copy
// ─────────────────────────────────────────────────────────────────────────────

/**
 * What to show a child for each rung of the hint ladder.
 *
 * The rule engine answers in symbols — `isolate-step` is a node in a MeTTa
 * graph, not something a ten-year-old reads. The Rust handlers return the
 * symbol and `omega-claw-api.ts` maps it here, so the wire format stays
 * identical whichever side answers and the words live in one place.
 */
export const OMEGA_CLAW_HINT_COPY: Record<OmegaClawHint, string> = {
  notice: 'Start by noticing what the question is asking you to identify: an input, an action, or a piece of evidence.',
  'isolate-step': 'Find the one step you are unsure about and say what happens just before it and just after it.',
  representation: 'Draw it or write it out as a list of steps, then check your list against the question.',
  'worked-example': 'Here is one worked path: name the input, describe what the system does with it, then state the output. Try the same three moves on your own example.',
};

/** What each progression action means for the learner's next move. */
export const OMEGA_CLAW_ACTION_COPY: Record<OmegaClawNextAction, string> = {
  'scaffold-retry': 'Not quite yet. Take a smaller clue: look for the step that shows evidence and explainable reasoning.',
  'celebrate-transfer': 'Correct. Now transfer the idea to a new example before continuing.',
  'mastery-review': 'Well explained. Review how you got there, so you can repeat it on your own.',
  'unlock-next-node': 'That competency is unlocked. Move to the next node in your path.',
};
