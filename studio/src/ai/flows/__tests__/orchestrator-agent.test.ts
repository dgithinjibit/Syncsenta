import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrchestratorAgent } from '../orchestrator-agent';

// Mock the dependencies
vi.mock('../cbc-curriculum-agent', () => ({
  CBCCurriculumAgent: class MockCBCCurriculumAgent {
    query = vi.fn().mockResolvedValue({
      isAccurate: true,
      content: 'Grade 4 Mathematics learning outcomes for fractions include understanding parts of a whole, comparing fractions, and basic fraction operations.',
      confidence: 0.95,
      suggestions: ['Practice with visual aids', 'Use real-world examples']
    });

    validateCurriculumAlignment = vi.fn().mockResolvedValue({
      isAligned: true,
      confidence: 0.9,
      reason: 'Content aligns with CBC Grade 4 Mathematics curriculum'
    });
  }
}));

vi.mock('../mwalimu-ai-flow', () => ({
  mwalimuAiTutor: vi.fn().mockResolvedValue({
    response: 'Let me help you understand fractions! A fraction represents parts of a whole. Can you think of an example where you might use fractions in real life?'
  })
}));

vi.mock('../generate-lesson-plan', () => ({
  generateLessonPlan: vi.fn().mockResolvedValue({
    lessonPlan: 'CBC-aligned Grade 4 Mathematics lesson plan for fractions:\n\n1. Introduction to fractions\n2. Visual representation\n3. Practice activities\n4. Assessment'
  })
}));

vi.mock('../../lib/personalized-learning', () => ({
  personalizedLearning: {
    getStudentProfile: vi.fn().mockResolvedValue({
      name: 'Test Student',
      grade: 'Grade 4'
    })
  }
}));

