/**
 * Sandbox type definitions.
 *
 * This file was previously imported by `sandbox-activities.ts`, the
 * dynamic catalogue routes (`[grade]/[subject]/...`), and
 * `GenericActivity.tsx` but had gone missing from disk, leaving a
 * latent compile error. The shape below is derived from how those four
 * consumers use it today, plus the new optional manipulative + micro-
 * assessment fields needed by the merged `/student/sandbox` design.
 *
 * Authoring rules:
 *   - Every NEW field is optional so existing catalogue entries
 *     continue to type-check unchanged.
 *   - `manipulative` is the bridge into `InteractiveSandbox` — when
 *     it's set, routing renders the canvas instead of `GenericActivity`.
 */

export type GradeId = 'g1' | 'g2' | 'g3' | 'g4' | 'g5' | 'g6'

export type SubjectId =
  | 'mathematics'
  | 'english'
  | 'kiswahili'
  | 'environmental'
  | 'cre'
  | 'creative'
  | 'indigenous'

/**
 * Extended subjects available as chat-first courses (not in the core CBC
 * sandbox catalogue). A subject page exists for each slug and routes to the
 * SubjectChat layout.
 */
export type ExtendedSubjectId =
  | 'blockchain'
  | 'superintelligence'
  | 'financial-literacy'
  | 'ai'

/** Union of all subjects that have a /student/subject/[slug] page. */
export type AnySubjectId = SubjectId | ExtendedSubjectId

export type ActivityType = 'explore' | 'practice' | 'challenge' | 'create'

/**
 * The interactive manipulative this activity is built around. When
 * undefined, the activity falls through to `GenericActivity` (the
 * worksheet-style MCQ renderer) — useful for entries that haven't been
 * converted to canvas yet.
 *
 * Mapping into `InteractiveSandbox`'s `activityType` prop:
 *   - 'fraction-bars' -> 'fractions'
 *   - 'tokens'        -> 'counting'
 *
 * `shapes` and `number-line` are reserved for a follow-up that
 * introduces multi-zone drop targets — listing them here so the type
 * is stable when those land.
 */
export type Manipulative = 'fraction-bars' | 'tokens' | 'shapes' | 'number-line'

/**
 * One variation in a micro-assessment loop. The student must answer
 * `masteryThreshold` of these correctly before the activity is marked
 * mastered. Variations should be small perturbations of the same
 * concept (e.g. "make 3/4" then "make 5/8") — not unrelated problems.
 */
export interface ActivityVariation {
  question: string
  targetValue: number
  targetLabel: string
}

export interface ActivityMedia {
  kind: 'video'
  videoUrl: string
  posterUrl?: string
  title: string
  competency: string
  approved: boolean
  childSafe: boolean
  containsLearnerData: boolean
}

export interface Activity {
  // ---- Identity & routing -----------------------------------------------
  id: string
  grade: GradeId
  subject: SubjectId
  type: ActivityType

  // ---- Display ----------------------------------------------------------
  title: string
  description: string
  difficulty: number
  icon: string
  color: string
  tags: string[]

  // ---- Pedagogy ---------------------------------------------------------
  prerequisites: string[]
  learningObjectives: string[]
  estimatedTime: number

  // ---- Term-based filtering ---------------------------------------------
  /** Academic term when this content should be available (1, 2, or 3) */
  term?: number

  // ---- Optional: canvas + micro-assessment ------------------------------
  // Set these to opt an activity into `InteractiveSandbox`. When absent,
  // the activity renders as a generic worksheet.
  manipulative?: Manipulative
  competency?: string
  /** Target for the FIRST attempt — variations below override per-attempt. */
  targetValue?: number
  targetLabel?: string
  /**
   * Micro-assessment sequence. If omitted but `targetValue` is set,
   * the activity behaves as a single-shot question (mastery threshold
   * of 1). For full Synthesis-style gating, supply 2-3 variations.
   */
  variations?: ActivityVariation[]
  /** Default: 1 (single-shot) when no variations, else 2 of 3. */
  masteryThreshold?: number

  /** Optional teacher-approved media. Unsafe or mismatched media is ignored. */
  media?: ActivityMedia
}
