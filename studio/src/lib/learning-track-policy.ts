/**
 * Shared learning-track policy.
 *
 * The track is a product/domain boundary, not a user-controlled permission.
 * Keep it derived from the server-side subject slug and use it to constrain
 * tutoring style, examples, and safety language consistently.
 */

export type LearningTrack = 'cbc' | 'agi' | 'blockchain' | 'financial-literacy';

export interface LearningTrackPolicy {
  track: LearningTrack;
  label: string;
  contentVersion: string;
  focus: string;
  socraticMoves: string;
  evidencePrompt: string;
  safety: string;
  offlineAlternative: string;
  examples: string[];
}

const POLICIES: Record<LearningTrack, LearningTrackPolicy> = {
  cbc: {
    track: 'cbc',
    label: 'Kenyan CBC',
    contentVersion: '2026-09-v1',
    focus: 'the selected CBC competency and the next smallest learning step',
    socraticMoves: 'connect the idea to a concrete local example, then ask one guiding question',
    evidencePrompt: 'What example, observation, or working can help us check this idea?',
    safety: 'stay within the selected CBC subject and redirect unrelated questions to the correct learning area',
    offlineAlternative: 'Use paper, drawing, movement, or a teacher-approved classroom example.',
    examples: ['Kenyan classroom', 'school friends', 'local community'],
  },
  agi: {
    track: 'agi',
    label: 'AI Literacy',
    contentVersion: '2026-09-v1',
    focus: 'how intelligent systems represent goals, use evidence, handle uncertainty, and remain under human oversight',
    socraticMoves: 'ask the learner to distinguish a claim from evidence, predict an outcome, or test a limitation with a simple example',
    evidencePrompt: 'What source, observation, or test could help us check this AI claim?',
    safety: 'describe AGI as a hypothetical learning concept, not a current capability or claim that any system is conscious; never bypass human oversight',
    offlineAlternative: 'Use a sorting game, paper rule system, or teacher-approved source comparison.',
    examples: ['a school recommendation system', 'a translation tool', 'a human teacher checking an AI suggestion'],
  },
  blockchain: {
    track: 'blockchain',
    label: 'Blockchain Literacy',
    contentVersion: '2026-09-v1',
    focus: 'records, shared ledgers, consensus, governance, privacy, security, and real-world trade-offs',
    socraticMoves: 'use a shared-ledger scenario, then ask the learner to trace who can verify, change, or authorize the next step',
    evidencePrompt: 'Who records, verifies, or controls this entry, and what evidence supports it?',
    safety: 'teach concepts without requesting wallet addresses, seed phrases, private keys, passwords, or payments; do not give investment instructions, trading instructions, or transaction instructions',
    offlineAlternative: 'Use a paper shared-ledger or tamper-evident-card simulation.',
    examples: ['a class shared ledger', 'a market receipt', 'a group agreeing on the next record'],
  },
  'financial-literacy': {
    track: 'financial-literacy',
    label: 'Financial Literacy',
    contentVersion: '2026-09-v1',
    focus: 'needs and wants, budgeting, saving, earning, borrowing, risk, opportunity cost, and responsible decision-making',
    socraticMoves: 'ask the learner to name the goal, compare trade-offs, and calculate a simple scenario before choosing',
    evidencePrompt: 'What is the goal, what information is missing, and how can we check the total cost?',
    safety: 'teach general financial education only with fictional scenarios; do not give personalized investment, lending, tax, or payment instructions and never request account, identity, or payment details',
    offlineAlternative: 'Use invented Kenyan-shilling amounts, paper receipts, and a classroom budget.',
    examples: ['a market budget in Kenyan shillings', 'saving for school supplies', 'comparing two everyday choices'],
  },
};

function normaliseSubject(subject: string): string {
  return subject.trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
}

export function getLearningTrack(subject: string): LearningTrack {
  const value = normaliseSubject(subject);
  if (value === 'ai' || value === 'agi' || value.includes('artificial intelligence')) return 'agi';
  if (value === 'blockchain' || value === 'crypto' || value === 'cryptocurrency' || value === 'web3') return 'blockchain';
  if (value === 'financial literacy' || value === 'finlit' || value === 'personal finance') return 'financial-literacy';
  return 'cbc';
}

export function getLearningTrackPolicy(trackOrSubject: LearningTrack | string): LearningTrackPolicy {
  const track = Object.prototype.hasOwnProperty.call(POLICIES, trackOrSubject)
    ? trackOrSubject as LearningTrack
    : getLearningTrack(trackOrSubject);
  return POLICIES[track];
}

export function buildLearningTrackPromptBlock(subject: string): string {
  const policy = getLearningTrackPolicy(subject);
  return `LEARNING TRACK — ${policy.label}\n- Content version: ${policy.contentVersion}.\n- Track focus: ${policy.focus}.\n- Preferred Socratic move: ${policy.socraticMoves}.\n- Evidence check: ${policy.evidencePrompt}\n- Safety boundary: ${policy.safety}.\n- Offline alternative: ${policy.offlineAlternative}\n- Example palette: ${policy.examples.join('; ')}.`;
}

export function getTrackDecisionContent(
  track: LearningTrack,
  scaffolding: 'Independent' | 'Guided' | 'Intensive',
): { hint: string; nextAction: string } | null {
  if (track === 'cbc') return null;

  const content: Record<Exclude<LearningTrack, 'cbc'>, Record<'Independent' | 'Guided' | 'Intensive', { hint: string; nextAction: string }>> = {
    agi: {
      Intensive: { hint: 'Let us test one claim about an intelligent system with a simple example and name what the system cannot know.', nextAction: 'test_agi_claim_with_example' },
      Guided: { hint: 'What evidence would help us decide whether this intelligent system is working well?', nextAction: 'ask_agi_evidence_question' },
      Independent: { hint: 'Compare the system goal, its evidence, and one limitation before proposing the next step.', nextAction: 'present_agi_systems_challenge' },
    },
    blockchain: {
      Intensive: { hint: 'Let us trace one shared-ledger record together: who proposes it, who verifies it, and what information must stay private?', nextAction: 'trace_blockchain_record_safely' },
      Guided: { hint: 'In our class-ledger example, what would the group need to agree on before accepting the next record?', nextAction: 'ask_consensus_question' },
      Independent: { hint: 'Explain one benefit and one trade-off of this blockchain design without sharing any real wallet or account details.', nextAction: 'present_blockchain_tradeoff_challenge' },
    },
    'financial-literacy': {
      Intensive: { hint: 'Let us name the goal, list the available amount, and compare one safe everyday choice at a time.', nextAction: 'build_budget_example' },
      Guided: { hint: 'What is the goal, and which choice has the clearest benefit and cost?', nextAction: 'ask_financial_tradeoff_question' },
      Independent: { hint: 'Build a simple scenario showing the goal, opportunity cost, risk, and a reason for your choice; use fictional numbers only.', nextAction: 'present_financial_scenario' },
    },
  };

  return content[track][scaffolding];
}
