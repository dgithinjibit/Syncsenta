/**
 * The one place Omega Claw's learner-facing sentences are chosen.
 *
 * `interactive-challenge-path.tsx` used to build its own feedback strings: it
 * printed the rule engine's raw symbol (`Guided hint 2: isolate-step`), and for
 * each `nextAction` it kept a hand-written near-duplicate of the sentence the
 * API had already sent (`Not quite yet. The next step is a smaller clue…` against
 * the pack's `Not quite yet. Take a smaller clue…`). Two copies of child-facing
 * wording means the tested copy and the shipped copy can drift apart with no
 * test noticing, so the component asks here instead.
 *
 * The server strings come from `OMEGA_CLAW_HINT_COPY` / `OMEGA_CLAW_ACTION_COPY`
 * — see `omega-claw-api.ts:130,163` — and `omega-claw-rules.test.ts` asserts
 * those tables against the MeTTa pack, which is what makes rendering them
 * verbatim a checked claim rather than a preference.
 *
 * The fallbacks are for the one case with no server answer: `postOmegaClaw()`
 * returns `null` when the fetch fails or the endpoint rejects. They reuse the
 * same tables rather than adding third and fourth copies, and they say nothing
 * the engine did not decide.
 */

import {
  OMEGA_CLAW_ACTION_COPY,
  OMEGA_CLAW_HINT_COPY,
} from './omega-agent/omega-claw-rules';

/** What `/api/omega-claw/*` returns, or `null` when the request never landed. */
export type OmegaClawResponse = Record<string, unknown> | null;

function serverSentence(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * The hint ladder's wording. Deliberately does not fall back to `result.hint`:
 * that field is the MeTTa symbol (`worked-example`), which is a graph node, not
 * something a learner reads.
 */
export function hintFeedback(result: OmegaClawResponse): string {
  return serverSentence(result?.hintMessage) ?? OMEGA_CLAW_HINT_COPY.notice;
}

/**
 * The verdict after an answer attempt. `correct` selects which end of the ladder
 * to fall back to; it never overrules what the server said.
 */
export function answerFeedback(result: OmegaClawResponse, correct: boolean): string {
  const fromServer = serverSentence(result?.nextActionMessage);
  if (fromServer) return fromServer;
  return correct
    ? OMEGA_CLAW_ACTION_COPY['celebrate-transfer']
    : OMEGA_CLAW_ACTION_COPY['scaffold-retry'];
}
