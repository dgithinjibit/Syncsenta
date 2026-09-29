import { omegaClawBlockedTopic, type OmegaClawBlockedTopic } from './omega-claw-rules';

/**
 * O-4 — turning the pack's safety boundary into something a request path hits.
 *
 * The pack declares six `(omega-claw-blocked-topic …)` rows and the mirror
 * implements them as `omegaClawBlockedTopic()`, which matches the canonical
 * identifiers (`wallet-custody`, `crypto-trading`). That is the right authority
 * and the wrong detector: a ten-year-old does not write `wallet-custody`, they
 * write "how do I start a mining wallet to keep my coins safe". Checked against
 * the deployed route, the boundary therefore gated nothing.
 *
 * This module is the translation layer between what a child types and what the
 * pack declares. The pack stays authoritative — the drift lock in
 * `src/lib/__tests__/omega-claw-safety.test.ts` parses
 * `backend/syncsenta-backend/data/omega_claw_rules.metta` and fails if a topic
 * is enforced here that the pack does not declare, or declared there with no
 * trigger here.
 *
 * Two design notes that are load-bearing:
 *
 * 1. A trigger is a *set of words that must all appear*, matched on a
 *    normalised haystack, not a phrase. Filler between the words is what
 *    children write ("start a mining wallet to keep my coins"), and a
 *    contiguous-phrase matcher would miss it while a bare word ("wallet",
 *    "invest") would refuse the approved lesson.
 * 2. There is no separate "approved topic" allow-list, and that is deliberate.
 *    `responsible-digital-citizenship` and `ai-data-literacy` are activity rows
 *    in the *same pack*, so "what is personal data and how do I keep it safe"
 *    must not be refused. The triggers stay clear of it because they encode the
 *    thing the pack actually blocks — *eliciting or acting on* personal data
 *    ("their phone number", "my … wallet", "without permission"), not teaching
 *    about it. An allow-list would be a second voice deciding what the first one
 *    means.
 */

export type OmegaClawSafetyMatch = {
  topic: OmegaClawBlockedTopic;
  /** The words that tripped, as they appear here, so a refusal can be argued with. */
  phrase: string;
};

/**
 * Word sets that all have to be present. Matched substring-first, so `invest`
 * also covers `investment` and `reinvesting`, and `permission` covers
 * `permissions`.
 */
const TRIGGERS: Readonly<Record<OmegaClawBlockedTopic, readonly (readonly string[])[]>> = {
  'crypto-trading': [
    ['trade', 'crypto'],
    ['crypto', 'trading'],
    ['buy', 'bitcoin'],
    ['sell', 'bitcoin'],
    ['bitcoin', 'profit'],
    ['which', 'coin', 'trade'],
    ['crypto', 'exchange'],
    ['day', 'trading'],
  ],
  'investment-advice': [
    ['invest', 'should'],
    ['invest', 'advice'],
    ['invest', 'recommend'],
    ['invest', 'best'],
    ['invest', 'worth'],
    ['savings', 'bitcoin'],
    ['bitcoin', 'advice'],
    ['investment', 'return'],
    ['grow', 'money', 'fast'],
  ],
  'wallet-custody': [
    ['wallet', 'my'],
    ['wallet', 'start'],
    ['wallet', 'create'],
    ['wallet', 'hold'],
    ['wallet', 'safe'],
    ['seed', 'phrase'],
    ['private', 'key'],
    ['custody'],
  ],
  'unsupervised-attack': [
    ['without', 'permission'],
    ['unauthoris'],
    ['unauthorized'],
    ['hack', 'into'],
    ['hack', 'account'],
    ['hacking'],
    ['ddos'],
    ['brute', 'force'],
    ['keylogger'],
    ['spyware'],
  ],
  'public-deployment': [
    ['deploy', 'production'],
    ['deploy', 'live'],
    ['deploy', 'publicly'],
    ['public', 'deployment'],
    ['put', 'online'],
    ['publish', 'website'],
    ['push', 'production'],
  ],
  'unnecessary-personal-data': [
    ['their', 'phone'],
    ['his', 'phone'],
    ['her', 'phone'],
    ['students', 'phone'],
    ['my', 'phone', 'number'],
    ['home', 'address'],
    ['their', 'address'],
    ['their', 'password'],
    ['students', 'password'],
    ['id', 'number'],
    ['passport', 'number'],
    ['bank', 'details'],
  ],
};