describe('Orchestrator Agent', () => {
  let orchestrator: OrchestratorAgent;

  beforeEach(() => {
    orchestrator = new OrchestratorAgent();
  });

  describe('Request Routing', () => {
    it('should route curriculum questions to CBC Curriculum Agent', async () => {
      const request = {
        message: 'What are the Grade 4 Mathematics learning outcomes for fractions?',
        context: { userId: 'user1', grade: 'g4', subject: 'Mathematics' }
      };

      const response = await orchestrator.processRequest(request);

      expect(response.primaryAgent).toBe('CBC_CURRICULUM');
      expect(response.success).toBe(true);
      expect(response.response).toContain('learning outcomes');
    });

    it('should route student tutoring to Socratic Tutor Agent', async () => {
      const request = {
        message: 'I need help understanding fractions',
        context: { userId: 'user1', grade: 'g4', subject: 'Mathematics', type: 'tutoring' }
      };

      const response = await orchestrator.processRequest(request);

      expect(response.primaryAgent).toBe('SOCRATIC_TUTOR');
      expect(response.success).toBe(true);
    });

    it('should route lesson planning to Lesson Architect Agent', async () => {
      const request = {
        message: 'Create a lesson plan for Grade 4 fractions',
        context: { userId: 'teacher1', role: 'teacher', grade: 'g4', subject: 'Mathematics' }
      };

      const response = await orchestrator.processRequest(request);

      expect(response.primaryAgent).toBe('LESSON_ARCHITECT');
      expect(response.success).toBe(true);
    });
  });

  describe('Multi-Agent Coordination', () => {
    it('should coordinate multiple agents for complex requests', async () => {
      const request = {
        message: 'Create a CBC-aligned lesson plan for Grade 4 fractions and explain the concepts to students',
        context: { userId: 'teacher1', role: 'teacher', grade: 'g4', subject: 'Mathematics' }
      };

      // Ensure curriculum validation passes for multi-agent coordination
      const orchestrator = new OrchestratorAgent();
      orchestrator['cbcAgent'].validateCurriculumAlignment = vi.fn().mockResolvedValue({
        isAligned: true,
        confidence: 0.9,
        reason: 'Content aligns with CBC Grade 4 Mathematics curriculum'
      });

      const response = await orchestrator.processRequest(request);

      expect(response.agentsUsed).toContain('CBC_CURRICULUM');
      expect(response.agentsUsed).toContain('LESSON_ARCHITECT');
      expect(response.agentsUsed).toContain('SOCRATIC_TUTOR');
      expect(response.coordination).toBeDefined();
    });

    it('should validate curriculum alignment across agents', async () => {
      const request = {
        message: 'Create a CBC-aligned lesson plan for calculus and explain the concepts to Grade 4 students',
        context: { userId: 'teacher1', role: 'teacher', grade: 'g4', subject: 'Mathematics' }
      };

      // Create a new orchestrator and override the validation method to return false
      const orchestrator = new OrchestratorAgent();
      orchestrator['cbcAgent'].validateCurriculumAlignment = vi.fn().mockResolvedValue({
        isAligned: false,
        confidence: 0.1,
        reason: 'Calculus is not appropriate for Grade 4 students',
        suggestions: ['Try basic arithmetic', 'Focus on Grade 4 topics']
      });

      const response = await orchestrator.processRequest(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('not appropriate for Grade 4');
      expect(response.curriculumValidation?.isAligned).toBe(false);
    });
  });

  describe('Context Management', () => {
    it('should maintain conversation context across requests', async () => {
      const request1 = {
        message: 'Tell me about fractions',
        context: { userId: 'user1', grade: 'g4', subject: 'Mathematics' }
      };

      const request2 = {
        message: 'Give me an example',
        context: { userId: 'user1', grade: 'g4', subject: 'Mathematics' }
      };

      await orchestrator.processRequest(request1);
      const response2 = await orchestrator.processRequest(request2);

      expect(response2.contextAware).toBe(true);
      expect(response2.previousContext).toContain('fractions');
    });

    it('should handle user switching between subjects', async () => {
      const mathRequest = {
        message: 'Explain fractions',
        context: { userId: 'user1', grade: 'g4', subject: 'Mathematics' }
      };

      const englishRequest = {
        message: 'Help with reading comprehension',
        context: { userId: 'user1', grade: 'g4', subject: 'English' }
      };

      await orchestrator.processRequest(mathRequest);
      const response = await orchestrator.processRequest(englishRequest);

      expect(response.subjectSwitch).toBe(true);
      expect(response.primaryAgent).toBe('SOCRATIC_TUTOR');
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle agent failures gracefully', async () => {
      const request = {
        message: 'What are the Grade 4 Mathematics learning outcomes?', // This should match CBC routing
        context: { userId: 'user1', grade: 'g4', subject: 'Mathematics' }
      };

      // Create a fresh orchestrator instance
      const orchestrator = new OrchestratorAgent();
      
      // Mock the query method to throw an error - override the default mock
      const mockQuery = vi.fn().mockRejectedValue(new Error('Agent failed'));
      orchestrator['cbcAgent'].query = mockQuery;

      const response = await orchestrator.processRequest(request);

      // Verify the mock was called
      expect(mockQuery).toHaveBeenCalled();
      expect(response.success).toBe(false); // Should return error, not fallback
      expect(response.primaryAgent).toBe('CBC_CURRICULUM');
      expect(response.error).toContain('Agent failed');
    });

    it('should provide helpful error messages for invalid requests', async () => {
      const request = {
        message: '',
        context: { userId: 'user1' }
      };

      const response = await orchestrator.processRequest(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid request');
      expect(response.suggestions).toHaveLength(3);
    });
  });

  describe('Performance and Optimization', () => {
    it('should cache frequent curriculum queries', async () => {
      const request = {
        message: 'Grade 4 Mathematics fractions learning outcomes',
        context: { userId: 'user1', grade: 'g4', subject: 'Mathematics' }
      };

      const orchestrator = new OrchestratorAgent();

      // First request
      const response1 = await orchestrator.processRequest(request);
      
      // Second identical request
      const response2 = await orchestrator.processRequest(request);

      expect(response1.cached).toBe(false);
      expect(response2.cached).toBe(true);
      // Don't check response time as it might be 0 in tests
    });

    it('should prioritize agents based on request type', async () => {
      const urgentRequest = {
        message: 'Student needs immediate help with fractions',
        context: { userId: 'user1', grade: 'g4', subject: 'Mathematics', priority: 'high' }
      };

      const response = await orchestrator.processRequest(urgentRequest);

      expect(response.priority).toBe('high');
      expect(response.responseTime).toBeLessThan(1000); // Fast response for urgent requests
    });
  });
});