/**
 * The Omega Claw challenge path's gating, kept out of the component so it can be
 * tested without a browser.
 *
 * Whether a learner's grade is in the pack's scope used to be answered inside
 * `interactive-challenge-path.tsx` by a local `isOmegaClawGrade()` with its own
 * idea of normalisation — which is how the card and the rule pack drifted apart.
 *
 * Everything here delegates to `lib/omega-agent/omega-claw-rules.ts`, the
 * TypeScript mirror of the MeTTa pack (asserted against the `.metta` file by
 * `omega-claw-rules.test.ts`). The frontend does not get its own opinion about
 * the pack; it asks the mirror.
 */

import { omegaClawScopeFor } from './omega-agent/omega-claw-rules';

/**
 * True when the MeTTa pack covers this grade at all.
 *
 * `omegaClawScopeFor()` is the mirrored `scope_for` rule, which folds the
 * spellings a CBC record actually arrives with (`Grade-6`, `gRaDe 6`, `G6`)
 * through `canonical_grade()`. The card used to normalise whitespace only, so a
 * profile reading `Grade-6` got `grade-6`, failed all three of its local tests,
 * and the card hid itself from a learner the pack covers.
 */
export function showsOmegaClawPath(grade: string): boolean {
  return omegaClawScopeFor(grade) !== 'blocked';
}
