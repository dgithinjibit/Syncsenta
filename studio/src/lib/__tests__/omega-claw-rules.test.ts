import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Omega Claw rule-pack drift lock.
 *
 * The rules exist twice: as MeTTa in
 * `backend/syncsenta-backend/data/omega_claw_rules.metta`, evaluated by the Rust
 * façade in `src/metta_core/omega_claw.rs`, and as the TypeScript table in
 * `src/lib/omega-agent/omega-claw-rules.ts` that the Next.js app serves to
 * learners while that Rust service is undeployed.
 *
 * Two copies of a rule set is exactly how `profiles.role` and `UserRole` ended
 * up disagreeing about what a school head is — one side quietly winning
 * depending on which screen you opened. These assertions make that failure mode
 * a build error instead: either the packs agree, or the test names the line.
 */

const REPO = join(process.cwd(), '..');
const METTA_FILE = join(REPO, 'backend', 'syncsenta-backend', 'data', 'omega_claw_rules.metta');

type ParsedRules = {
  scope: Map<string, string>;
  activities: Set<string>;
  nextAction: Map<string, string>;
  hints: Map<string, string>;
  transfer: Set<string>;
  blockedTopics: Set<string>;
};

function parseMetta(source: string): ParsedRules {
  const rules: ParsedRules = {
    scope: new Map(),
    activities: new Set(),
    nextAction: new Map(),
    hints: new Map(),
    transfer: new Set(),
    blockedTopics: new Set(),
  };

  for (const rawLine of source.split('\n')) {
    const line = rawLine.replace(/;;.*$/, '').trim();
    if (!line) continue;

    // (= (omega-claw-scope-for grade6) introductory)
    const equality = line.match(/^\(\s*=\s*\(\s*([\w-]+)\s+([^)]*?)\s*\)\s+(\S+)\s*\)$/);
    if (equality) {
      const [, head, argsRaw, value] = equality;
      const args = argsRaw.trim().split(/\s+/).filter(Boolean);
      if (head === 'omega-claw-scope-for') rules.scope.set(args[0], value);
      if (head === 'omega-claw-next-action') rules.nextAction.set(args[0], value);
      if (head === 'omega-claw-hint') rules.hints.set(args[0], value);
      if (head === 'omega-claw-can-unlock-transfer') rules.transfer.add(args.join(','));
      continue;
    }

    // (omega-claw-activity grade6 ai-input-output)
    const relation = line.match(/^\(\s*(omega-claw-[\w-]+)\s+([^)]*?)\s*\)$/);
    if (relation) {
      const [, head, argsRaw] = relation;
      const args = argsRaw.trim().split(/\s+/).filter(Boolean);
      if (head === 'omega-claw-activity') rules.activities.add(args.join(','));
      if (head === 'omega-claw-blocked-topic') rules.blockedTopics.add(args[0]);
    }
  }

  return rules;
}

function mettaRules(): ParsedRules {
  expect(existsSync(METTA_FILE), `${METTA_FILE} should exist`).toBe(true);
  return parseMetta(readFileSync(METTA_FILE, 'utf8'));
}

// Imported lazily-by-path so a missing module reads as a missing module.
// eslint-disable-next-line import/first
const modulePath = join(process.cwd(), 'src', 'lib', 'omega-agent', 'omega-claw-rules.ts');
expect(existsSync(modulePath), 'the TypeScript rule pack should exist').toBe(true);

const {
  clampOmegaClawHintLevel,
  isBlockedOmegaClawTopic,
  isOmegaClawActivityAllowed,
  omegaClawActivitiesFor,
  omegaClawCanUnlockTransfer,
  omegaClawHintFor,
  omegaClawNextActionForOutcome,
  omegaClawScopeFor,
  OMEGA_CLAW_ACTION_COPY,
  OMEGA_CLAW_HINT_COPY,
} = await import('@/lib/omega-agent/omega-claw-rules');

describe('the two Omega Claw rule packs agree', () => {
  const metta = mettaRules();

  it('scope rows match, ignoring the $lower-grade catch-all', () => {
    const concrete = [...metta.scope].filter(([grade]) => !grade.startsWith('$'));
    for (const [grade, scope] of concrete) {
      expect(omegaClawScopeFor(grade), `scope for ${grade}`).toBe(scope);
    }
    expect(concrete.length).toBeGreaterThan(0);
  });

  it('every approved activity is approved here too', () => {
    const tsActivities = new Set<string>();
    for (const entry of metta.activities) {
      const [grade, activity] = entry.split(',');
      if (omegaClawScopeFor(grade) !== 'blocked' && isOmegaClawActivityAllowed(grade, activity)) {
        tsActivities.add(entry);
      }
    }
    expect([...tsActivities].sort()).toEqual([...metta.activities].sort());
  });

  it('progression outcomes map to the same action', () => {
    for (const [outcome, action] of metta.nextAction) {
      expect(omegaClawNextActionForOutcome(outcome), `outcome ${outcome}`).toBe(action);
    }
  });

  it('the hint ladder has the same four rungs', () => {
    for (const [level, hint] of metta.hints) {
      expect(omegaClawHintFor(Number(level)), `level ${level}`).toBe(hint);
    }
    expect(metta.hints.size).toBe(4);
  });

  it('transfer unlocks on exactly the rows MeTTa unlocks on', () => {
    // The pack has one `yes` row — (true, true) — and a $correct $explained
    // catch-all for everything else, so agreeing means matching that one row.
    expect([...metta.transfer].sort()).toEqual(['true,true', '$correct,$explained'].sort());
    for (const correct of [true, false]) {
      for (const explained of [true, false]) {
        const row = `${correct},${explained}`;
        expect(
          omegaClawCanUnlockTransfer(correct, explained),
          `${row} vs the pack's ${metta.transfer.has(row) ? 'yes row' : 'catch-all'}`,
        ).toBe(metta.transfer.has(row));
      }
    }
  });

  it('blocked topics are the same set', () => {
    for (const topic of metta.blockedTopics) {
      expect(isBlockedOmegaClawTopic(topic), topic).toBe(true);
    }
    expect(metta.blockedTopics.size).toBeGreaterThan(0);
  });
});

