import type { StrandInfo, SubStrandInfo } from './types';

/**
 * Blockchain Literacy curriculum pack.
 *
 * This is record-keeping and systems literacy, not cryptocurrency training.
 * Lessons use Suzuki-inspired listening, modelling, encouragement, and group
 * learning, combined with Kumon-inspired short practice, mastery checks, and
 * stepwise progression. All activities are fictional, offline-friendly, and
 * teacher mediated.
 */

export const BLOCKCHAIN_LITERACY_VERSION = '2026-09-22.blockchain-literacy.v1';

const ss = (
  name: string,
  lessons: number,
  keyInquiryQuestion: string,
  learningOutcomes: string[],
  suggestedExperiences: string[],
): SubStrandInfo => ({
  name,
  lessons,
  keyInquiryQuestion,
  learningOutcomes,
  suggestedExperiences,
});

const grade6Strands: StrandInfo[] = [
  {
    name: '1.0 Records and Trust',
    description: 'Understand why people keep records and how trust is built.',
    subStrands: [
      ss('1.1 Events and Records', 4, 'What is the difference between something happening and recording it?', ['distinguish an event from its record', 'identify the purpose of a simple school or community record', 'value accuracy and respect for privacy'], ['Listen to a story and sort event cards from record cards', 'Model a fictional library or seed-bank register with paper cards', 'Practise a short Stop–Check–Ask routine before recording']),
      ss('1.2 Who Can See or Change a Record?', 4, 'Who should be trusted with a record?', ['identify record owners, users, and reviewers', 'compare a private notebook with a shared class register', 'show responsibility when handling information'], ['Role-play a record keeper, reviewer, and community member', 'Sort fictional information into shareable and private', 'Complete a two-minute independent accuracy check']),
    ],
  },
  {
    name: '2.0 Shared Ledgers',
    description: 'Explore matching copies, agreed rules, and verification.',
    subStrands: [
      ss('2.1 Paper Shared Ledger', 5, 'How can a group keep matching records?', ['explain a shared ledger using a classroom example', 'create and compare matching paper ledger copies', 'cooperate when checking an entry'], ['Teacher models one entry while learners listen and repeat the rule', 'Groups maintain fictional water, book, or harvest records', 'Ledger relay: each group adds one fictional entry, passes its copy, and checks whether the next group recorded the same entry', 'Human checksum: pairs read the same three entries aloud, circle differences, and agree on a correction without erasing the original', 'Use bottle tops, beans, or stones as counters to act out additions and removals before writing the entry', 'Use a short mastery card: entry, check, explain']),
      ss('2.2 Rules and Verification', 5, 'How do we check whether a new entry follows the rules?', ['state simple rules for accepting a record', 'verify a fictional entry against an agreed rule', 'explain why checking is different from trusting blindly'], ['Sort valid and invalid fictional entries', 'Verification stations: check date, owner, quantity, and reason using four paper stations', 'Pair-check one entry and explain the reason', 'Tamper detective: the teacher changes one copied card while learners use a checklist to find the mismatch', 'Consensus corners: learners stand by Accept, Reject, or Ask for Clarification and give one reason', 'Repeat with a new example until the learner can work independently']),
    ],
  },
  {
    name: '3.0 Linked Records and Blockchain',
    description: 'Build a concrete mental model of linked blocks without code or wallets.',
    subStrands: [
      ss('3.1 Linked Paper Blocks', 5, 'What happens when records refer to earlier records?', ['describe a block as a group of linked records', 'show how changing an earlier card affects later links', 'recognise that linking does not make information true'], ['Build a paper chain of fictional class events', 'Block builder: teams make cards with entry, previous-card number, verifier mark, and a simple colour pattern', 'Link-and-pass relay: each team adds a block, reads the previous reference aloud, and passes the chain to another team', 'Tamper hunt: secretly alter one earlier card, then let teams trace which later links no longer agree', 'Repair without rewriting: learners attach a correction card and explain why an old record remains visible', 'Chain freeze: groups point to the first block, latest block, and the link that connects them', 'Draw or narrate the chain in a chosen response mode', 'Exit ticket: explain what linking helps us notice and what it cannot prove']),
      ss('3.2 Blockchain Is Not Cryptocurrency', 5, 'How is a shared record different from money?', ['distinguish blockchain technology from cryptocurrency and investment', 'give one safe educational example of a shared record', 'reject token, wallet, and trading requests in a classroom scenario'], ['Classify scenario cards as record-keeping, money, or unsafe request', 'Human ledger versus blockchain drama: learners act as record keepers, verifiers, and observers', 'Sort picture cards into record, payment, identity, or unsafe request without using real accounts', 'Explain blockchain to a younger learner without using investment language', 'Myth–evidence line: learners place statements on Agree, Unsure, or Disagree and justify the placement', 'Complete a teacher-reviewed exit check']),
    ],
  },
  {
    name: '4.0 Choosing the Right Record System',
    description: 'Compare ordinary registers, databases, and shared ledgers.',
    subStrands: [
      ss('4.1 Database or Shared Ledger?', 5, 'When is a normal database better?', ['compare a normal database with a shared ledger', 'choose a suitable system for a fictional school problem', 'justify a choice using evidence and simplicity'], ['Use a teacher decision table for library, timetable, and community records', 'Work through one example with a partner then one independently', 'Share the reason for the chosen system']),
      ss('4.2 Accuracy, Privacy, and Access', 5, 'Can a system be secure and still contain wrong information?', ['explain that a verified record can still contain a wrong entry', 'identify privacy and access risks', 'suggest a safer design using fictional data'], ['Find errors in a fictional ledger', 'Sort risks into accuracy, privacy, access, and fairness', 'Create a safe-system poster or oral explanation']),
    ],
  },
  {
    name: '5.0 Responsible Community Projects',
    description: 'Apply record and trust ideas to a small, human-reviewed project.',
    subStrands: [
      ss('5.1 Community Record Proposal', 5, 'What record could help our community, and what could go wrong?', ['propose a small fictional record-keeping use', 'identify who benefits and who may be excluded', 'include a human review and correction route'], ['Listen to a model proposal before drafting one', 'Choose from agriculture, water, books, or environment scenarios', 'Use a short checklist for purpose, access, privacy, and correction']),
      ss('5.2 Explain, Review, Improve', 4, 'How can we improve an idea after feedback?', ['communicate how the proposed system works', 'respond to teacher and peer feedback', 'reflect on one improvement and one remaining uncertainty'], ['Present by speech, drawing, role-play, or writing', 'Use a two-point feedback card', 'Revise and complete a mastery reflection']),
    ],
  },
];

