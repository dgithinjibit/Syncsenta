import { describe, expect, it } from 'vitest';
import { getHardcodedStrands, getLessonsPerWeek, getSubjectsForGrade, getTermAllocation } from './index';

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
});
