import { describe, it, expect, beforeEach } from 'vitest';
import { CBCCurriculumAgent } from '../cbc-curriculum-agent';
import { getOmegaClawTeacherCurriculumContext } from '@/curriculum/omega-claw-ai-blockchain';

describe('CBC Curriculum Agent', () => {
  let agent: CBCCurriculumAgent;

  beforeEach(() => {
    agent = new CBCCurriculumAgent();
  });

  describe('Curriculum Knowledge', () => {
    it('should provide accurate Grade 4 Mathematics learning outcomes', async () => {
      const query = 'What are the learning outcomes for Grade 4 Mathematics fractions?';
      const response = await agent.query(query, { grade: 'g4', subject: 'Mathematics' });

      expect(response.isAccurate).toBe(true);
      expect(response.source).toContain('KICD');
      expect(response.content).toContain('fraction');
      expect(response.curriculumAlignment).toBe('CBC Grade 4 Mathematics');
    });

    it('should identify curriculum-aligned vs non-aligned content', async () => {
      const alignedQuery = 'Explain fractions using parts of a whole for Grade 4';
      const nonAlignedQuery = 'Teach calculus to Grade 4 students';

      const aligned = await agent.validateCurriculumAlignment(alignedQuery, { grade: 'g4', subject: 'Mathematics' });
      const nonAligned = await agent.validateCurriculumAlignment(nonAlignedQuery, { grade: 'g4', subject: 'Mathematics' });

      expect(aligned.isAligned).toBe(true);
      expect(aligned.confidence).toBeGreaterThan(0.8);
      expect(nonAligned.isAligned).toBe(false);
      expect(nonAligned.reason).toContain('not appropriate for Grade 4');
    });

    it('should provide CBC competency mappings', async () => {
      const competencies = await agent.getCompetencies('g4', 'Mathematics', 'fractions');

      expect(competencies).toHaveLength(3);
      expect(competencies[0]).toMatchObject({
        code: expect.stringMatching(/^CBC-G4-MATH-/),
        description: expect.stringContaining('fraction'),
        level: 'Grade 4',
        subject: 'Mathematics'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown curriculum queries gracefully', async () => {
      const response = await agent.query('What is quantum physics?', { grade: 'g4', subject: 'Mathematics' });

      expect(response.isAccurate).toBe(false);
      expect(response.error).toContain('not found in CBC curriculum');
      expect(response.suggestions).toHaveLength(3);
    });

    it('should validate grade and subject combinations', async () => {
      const invalidResponse = await agent.query('Grade 15 Chemistry', { grade: 'g15', subject: 'Chemistry' });

      expect(invalidResponse.isAccurate).toBe(false);
      expect(invalidResponse.error).toContain('Invalid grade level');
    });
  });

  describe('Multi-language Support', () => {
    it('should respond in Kiswahili when requested', async () => {
      const response = await agent.query('Eleza fractions kwa Kiswahili', { 
        grade: 'g4', 
        subject: 'Mathematics',
        language: 'kiswahili'
      });

      expect(response.content).toMatch(/sehemu|fungu|mgawanyiko/);
      expect(response.language).toBe('kiswahili');
    });
  });

  describe('Omega Claw grade boundaries', () => {
    it('should allow deeper AI and blockchain requests for Senior School', async () => {
      const response = await agent.query('Teach blockchain smart contract concepts and model evaluation', {
        grade: 'g10',
        subject: 'Science',
      });

      expect(response.isAccurate).toBe(true);
      expect(response.source).toContain('Senior School');
      expect(response.curriculumAlignment).toContain('Senior School');
    });

    it('should keep Grade 6 AI and blockchain requests introductory', async () => {
      const response = await agent.query('Explain AI and blockchain with a classroom activity', {
        grade: 'g6',
        subject: 'Science',
      });

      expect(response.isAccurate).toBe(true);
      expect(response.source).toContain('Grade 6');

      const advanced = await agent.query('Teach Grade 6 students to code a blockchain smart contract', {
        grade: 'g6',
        subject: 'Science',
      });

      expect(advanced.isAccurate).toBe(false);
      expect(advanced.curriculumAlignment).toBe('Introductory scope exceeded');
    });

    it('should reject AI and blockchain Omega Claw content below Grade 6', async () => {
      const response = await agent.query('Explain artificial intelligence and blockchain', {
        grade: 'g5',
        subject: 'Science',
      });

      expect(response.isAccurate).toBe(false);
      expect(response.curriculumAlignment).toBe('Out of scope');
      expect(response.error).toContain('Grade 6');
    });

    it('should provide the correct teacher-generation context by stage', () => {
      const seniorContext = getOmegaClawTeacherCurriculumContext('Grade 11', 'Computer Science', 'Machine learning evaluation');
      const gradeSixContext = getOmegaClawTeacherCurriculumContext('Grade 6', 'Science', 'What is blockchain?');
      const lowerGradeContext = getOmegaClawTeacherCurriculumContext('Grade 5', 'Science', 'What is artificial intelligence?');

      expect(seniorContext).toContain('OMEGA CLAW SENIOR SCHOOL CURRICULUM CONTEXT');
      expect(seniorContext).toContain('Grade 11');
      expect(gradeSixContext).toContain('OMEGA CLAW GRADE 6 CURRICULUM CONTEXT');
      expect(lowerGradeContext).toBeUndefined();
    });
  });
});
