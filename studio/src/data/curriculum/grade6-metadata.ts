import type { StrandInfo, SubStrandInfo } from './types';

type LiteracySubject = 'AI Literacy' | 'Blockchain Literacy';

/** Add the teacher-facing completion contract to every authored Grade 6 sub-strand. */
export function completeGrade6Pack(
  strands: StrandInfo[],
  subject: LiteracySubject,
): StrandInfo[] {
  const safetyNotes = subject === 'AI Literacy'
    ? [
        'Use fictional or synthetic examples only; do not enter learner names, locations, images, or contact details.',
        'Use intelligent tools only through teacher demonstration or a teacher-approved offline simulation.',
        'Never treat generated output as automatically true; ask a learner to check, explain, and acknowledge assistance.',
      ]
    : [
        'Use paper records and fictional entries only; do not create wallets, tokens, accounts, or real transactions.',
        'Do not request passwords, PINs, seed phrases, private keys, identity records, or private financial information.',
        'Teach blockchain as record-keeping and coordination; include a human correction and review route.',
      ];

  return strands.map((strand) => ({
    ...strand,
    subStrands: strand.subStrands.map((subStrand: SubStrandInfo) => {
      const firstOutcome = subStrand.learningOutcomes?.[0] ?? `explain ${subStrand.name}`;
      return {
        ...subStrand,
        prerequisites: [
          'Learner can listen to a short teacher model and explain an example in their own words.',
        ],
        misconceptions: [
          subject === 'AI Literacy'
            ? 'A machine output is not automatically true, fair, or intelligent.'
            : 'A linked or shared record is not automatically true and is not the same as cryptocurrency.',
        ],
        assessmentEvidence: [
          `Teacher observation: learner can ${firstOutcome}.`,
          'Guided-to-independent mastery check using a fictional classroom example.',
          'Short oral, drawing, sorting, or written exit response with one reflection prompt.',
        ],
        safetyNotes,
      };
    }),
  }));
}