describe('scope normalisation matches the Rust canonical_grade()', () => {
  it.each([
    ['Grade 6', 'introductory'],
    ['grade-6', 'introductory'],
    ['G6', 'introductory'],
    ['Grade 11', 'senior-deep'],
    ['Senior School', 'senior-deep'],
    ['Grade 5', 'blocked'],
    ['Grade 4', 'blocked'],
    ['', 'blocked'],
    ['Year 9', 'blocked'],
  ])('%s → %s', (grade, scope) => {
    expect(omegaClawScopeFor(grade)).toBe(scope);
  });
});

describe('progression refuses to advance memorisation', () => {
  it('a correct answer with no explanation does not unlock transfer', () => {
    expect(omegaClawCanUnlockTransfer(true, false)).toBe(false);
  });

  it('an explained answer does', () => {
    expect(omegaClawCanUnlockTransfer(true, true)).toBe(true);
  });

  it('an unknown outcome is an error, not a silent default', () => {
    expect(() => omegaClawNextActionForOutcome('guessed')).toThrowError(
      /unknown Omega Claw progression outcome/,
    );
  });

  it('reads an outcome the way the Rust façade does', () => {
    // canonical_token() lowercases and swaps spaces for hyphens before lookup.
    expect(omegaClawNextActionForOutcome('  Correct ')).toBe('celebrate-transfer');
    expect(() => omegaClawNextActionForOutcome('not_quite')).toThrowError(
      /unknown Omega Claw progression outcome/,
    );
  });
});

describe('the hint ladder clamps instead of failing', () => {
  it.each([
    [0, 1],
    [1, 1],
    [4, 4],
    [9, 4],
    [2.7, 2],
  ])('level %i answers at rung %i', (requested, clamped) => {
    expect(clampOmegaClawHintLevel(requested)).toBe(clamped);
  });
});

describe('a learner never sees a MeTTa symbol', () => {
  it('every hint has wording', () => {
    for (const hint of ['notice', 'isolate-step', 'representation', 'worked-example'] as const) {
      const copy = OMEGA_CLAW_HINT_COPY[hint];
      expect(typeof copy).toBe('string');
      expect(copy.length).toBeGreaterThan(20);
      expect(copy).not.toMatch(/isolate-step|worked-example/);
    }
  });

  it('every progression action has wording', () => {
    for (const action of [
      'scaffold-retry',
      'celebrate-transfer',
      'mastery-review',
      'unlock-next-node',
    ] as const) {
      expect(OMEGA_CLAW_ACTION_COPY[action].length).toBeGreaterThan(20);
    }
  });
});

describe('blocked topics read as prose too', () => {
  it('catches a spaced-out request for trading advice', () => {
    expect(isBlockedOmegaClawTopic('lesson about crypto trading')).toBe(true);
    expect(isBlockedOmegaClawTopic('how to keep coins in a wallet')).toBe(false);
  });
});

describe('the listing getter agrees with the pack it mirrors', () => {
  const metta = mettaRules();

  it('lists, for every grade the pack pins, exactly the rows the pack pins', () => {
    // The card asks "what may this learner do next", which is a listing question, and until now the only
    // answer in the mirror was yes/no per activity. A getter written against the mirror's own table would
    // prove nothing about drift, so this asks the pack.
    const byGrade = new Map<string, string[]>();
    for (const entry of metta.activities) {
      const [grade, activity] = entry.split(',');
      if (grade.startsWith('$')) continue;
      byGrade.set(grade, [...(byGrade.get(grade) ?? []), activity]);
    }
    expect(byGrade.size).toBeGreaterThan(2);
    for (const [grade, activities] of byGrade) {
      expect([...omegaClawActivitiesFor(grade)].sort(), `activities for ${grade}`).toEqual(
        [...activities].sort(),
      );
    }
  });

  it('answers a grade the pack never pins with nothing, not with the whole pack', () => {
    expect(omegaClawScopeFor('grade4')).toBe('blocked');
    expect(omegaClawActivitiesFor('grade4')).toEqual([]);
  });

  it('folds the spellings a CBC record arrives with before it looks', () => {
    expect(omegaClawActivitiesFor('Grade-6')).toEqual(omegaClawActivitiesFor('grade6'));
    expect(omegaClawActivitiesFor('grade 6')).toEqual(omegaClawActivitiesFor('grade6'));
  });

  it('never lists an activity the per-activity check would refuse', () => {
    for (const grade of ['grade6', 'grade10', 'grade12', 'senior-school']) {
      const listed = omegaClawActivitiesFor(grade);
      for (const activity of listed) {
        expect(isOmegaClawActivityAllowed(grade, activity), `${grade}/${activity}`).toBe(true);
      }
      expect(isOmegaClawActivityAllowed(grade, 'an-activity-not-in-the-pack')).toBe(false);
    }
  });
});