const juniorStrands = (grade: number): StrandInfo[] => [
  {
    name: '1.0 Data, Records, and Trust',
    description: 'Analyse how records acquire meaning, authority, and limits.',
    subStrands: [
      ss('1.1 Data Provenance and Claims', 5, 'Where did this record come from, and what claim does it support?', ['trace provenance for a fictional record', 'separate evidence, claim, forecast, and opinion', 'state uncertainty when provenance is incomplete'], ['Model a source-checking routine', 'Audit a synthetic community dataset', 'Complete short independent claim-evidence matches']),
      ss('1.2 Identity, Privacy, and Access', 5, 'Who should control access to a record?', ['compare identity, permission, and access roles', 'identify privacy risks in shared systems', 'design a minimum-data access rule'], ['Map roles for a fictional school certificate system', 'Redact unnecessary fields from sample records', 'Explain a safer access decision']),
    ],
  },
  {
    name: '2.0 Blockchain Mechanics',
    description: 'Reason about hashes, links, signatures, and validation using simulations.',
    subStrands: [
      ss('2.1 Hashes and Tamper Evidence', 6, 'How can a small change make a record mismatch?', ['explain a hash as a change-sensitive fingerprint analogy', 'detect a changed fictional block', 'state why tamper evidence is not proof of truth'], ['Use paper hash cards and a teacher-provided calculator or visual', 'Change one value and predict the mismatch', 'Repeat the same reasoning independently']),
      ss('2.2 Keys, Signatures, and Verification', 6, 'How can a system check who approved an entry?', ['distinguish a public identifier from a secret credential', 'explain a signature as evidence of approval', 'protect secrets and reject credential requests'], ['Use fictional cards rather than real keys', 'Verify signed scenario cards with an agreed rule', 'Complete a privacy and security retrieval drill']),
    ],
  },
  {
    name: '3.0 Consensus and Governance',
    description: 'Compare agreement methods and the people who set system rules.',
    subStrands: [
      ss('3.1 Agreement Under Rules', 6, 'How can a group agree on the next record?', ['compare simple consensus rules', 'identify trade-offs between speed, participation, and control', 'justify a rule for a fictional use case'], ['Run a paper consensus simulation', 'Change one rule and observe the result', 'Write a short evidence-based comparison']),
      ss('3.2 Governance and Accountability', 6, 'Who can change the rules when the system causes harm?', ['identify governance roles and escalation routes', 'explain why technical rules need human accountability', 'propose a correction or appeal process'], ['Role-play a school, cooperative, and public-record governance panel', 'Use a rubric to assess accountability', 'Complete a short independent case response']),
    ],
  },
  {
    name: '4.0 System Choice and Social Impact',
    description: 'Evaluate whether blockchain is appropriate, useful, and fair.',
    subStrands: [
      ss('4.1 When Not to Use Blockchain', 6, 'What makes a normal database the better choice?', ['compare cost, privacy, speed, and control', 'select the simplest safe system for a case', 'defend a choice with evidence'], ['Analyse fictional school, farm, and health-record cases without real data', 'Use a decision matrix', 'Repeat with a new case for transfer']),
      ss('4.2 Inclusion, Energy, and Access', 6, 'Who may be helped or excluded by this system?', ['identify access, disability, connectivity, and energy considerations', 'describe unequal effects of a design', 'suggest an offline or low-connectivity alternative'], ['Map stakeholders and constraints', 'Redesign a system for a low-connectivity context', 'Present the improvement in a chosen mode']),
    ],
  },
  {
    name: '5.0 Evidence-Based Project',
    description: 'Research and communicate a safe, fictional system proposal.',
    subStrands: [
      ss('5.1 Comparative Design Project', 7, 'Which record system best fits this fictional problem?', ['define a bounded research question', 'compare at least two system designs', 'collect and cite teacher-approved evidence'], ['Teacher models a project plan', 'Learners complete short research and evidence tasks', 'Use checkpoints before moving to the next project step']),
      ss('5.2 Review, Revision, and Defence', 7, 'How do we defend a design while admitting uncertainty?', ['defend a design and its limitations', 'respond to critique respectfully', 'revise a proposal after review'], ['Peer-review a fictional proposal', 'Revise using a three-item checklist', 'Present to a teacher-led panel with a reflection']),
    ],
  },
];

