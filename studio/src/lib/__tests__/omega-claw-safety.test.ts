import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  detectBlockedOmegaClawContent,
  omegaClawGenerationHaystack,
  omegaClawLearnerRefusal,
  omegaClawTeacherRefusal,
  type OmegaClawSafetyMatch,
} from '../omega-agent/omega-claw-safety';

/**
 * O-4 — the safety boundary gates something.
 *
 * The rule pack has six `(omega-claw-blocked-topic …)` rows and the mirror has
 * `isBlockedOmegaClawTopic()`, but the matcher only recognises the canonical
 * identifiers themselves (`wallet-custody`, `crypto-trading`). No child ever
 * types those: a child types "how do I start a mining wallet". So the boundary
 * was prose, and `grep -rn isBlockedOmegaClawTopic studio/src` proved it — the
 * only callers were the mirror's own tests.
 *
 * These tests hold two things at once, and the second is what keeps this
 * honest: an out-of-scope request must be refused, and an in-scope CBC lesson
 * about the same words must not be. `responsible-digital-citizenship` and
 * `ai-data-literacy` are approved activities in the *same pack* — a matcher that
 * refused "personal data" outright would refuse the curriculum it protects.
 */

const REPO = join(process.cwd(), '..');
const METTA_FILE = join(REPO, 'backend', 'syncsenta-backend', 'data', 'omega_claw_rules.metta');

/** The pack is the authority on which topics exist, so the test reads it directly. */
function packStatements(predicate: (args: string[]) => string | null): Set<string> {
  const found = new Set<string>();
  for (const line of readFileSync(METTA_FILE, 'utf8').split('\n')) {
    const match = /^\(\s*([a-z-]+)((?:\s+[^\s)]+)*)\s*\)/.exec(line.trim());
    if (!match) continue;
    const args = match[2].trim().split(/\s+/).filter(Boolean);
    const value = predicate([match[1], ...args]);
    if (value) found.add(value);
  }
  return found;
}

function packBlockedTopics(): Set<string> {
  return packStatements(([head, topic]) => (head === 'omega-claw-blocked-topic' ? topic : null));
}

function packApprovedActivities(): Set<string> {
  return packStatements(([head, , activity]) => (head === 'omega-claw-activity' ? activity : null));
}

function matchFor(topic: string): OmegaClawSafetyMatch {
  const found = detectBlockedOmegaClawContent(topic);
  if (!found) throw new Error(`${topic} has no learner-facing trigger at all`);
  return found;
}

describe('the six blocked topics answer to what a learner actually types', () => {
  it('catches a request to hold a child’s crypto', () => {
    expect(detectBlockedOmegaClawContent('how do I start a mining wallet to keep my coins safe'))
      .toMatchObject({ topic: 'wallet-custody' });
  });

  it('catches a trading tip dressed as homework', () => {
    expect(detectBlockedOmegaClawContent('which coin should I trade today for the best profit'))
      .toMatchObject({ topic: 'crypto-trading' });
  });

  it('catches investment advice', () => {
    expect(detectBlockedOmegaClawContent('should I put my savings in bitcoin for a project essay'))
      .toMatchObject({ topic: 'investment-advice' });
  });

  it('catches an unsupervised attack', () => {
    expect(detectBlockedOmegaClawContent('how do I get into my friend account without permission'))
      .toMatchObject({ topic: 'unsupervised-attack' });
  });

  it('catches asking for someone’s identifying details', () => {
    expect(detectBlockedOmegaClawContent('what is their phone number and home address'))
      .toMatchObject({ topic: 'unnecessary-personal-data' });
  });

  it('catches a request to put learner work live', () => {
    expect(detectBlockedOmegaClawContent('help me deploy this to production')).toMatchObject({
      topic: 'public-deployment',
    });
  });

  it('still catches the canonical identifier itself, because the mirror answers that', () => {
    expect(detectBlockedOmegaClawContent('wallet-custody')).toMatchObject({ topic: 'wallet-custody' });
  });

  it('reports the phrase it tripped on, so a refusal can be argued with', () => {
    const found = detectBlockedOmegaClawContent('help me deploy this to production');
    expect(found?.phrase.length).toBeGreaterThan(0);
  });
});

describe('what stays in scope', () => {
  it('leaves an ordinary curriculum question alone', () => {
    expect(detectBlockedOmegaClawContent('what is an input and an output in a computer system')).toBeNull();
  });

  it('leaves the approved digital-citizenship lesson alone, even though it says personal data', () => {
    expect(detectBlockedOmegaClawContent('what is personal data and how do I keep it safe online')).toBeNull();
  });

  it('leaves an approved AI-evaluation question alone', () => {
    expect(detectBlockedOmegaClawContent('how do I check whether an AI answer is biased')).toBeNull();
  });

  it('leaves a mathematics question about a phone number alone', () => {
    // "unnecessary" is the word in the pack's row. A Grade 4 place-value
    // problem names digits and numbers and is not asking for anyone's details.
    expect(detectBlockedOmegaClawContent('a phone number has 10 digits, how many combinations are possible')).toBeNull();
  });

  it('leaves the password-safety lesson alone', () => {
    expect(detectBlockedOmegaClawContent('teach me why I should never share my password with a friend')).toBeNull();
  });

  it('leaves a school hackathon alone', () => {
    expect(detectBlockedOmegaClawContent('we have a hackathon next week, what should my team build')).toBeNull();
  });

  it('is stable: the same text gives the same answer twice', () => {
    const text = 'how do I start a mining wallet to keep my coins safe';
    expect(detectBlockedOmegaClawContent(text)).toEqual(detectBlockedOmegaClawContent(text));
  });
});

