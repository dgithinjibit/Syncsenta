import { describe, it, expect, beforeEach } from 'vitest';
import { AssessmentAgent } from '../assessment-agent';

describe('Assessment Agent', () => {
  let agent: AssessmentAgent;

  beforeEach(() => {
    agent = new AssessmentAgent();
  });

  describe('Quiz Generation', () => {
    it('should generate CBC-aligned quiz questions', async () => {
      const quiz = await agent.generateQuiz({
        subject: 'Mathematics',
        grade: 'g4',
        topic: 'fractions',
        questionCount: 5,
        difficulty: 'medium'
      });

      expect(quiz.questions).toHaveLength(5);
      expect(quiz.questions[0]).toMatchObject({
        id: expect.any(String),
        question: expect.stringContaining('fraction'),
        type: expect.stringMatching(/multiple_choice|short_answer|true_false/),
        options: expect.any(Array),
        correctAnswer: expect.any(String),
        explanation: expect.any(String),
        competency: expect.stringMatching(/^CBC-G4-MATH-/)
      });
    });

    it('should adapt difficulty based on student performance', async () => {
      const studentPerformance = {
        userId: 'user1',
        recentScores: [0.6, 0.7, 0.8],
        weakAreas: ['comparing fractions']
      };

      const quiz = await agent.generateAdaptiveQuiz({
        subject: 'Mathematics',
        grade: 'g4',
        topic: 'fractions',
        questionCount: 3,
        studentPerformance
      });

      expect(quiz.difficulty).toBe('medium');
      expect(quiz.questions.some(q => q.question.toLowerCase().includes('compar'))).toBe(true);
    });
  });

  describe('Auto-Grading', () => {
    it('should grade multiple choice questions correctly', async () => {
      // First create a quiz
      const quiz = await agent.generateQuiz({
        subject: 'Mathematics',
        grade: 'g4',
        topic: 'fractions',
        questionCount: 3,
        difficulty: 'medium'
      });

      const submission = {
        quizId: quiz.id,
        userId: 'user1',
        answers: [
          { questionId: quiz.questions[0].id, answer: quiz.questions[0].correctAnswer },
          { questionId: quiz.questions[1].id, answer: 'wrong-answer' },
          { questionId: quiz.questions[2].id, answer: quiz.questions[2].correctAnswer }
        ]
      };

      const result = await agent.gradeSubmission(submission);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.feedback).toHaveLength(3);
      expect(result.feedback[0]).toMatchObject({
        questionId: quiz.questions[0].id,
        correct: expect.any(Boolean),
        explanation: expect.any(String),
        improvement: expect.any(String)
      });
    });

    it('should provide detailed feedback for incorrect answers', async () => {
      // First create a quiz
      const quiz = await agent.generateQuiz({
        subject: 'Mathematics',
        grade: 'g4',
        topic: 'fractions',
        questionCount: 1,
        difficulty: 'medium'
      });

      const submission = {
        quizId: quiz.id,
        userId: 'user1',
        answers: [
          { questionId: quiz.questions[0].id, answer: 'wrong-answer' }
        ]
      };

      const result = await agent.gradeSubmission(submission);

      expect(result.feedback[0].correct).toBe(false);
      expect(result.feedback[0].improvement).toContain('Try');
      expect(result.overallFeedback).toContain('practicing');
    });
  });

  describe('Competency Tracking', () => {
    it('should track mastery levels across competencies', async () => {
      const userId = 'user1';
      const assessmentResults = [
        { competency: 'CBC-G4-MATH-NUM-001', score: 0.8 },
        { competency: 'CBC-G4-MATH-NUM-002', score: 0.6 },
        { competency: 'CBC-G4-MATH-NUM-003', score: 0.9 }
      ];

      await agent.updateCompetencyMastery(userId, assessmentResults);
      const mastery = await agent.getCompetencyMastery(userId, 'g4', 'Mathematics');

      expect(mastery.competencies).toHaveLength(3);
      expect(mastery.competencies[0]).toMatchObject({
        code: 'CBC-G4-MATH-NUM-001',
        masteryLevel: 0.8,
        status: 'proficient'
      });
      expect(mastery.overallMastery).toBeCloseTo(0.77, 1);
    });

    it('should identify areas needing review', async () => {
      // First set up some competency data
      const userId = 'user1';
      await agent.updateCompetencyMastery(userId, [
        { competency: 'CBC-G4-MATH-NUM-001', score: 0.9 }, // mastered
        { competency: 'CBC-G4-MATH-NUM-002', score: 0.5 }, // needs review
        { competency: 'CBC-G4-MATH-NUM-003', score: 0.8 }  // proficient
      ]);

      const mastery = await agent.getCompetencyMastery(userId, 'g4', 'Mathematics');
      const recommendations = await agent.generateRecommendations(mastery);

      expect(recommendations.reviewAreas).toContain('CBC-G4-MATH-NUM-002');
      expect(recommendations.nextTopics).toHaveLength(2);
      expect(recommendations.practiceActivities).toHaveLength(3);
    });
  });

  describe('Rubric-based Assessment', () => {
    it('should assess student work against CBC rubrics', async () => {
      const studentWork = {
        type: 'written_response',
        content: 'A fraction is when you divide something into equal parts. Like if you have a pizza and cut it into 4 pieces, each piece is 1/4.',
        question: 'Explain what a fraction is and give an example'
      };

      const assessment = await agent.assessWithRubric(studentWork, {
        subject: 'Mathematics',
        grade: 'g4',
        competency: 'CBC-G4-MATH-NUM-001'
      });

      expect(assessment.score).toBeGreaterThanOrEqual(1);
      expect(assessment.score).toBeLessThanOrEqual(4);
      expect(assessment.criteria).toHaveLength(4);
      expect(assessment.criteria[0]).toMatchObject({
        name: expect.any(String),
        score: expect.any(Number),
        feedback: expect.any(String)
      });
    });
  });

  describe('Performance Analytics', () => {
    it('should generate student performance reports', async () => {
      // Create some assessment history first
      const userId = 'user1';
      const quiz = await agent.generateQuiz({
        subject: 'Mathematics',
        grade: 'g4',
        topic: 'fractions',
        questionCount: 3,
        difficulty: 'medium'
      });

      // Simulate some graded submissions
      for (let i = 0; i < 3; i++) {
        const submission = {
          quizId: quiz.id,
          userId,
          answers: quiz.questions.map(q => ({
            questionId: q.id,
            answer: q.correctAnswer // All correct for consistent results
          }))
        };
        await agent.gradeSubmission(submission);
      }

      const report = await agent.generatePerformanceReport(userId, {
        subject: 'Mathematics',
        grade: 'g4',
        timeframe: '30days'
      });

      expect(report.summary).toMatchObject({
        totalAssessments: expect.any(Number),
        averageScore: expect.any(Number),
        improvement: expect.any(Number),
        streakDays: expect.any(Number)
      });
      expect(report.competencyBreakdown).toBeDefined();
      expect(report.recommendations).toHaveLength(3);
    });

    it('should track progress over time', async () => {
      const progress = await agent.getProgressTimeline('user1', {
        subject: 'Mathematics',
        grade: 'g4',
        competency: 'CBC-G4-MATH-NUM-001'
      });

      expect(progress.timeline).toHaveLength(5);
      expect(progress.timeline[0]).toMatchObject({
        date: expect.any(String),
        score: expect.any(Number),
        assessmentType: expect.any(String)
      });
      expect(progress.trend).toMatch(/improving|stable|declining/);
    });
  });
});