/** Lowercase, everything non-alphanumeric becomes a single space. */
function haystack(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * The text a generation request actually carries, joined for one check.
 *
 * A teacher's blocked request does not arrive as one message — it is spread over
 * `subject`, `strand`, `subStrand`, `message`. Concatenating the strings a route
 * already has is the whole trick, and it is kept here rather than inline in four
 * routes so the field list cannot quietly diverge from one generator to the next.
 * `undefined` and empty values are dropped, not stringified: a route that forgets
 * to pass a strand must not become a haystack of the word "undefined".
 */
export function omegaClawGenerationHaystack(values: readonly (string | undefined)[]): string {
  return values
    .map((value) => (value ?? '').trim())
    .filter((value) => value.length > 0)
    .join(' ');
}

/**
 * The blocked topic a piece of learner or teacher text names, or `null` when the
 * text is inside scope. Canonical identifiers are asked of the mirror first, so
 * the pack's own vocabulary keeps working after a trigger is edited.
 */
export function detectBlockedOmegaClawContent(text: string): OmegaClawSafetyMatch | null {
  const canonical = omegaClawBlockedTopic(text);
  if (canonical) return { topic: canonical, phrase: canonical };

  const words = haystack(text);
  if (!words) return null;

  for (const [topic, sets] of Object.entries(TRIGGERS) as [
    OmegaClawBlockedTopic,
    readonly (readonly string[])[],
  ][]) {
    for (const set of sets) {
      if (set.every((word) => words.includes(word))) {
        return { topic, phrase: set.join(' ') };
      }
    }
  }
  return null;
}

/**
 * What a child reads instead of an answer. Same posture as `OMEGA_CLAW_HINT_COPY`
 * and `OMEGA_CLAW_ACTION_COPY` in the mirror: words live here, the route never
 * improvises, and no MeTTa symbol reaches the screen (that was defect O-1).
 */
const LEARNER_REFUSAL: Readonly<Record<OmegaClawBlockedTopic, string>> = {
  'crypto-trading':
    'I do not help with buying, selling or trading coins — that is money advice, and you are here to learn how the technology works. A better question: what does a blockchain actually record when something is sent? Pick one transaction and we can walk through its input, its action and its output.',
  'investment-advice':
    'I will not tell you where to put money, and no teacher should either — that is not part of this course. What we can do instead: look at what a savings account, a business and a blockchain each do with the value they hold, and compare them as systems.',
  'wallet-custody':
    'Never share a seed phrase or a private key with anyone, including me, and I will not help you hold or set up a wallet for money. The part you can learn safely: what a key is for, and why losing it means losing access. Want me to explain that with a paper-and-pen analogy?',
  'unsupervised-attack':
    'I cannot help with getting into an account, a device or a network without permission — that is against the law here, permission or not. The classroom version of the same curiosity: how does a login check who you are, and what makes one password harder to guess than another? That I can go deep on.',
  'public-deployment':
    'Putting learner work live on the internet is not something I will do or talk you through, because your work belongs to you and your school. What we can do instead: prepare it for a teacher to review, and talk about what changes when something becomes public — consent, credit, and who can copy it.',
  'unnecessary-personal-data':
    'I will not collect or look up anyone’s phone number, address, ID or password, and please do not send me yours. If your project needs personal data, use pretend names and numbers. Want a set of made-up learner records to work with instead?',
};

/** The learner-facing sentence for a blocked request. Never the raw symbol. */
export function omegaClawLearnerRefusal(match: OmegaClawSafetyMatch): string {
  return LEARNER_REFUSAL[match.topic];
}

/**
 * The teacher-facing 400 body.
 *
 * A teacher is told the rule and the words that tripped it, because the teacher
 * is the one who can tell whether the boundary is right — a silent refusal with
 * no named rule is how a filter becomes an outage nobody can debug. The way back
 * is named too: an approved activity for the same strand.
 */
export function omegaClawTeacherRefusal(match: OmegaClawSafetyMatch): {
  error: string;
  detail: string;
} {
  return {
    error: 'Out of scope for SyncSenta generation',
    detail:
      `The rule pack blocks this request: (omega-claw-blocked-topic ${match.topic}), ` +
      `matched on "${match.phrase}". Rewrite the request around what the learner produces ` +
      `rather than what they would hold or publish — the approved activities for this strand ` +
      `are responsible-digital-citizenship and ai-data-literacy (Grade 6) and ` +
      `ai-evaluation-and-bias, blockchain-consensus and blockchain-governance (Senior School). ` +
      `If this refusal is wrong for your lesson, say so: the boundary is a rule file, not a mystery.`,
  };
}
