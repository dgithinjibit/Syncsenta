import { describe, expect, it } from 'vitest';
import { getAllGrades, getHardcodedStrands, getLessonsPerWeek, getLiteracyEnvelope, getSubjectsForGrade, getTermAllocation } from './index';

describe('CBC curriculum registry', () => {
  it('resolves Grade 6 AI Literacy from the canonical local adapter', () => {
    const strands = getHardcodedStrands('Grade6', 'AI Literacy');
    expect(strands).not.toBeNull();
    expect(strands).toHaveLength(5);
    expect(strands?.every((strand) => strand.subStrands.length > 0)).toBe(true);
  });

  it('accepts the persisted compact Grade6 value used by the wizard', () => {
    expect(getHardcodedStrands('Grade6', 'AI Literacy')).not.toBeNull();
  });

  it('exposes every junior-secondary grade in the selector', () => {
    expect(getAllGrades()).toEqual(expect.arrayContaining(['Grade7', 'Grade8', 'Grade9']));
  });

  it('exposes Grade 6 AI and blockchain packs to the teacher wizard', () => {
    const subjects = getSubjectsForGrade('Grade6').map((subject) => subject.name);
    expect(subjects).toContain('AI Literacy');
    expect(subjects).toContain('Blockchain Literacy');
    expect(getHardcodedStrands('Grade6', 'AI Literacy')).toHaveLength(5);
    expect(getHardcodedStrands('Grade6', 'Blockchain Literacy')).toHaveLength(5);
    expect(getLessonsPerWeek('AI Literacy')).toBe(2);
    expect(getLessonsPerWeek('Blockchain Literacy')).toBe(2);
  });

  it('keeps later-grade blockchain schemes progressively harder', () => {
    const grade6 = getHardcodedStrands('Grade6', 'Blockchain Literacy');
    const grade10 = getHardcodedStrands('Grade10', 'Blockchain Literacy');
    expect(grade6?.[2].name).toBe('3.0 Linked Records and Blockchain');
    expect(grade10?.[2].name).toBe('3.0 Consensus, Smart Contracts, and Governance');
    expect(getTermAllocation('Grade6', 'Blockchain Literacy', 'Term1')?.strands.length).toBeGreaterThan(0);
  });

  it('returns the shared versioned safety envelope for literacy packs', () => {
    const envelope = getLiteracyEnvelope('Grade 6', 'AI Literacy');
    expect(envelope).toMatchObject({
      curriculumId: 'Grade6|AI Literacy',
      schemaVersion: '2026-09-22.phase1.v1',
      gradeBand: 'upper_primary',
      lessonsPerWeek: 2,
      sourceType: 'authored',
      teacherMediationRequired: true,
      syntheticDataOnly: true,
      externalActionsAllowed: false,
      releaseState: 'teacher_review',
    });
    expect(envelope?.prohibitedOperations).toContain('seed_phrases');
  });

  it('includes several offline paper-block interactions with no real credentials or transactions', () => {
    const linkedBlocks = getHardcodedStrands('Grade6', 'Blockchain Literacy')
      ?.find((strand) => strand.name === '3.0 Linked Records and Blockchain')
      ?.subStrands.find((subStrand) => subStrand.name === '3.1 Linked Paper Blocks');
    const experiences = linkedBlocks?.suggestedExperiences ?? [];

    expect(experiences.length).toBeGreaterThanOrEqual(7);
    expect(experiences.some((experience) => experience.toLowerCase().includes('tamper'))).toBe(true);
    expect(experiences.some((experience) => experience.toLowerCase().includes('relay'))).toBe(true);
    expect(experiences.join(' ').toLowerCase()).not.toMatch(/wallet|seed phrase|real transaction/);
  });
});