describe('drift lock against the pack', () => {
  it('covers every blocked topic the pack declares', () => {
    const declared = packBlockedTopics();
    expect(declared.size).toBeGreaterThan(0);
    for (const topic of declared) {
      expect(matchFor(topic).topic, `${topic} has no learner-facing trigger`).toBe(topic);
    }
  });

  it('enforces no topic the pack does not declare', () => {
    const declared = packBlockedTopics();
    const enforced = new Set<string>();
    for (const probe of [
      'crypto-trading', 'investment-advice', 'wallet-custody',
      'unsupervised-attack', 'public-deployment', 'unnecessary-personal-data',
      'government-spying', 'weapon-manufacture',
    ]) {
      const found = detectBlockedOmegaClawContent(probe);
      if (found) enforced.add(found.topic);
    }
    for (const topic of enforced) {
      expect(declared.has(topic), `${topic} is enforced but absent from the pack`).toBe(true);
    }
    expect(enforced.has('government-spying')).toBe(false);
  });

  it('knows the approved activities it must not refuse', () => {
    const approved = packApprovedActivities();
    expect(approved.has('responsible-digital-citizenship')).toBe(true);
    expect(approved.has('ai-data-literacy')).toBe(true);
  });
});

describe('the refusal a learner sees', () => {
  it('is a sentence, not a symbol', () => {
    const message = omegaClawLearnerRefusal(matchFor('wallet-custody'));
    expect(message).not.toContain('wallet-custody');
    expect(message.length).toBeGreaterThan(40);
    expect(message.length).toBeLessThan(400);
  });

  it('offers the next thing to do instead of only saying no', () => {
    const message = omegaClawLearnerRefusal(matchFor('crypto-trading'));
    expect(message).toMatch(/\?|[Tt]ry|[Aa]sk|[Cc]hoose|[Pp]ick|instead/);
  });

  it('writes a sentence for every topic the pack declares', () => {
    for (const topic of packBlockedTopics()) {
      expect(omegaClawLearnerRefusal(matchFor(topic)).length, `${topic} has no learner wording`).toBeGreaterThan(40);
    }
  });
});

describe('the refusal a teacher sees', () => {
  it('names the rule, the trigger and the way back', () => {
    const body = omegaClawTeacherRefusal(matchFor('crypto-trading'));
    expect(body.error).toBe('Out of scope for SyncSenta generation');
    expect(body.detail).toContain('crypto-trading');
    expect(body.detail).toContain('omega-claw-blocked-topic');
  });
});

describe('the boundary sits on every generation path, not only the tutor', () => {
  // A guard a caller can forget is a guard that will be forgotten. These read
  // the route sources and check the order, because `/api/generate/*` forwards
  // the teacher's request to the AI service — so a late check is a prompt that
  // already left the building.
  const guardedRoutes = [
    'src/app/api/chat/route.ts',
    'src/app/api/generate/assessment/route.ts',
    'src/app/api/generate/exam/route.ts',
    'src/app/api/generate/lesson-plan/route.ts',
    'src/app/api/generate/scheme/route.ts',
  ];

  for (const relative of guardedRoutes) {
    it(`${relative} asks the rule pack before it asks a provider`, () => {
      const source = readFileSync(join(REPO, 'studio', relative), 'utf8');
      // The call site, not the import: the import line names the symbol without
      // ever calling it, so `(` is what distinguishes the two.
      const guard = source.lastIndexOf('detectBlockedOmegaClawContent(');
      expect(guard, 'the route never calls the blocked-topic rules').toBeGreaterThan(-1);

      const markers = [
        'fetch(', 'buildApiUrl(', 'new Groq(', 'new GoogleGenerativeAI(',
      ];
      const found = markers
        .map((marker) => source.indexOf(marker))
        .filter((at) => at !== -1);
      expect(found.length, 'this route reaches no provider, so the ordering claim is empty').toBeGreaterThan(0);
      expect(guard, 'the guard runs after the provider is already reached').toBeLessThan(Math.min(...found));
    });
  }

  it('joins the teacher fields a request carries, without inventing any', () => {
    const haystack = omegaClawGenerationHaystack([
      undefined, 'Digital Literacy', 'how do I trade crypto', '', 'Term 2',
    ]);
    expect(haystack).toBe('Digital Literacy how do I trade crypto Term 2');
    expect(detectBlockedOmegaClawContent(haystack)?.topic).toBe('crypto-trading');
  });

  it('leaves a normal allocation readable as in scope', () => {
    const haystack = omegaClawGenerationHaystack(['Computer Studies', 'AI input and output', 'Term 1']);
    expect(detectBlockedOmegaClawContent(haystack)).toBeNull();
  });
});