const seniorStrands = (grade: number): StrandInfo[] => [
  {
    name: '1.0 Distributed Systems Foundations',
    description: 'Model distributed records and analyse the assumptions behind trust.',
    subStrands: [
      ss('1.1 State, Replication, and Provenance', 6, 'How do independent systems maintain a shared view?', ['model state replication and provenance', 'analyse conflicting records', 'evaluate evidence quality and uncertainty'], ['Listen to a worked state-transition example', 'Practise one conflict-resolution problem at a time', 'Complete an independent transfer case']),
      ss('1.2 Threat Models and Trust Boundaries', 6, 'What can fail even when the ledger is functioning?', ['identify endpoint, governance, and data-entry failures', 'construct a simple threat model', 'prioritise mitigations using evidence'], ['Teacher models a threat tree', 'Learners solve bounded threat scenarios', 'Use retrieval practice to explain one mitigation']),
    ],
  },
  {
    name: '2.0 Cryptographic Building Blocks',
    description: 'Study hashes, signatures, keys, and privacy with safe simulations.',
    subStrands: [
      ss('2.1 Hashes, Merkle Structures, and Integrity', 7, 'How can systems detect change efficiently?', ['explain hash and Merkle-tree analogies', 'trace an integrity check', 'distinguish integrity from correctness'], ['Work from a concrete paper tree to an abstract diagram', 'Solve short integrity exercises with immediate feedback', 'Apply the idea to a new fictional system']),
      ss('2.2 Signatures, Keys, and Privacy', 7, 'How should approval and secrecy be separated?', ['compare signing, encryption, and access control', 'analyse key-management risks', 'design a non-sensitive verification flow'], ['Use fictional credentials only', 'Audit a proposed access flow', 'Complete a mastery explanation without exposing secrets']),
    ],
  },
  {
    name: '3.0 Consensus, Smart Contracts, and Governance',
    description: 'Evaluate agreement mechanisms, automation, and institutional responsibility.',
    subStrands: [
      ss('3.1 Consensus and Incentive Trade-offs', 7, 'What does a consensus mechanism optimise, and at what cost?', ['compare consensus families at a conceptual level', 'analyse security, energy, speed, and participation trade-offs', 'support a judgement with dated sources'], ['Model a comparison table', 'Complete one trade-off row at a time', 'Defend a conclusion and name uncertainty']),
      ss('3.2 Contract Rules and Human Oversight', 7, 'When should an automated rule stop and ask a person?', ['explain the limits of automated contract rules', 'identify appeal, correction, and safeguarding routes', 'design a human-approval checkpoint'], ['Audit fictional contract scenarios', 'Role-play an exception panel', 'Write a bounded governance recommendation']),
    ],
  },
  {
    name: '4.0 Architecture, Regulation, and Impact',
    description: 'Design responsible systems within legal, social, and technical constraints.',
    subStrands: [
      ss('4.1 Architecture and Interoperability', 7, 'Which components should be shared, private, or off-chain?', ['compare architectural choices', 'evaluate interoperability and failure modes', 'choose a minimal safe architecture'], ['Decompose a fictional certificate or cooperative system', 'Practise component-choice decisions', 'Review a peer architecture against a checklist']),
      ss('4.2 Regulation, Ethics, and Public Interest', 7, 'What makes a distributed system legitimate and accountable?', ['research relevant policy and regulation using dated sources', 'analyse rights, inclusion, and public-interest trade-offs', 'communicate a cautious recommendation'], ['Teacher provides a source register', 'Learners classify claims as fact, forecast, opinion, or advertisement', 'Defend a recommendation with explicit limitations']),
    ],
  },
  {
    name: '5.0 Capstone Research and Evaluation',
    description: 'Conduct a teacher-reviewed comparative study without real transactions or personal data.',
    subStrands: [
      ss('5.1 System Evaluation Project', 8, 'Does this problem need a distributed ledger?', ['define and investigate a research question', 'evaluate a blockchain design against a simpler alternative', 'use reproducible fictional evidence'], ['Follow staged project checkpoints', 'Practise a small evaluation before the full project', 'Maintain a decision and uncertainty log']),
      ss('5.2 Defence, Reflection, and Safe Handoff', 8, 'How should a technical proposal be handed to accountable people?', ['defend findings and limitations', 'incorporate review and document revisions', 'identify when professional or trusted-adult review is required'], ['Present to a teacher-led review panel', 'Revise after one round of feedback', 'Complete a retrieval-and-reflection close']),
    ],
  },
];

export const grade6Blockchain: StrandInfo[] = grade6Strands;
export const grade7Blockchain: StrandInfo[] = juniorStrands(7);
export const grade8Blockchain: StrandInfo[] = juniorStrands(8);
export const grade9Blockchain: StrandInfo[] = juniorStrands(9);
export const grade10Blockchain: StrandInfo[] = seniorStrands(10);
export const grade11Blockchain: StrandInfo[] = seniorStrands(11);
export const grade12Blockchain: StrandInfo[] = seniorStrands(12);

export const blockchainStrandsByGrade: Record<string, StrandInfo[]> = {
  Grade6: grade6Blockchain,
  Grade7: grade7Blockchain,
  Grade8: grade8Blockchain,
  Grade9: grade9Blockchain,
  Grade10: grade10Blockchain,
  Grade11: grade11Blockchain,
  Grade12: grade12Blockchain,
};
