/**
 * The Omega Claw challenge path — its nodes, and the fact that a learner finished them.
 *
 * Three things were wrong with the card before this module existed:
 *
 *   1. Progress lived in `useState<string[]>([])`. A refresh erased it, a second device never saw
 *      it, and the school Chromebook tomorrow starts at zero — so `learning_progress`, which has
 *      carried a row per competency since the schema was written, had no challenge rows at all.
 *   2. The node list lived inside the component, so the endpoint that had to grade an answer could
 *      not know what the answer was.
 *   3. Correctness was the browser's claim. `POST /api/omega-claw/progression` took
 *      `{ correct: true }` from the client and believed it, which is fine while nothing is earned
 *      and unforgivable the moment the path is attached to the points ledger.
 *
 * So the list and the grading live here, the write goes through `updateLearningProgress()` — the one
 * function that also issues the `competency_mastered` badge and reports the transition — and the
 * award goes through `awardCompetencyMastery()` on the service client, exactly as `/api/chat` does.
 *
 * Rows are keyed `omega-claw:<node id>` in `competency_code`. The prefix is what lets this read the
 * path's own rows back without pulling in the competencies the tutor writes, and it cannot collide
 * with a curriculum code: those are of the form `M8-ALG.1`, never a lowercase word plus a colon.
 *
 * Deliberately not done here, and recorded in docs/ROADMAP.md rather than papered over: the 50-point
 * award follows `calculateMasteryLevel()`, which needs 20 answered questions at 90%+ to call a
 * competency mastered. A path of three nodes answered once each sits at 3, so the wiring is live and
 * the transition has never fired for a challenge node. The fix for that is O-3 — the nodes come from
 * the rule pack, so the path gets longer — not a second, lower award rule.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { awardCompetencyMastery } from '@/lib/gamification/points-system';
import { updateLearningProgress } from '@/lib/progress/progress-tracking';

/**
 * Both clients are injected, as everywhere else on this path: the browser singleton has no cookie
 * jar on a server, and `award_points()` is only reachable with the service key.
 */
type ChallengeClient = SupabaseClient<Database>;

export interface OmegaClawChallengeNode {
  id: string;
  title: string;
  concept: string;
  prompt: string;
  options: string[];
  answer: string;
}

/**
 * The path, in order. O-3 replaces this array with the `(omega-claw-activity …)` rows the pack
 * approves for the learner's grade; until then this is the only copy, so the card and the endpoint
 * cannot disagree about what node 2 is.
 */
export const OMEGA_CLAW_CHALLENGE_NODES: readonly OmegaClawChallengeNode[] = [
  {
    id: 'ai-input-output',
    title: 'Trace an AI decision',
    concept: 'AI basics',
    prompt: 'A phone sorts photos of maize leaves. Which sequence best describes the system?',
    options: ['Input → process → output', 'Output → input → guess', 'Rule → magic → answer'],
    answer: 'Input → process → output',
  },
  {
    id: 'blockchain-consensus',
    title: 'Build a shared record',
    concept: 'Blockchain basics',
    prompt: 'A class keeps matching copies of a transaction record. What makes the record shared?',
    options: [
      'Several participants keep and check copies',
      'One person hides the only copy',
      'The record changes without anyone checking',
    ],
    answer: 'Several participants keep and check copies',
  },
  {
    id: 'explain-your-thinking',
    title: 'Teach it back',
    concept: 'Reflection',
    prompt: 'Which next step shows real understanding rather than memorisation?',
    options: [
      'Explain the idea with a new local example',
      'Repeat the definition three times',
      'Skip the explanation and copy the answer',
    ],
    answer: 'Explain the idea with a new local example',
  },
];

export class OmegaClawUnknownChallengeNode extends Error {
  constructor(nodeId: string) {
    super(`Unknown Omega Claw challenge node: ${nodeId}`);
    this.name = 'OmegaClawUnknownChallengeNode';
  }
}

/** `learning_progress.subject` for every challenge row — a teacher filter, not a display string. */
export const OMEGA_CLAW_CHALLENGE_SUBJECT = 'Omega Claw';

const COMPETENCY_PREFIX = 'omega-claw:';

export function omegaClawChallengeCompetencyCode(nodeId: string): string {
  return `${COMPETENCY_PREFIX}${nodeId}`;
}

export function isOmegaClawChallengeNode(nodeId: string): boolean {
  return OMEGA_CLAW_CHALLENGE_NODES.some((node) => node.id === nodeId);
}

function challengeNode(nodeId: string): OmegaClawChallengeNode {
  const node = OMEGA_CLAW_CHALLENGE_NODES.find((candidate) => candidate.id === nodeId);
  if (!node) throw new OmegaClawUnknownChallengeNode(nodeId);
  return node;
}

/** A node counts as completed when the learner has answered it correctly at least once. */
function completedNodeId(row: { competency_code: string; correct_answers: number }): string | null {
  if (!row.competency_code.startsWith(COMPETENCY_PREFIX)) return null;
  if (row.correct_answers < 1) return null;
  return row.competency_code.slice(COMPETENCY_PREFIX.length);
}

/**
 * The node ids this learner has earned, in path order.
 *
 * Order comes from the node list rather than `last_practiced_at`, because the card renders a path: a
 * learner who went back and re-answered node 3 should still see 1, 2, 3 lit in that sequence. Ids no
 * longer in the list are dropped, so removing a node cannot leave a learner staring at a completed
 * step that no longer exists.
 */
export async function readCompletedOmegaClawNodes(
  client: ChallengeClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from('learning_progress')
    .select('competency_code, correct_answers')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Could not read the challenge path for ${userId}: ${error.message}`);
  }

  const earned = new Set<string>();
  for (const row of data ?? []) {
    const nodeId = completedNodeId(row);
    if (nodeId) earned.add(nodeId);
  }

  return OMEGA_CLAW_CHALLENGE_NODES.map((node) => node.id).filter((id) => earned.has(id));
}

export interface RecordNodeAttemptParams {
  /** The caller's own client: `learning_progress` rows are guarded by owner policies. */
  client: ChallengeClient;
  /** The service client: `award_points()` is revoked for `anon` and `authenticated`. */
  serviceClient: ChallengeClient;
  userId: string;
  grade: string;
  nodeId: string;
  answer: string;
}

export interface OmegaClawNodeAttemptResult {
  /** Graded here, against the node list — never taken from the request. */
  correct: boolean;
  /** What the next mount will read back, so the card and the database cannot drift mid-answer. */
  completed: string[];
  masteryJustAchieved: boolean;
  pointsAwarded: number | null;
}

/**
 * Record one answer to one node.
 *
 * The attempt is written whether the answer was right or wrong, because `progress_percentage` is
 * accuracy over attempts: a path that recorded only correct answers would report 100% for a learner
 * who missed two of three.
 */
export async function recordOmegaClawNodeAttempt(
  params: RecordNodeAttemptParams,
): Promise<OmegaClawNodeAttemptResult> {
  const node = challengeNode(params.nodeId);
  const correct = params.answer.trim() === node.answer.trim();
  const competencyCode = omegaClawChallengeCompetencyCode(node.id);

  const progress = await updateLearningProgress(
    params.userId,
    competencyCode,
    {
      competencyName: node.title,
      subject: OMEGA_CLAW_CHALLENGE_SUBJECT,
      grade: params.grade,
      strand: node.concept,
      questionsAsked: 1,
      questionsAnswered: 1,
      correctAnswers: correct ? 1 : 0,
      timeSpentMinutes: 0,
    },
    params.client,
  );

  // Same discipline as `/api/chat`: the answer is already graded and stored, so a ledger failure
  // costs the learner a reward, not their progress. Logged, never thrown back as a 500 the card
  // would render as "the tutor could not answer right now".
  let pointsAwarded: number | null = null;
  if (progress.masteryJustAchieved) {
    try {
      pointsAwarded = await awardCompetencyMastery(
        params.userId,
        competencyCode,
        params.serviceClient,
      );
    } catch (awardError) {
      console.error('[omega-claw] challenge mastery award refused:', awardError);
    }
  }

  const completed = await readCompletedOmegaClawNodes(params.client, params.userId);

  return {
    correct,
    completed,
    masteryJustAchieved: progress.masteryJustAchieved,
    pointsAwarded,
  };
}
