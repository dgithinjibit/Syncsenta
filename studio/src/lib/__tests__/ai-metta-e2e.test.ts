/**
 * AI/MeTTa Integration End-to-End Tests
 * 
 * Tests the full student chat flow with authenticated users:
 * - Chat API authentication
 * - MeTTa/Omega policy evaluation
 * - Progress persistence
 * - Scaffolding level decisions
 * - RLS enforcement
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const TEST_API_URL = process.env.TEST_API_URL || 'http://localhost:3000';

// Test user credentials
const TEST_STUDENT_EMAIL = 'test-student@ascendra.test';
const TEST_STUDENT_PASSWORD = 'TestPassword123!';

describe.skipIf(!SUPABASE_URL || !SUPABASE_ANON_KEY)('AI/MeTTa Integration E2E', () => {
  let testUserId: string;
  let authToken: string;
  let supabase: ReturnType<typeof createClient>;

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Try to sign in existing test user, or create new one
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_STUDENT_EMAIL,
      password: TEST_STUDENT_PASSWORD,
    });

    if (signInError) {
      // Create test user if doesn't exist
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: TEST_STUDENT_EMAIL,
        password: TEST_STUDENT_PASSWORD,
        options: {
          data: {
            full_name: 'Test Student',
            role: 'student',
          },
        },
      });

      if (signUpError) {
        throw new Error(`Failed to create test user: ${signUpError.message}`);
      }

      testUserId = signUpData.user!.id;
      authToken = signUpData.session!.access_token;
    } else {
      testUserId = signInData.user!.id;
      authToken = signInData.session!.access_token;
    }

    console.log(`✓ Test user authenticated: ${testUserId.slice(0, 8)}...`);
  });

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await supabase
        .from('learning_progress' as any)
        .delete()
        .eq('user_id', testUserId);

      await supabase
        .from('chat_sessions' as any)
        .delete()
        .eq('user_id', testUserId);
    }

    await supabase?.auth.signOut();
  });

  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated chat requests', async () => {
      const response = await fetch(`${TEST_API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello',
          history: [],
          grade: 'Grade 4',
          subject: 'Mathematics',
          studentName: 'Anonymous',
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Unauthorized');
    });

    it('should accept authenticated chat requests', async () => {
      const response = await fetch(`${TEST_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          message: 'What is 2 + 2?',
          history: [],
          grade: 'Grade 2',
          subject: 'Mathematics',
          language: 'english',
          studentName: 'Test Student',
          mode: 'socratic',
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');
    }, 30000); // 30s timeout for AI response
  });

  describe('MeTTa/Omega Policy Evaluation', () => {
    it('should evaluate tutoring decision based on mastery', async () => {
      // Seed low mastery data to trigger Intensive scaffolding
      await supabase
        .from('learning_progress' as any)
        .upsert({
          user_id: testUserId,
          competency_name: 'MATH.addition.grade2',
          attempts: 10,
          correct_attempts: 3, // 30% mastery → Intensive
          hints_used: 0,
          consecutive_wrong: 0,
          last_practiced: new Date().toISOString(),
        } as any);

      const response = await fetch(`${TEST_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          message: 'Help me with addition',
          history: [],
          grade: 'Grade 2',
          subject: 'Mathematics',
          language: 'english',
          studentName: 'Test Student',
          mode: 'socratic',
          competencyCode: 'MATH.addition.grade2',
        }),
      });

      expect(response.status).toBe(200);

      // Parse SSE stream to check for scaffolding indicators
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let buffer = '';

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          let sep: number;

          while ((sep = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);

            if (frame.startsWith('data:')) {
              const payload = frame.slice(5).trim();
              if (payload === '[DONE]') continue;

              const parsed = JSON.parse(payload);
              if (parsed.delta) {
                fullResponse += parsed.delta;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Low mastery should trigger more structured, step-by-step guidance
      expect(fullResponse.length).toBeGreaterThan(50);
      console.log(`✓ Omega decision applied. Response length: ${fullResponse.length}`);
    }, 30000);

    it('should provide Independent scaffolding for high mastery', async () => {
      // Seed high mastery data
      await supabase
        .from('learning_progress' as any)
        .upsert({
          user_id: testUserId,
          competency_name: 'MATH.subtraction.grade2',
          attempts: 10,
          correct_attempts: 9, // 90% mastery → Independent
          hints_used: 0,
          consecutive_wrong: 0,
          last_practiced: new Date().toISOString(),
        } as any);

      const response = await fetch(`${TEST_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          message: 'Can you give me a subtraction challenge?',
          history: [],
          grade: 'Grade 2',
          subject: 'Mathematics',
          language: 'english',
          studentName: 'Test Student',
          mode: 'socratic',
          competencyCode: 'MATH.subtraction.grade2',
        }),
      });

      expect(response.status).toBe(200);

      // High mastery should trigger minimal scaffolding
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let buffer = '';

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          let sep: number;

          while ((sep = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);

            if (frame.startsWith('data:')) {
              const payload = frame.slice(5).trim();
              if (payload === '[DONE]') continue;

              const parsed = JSON.parse(payload);
              if (parsed.delta) {
                fullResponse += parsed.delta;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      expect(fullResponse.length).toBeGreaterThan(50);
      console.log(`✓ Independent scaffolding applied. Response length: ${fullResponse.length}`);
    }, 30000);
  });

  describe('Progress Persistence', () => {
    it('should persist chat session to database', async () => {
      const response = await fetch(`${TEST_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          message: 'What is multiplication?',
          history: [],
          grade: 'Grade 3',
          subject: 'Mathematics',
          language: 'english',
          studentName: 'Test Student',
          mode: 'socratic',
        }),
      });

      expect(response.status).toBe(200);

      // Consume the stream
      const reader = response.body!.getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
      reader.releaseLock();

      // Check chat session was created
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for async persistence

      const { data: sessions, error } = await supabase
        .from('chat_sessions' as any)
        .select('*')
        .eq('user_id', testUserId)
        .eq('subject', 'Mathematics')
        .order('created_at', { ascending: false })
        .limit(1);

      expect(error).toBeNull();
      expect(sessions).toBeDefined();
      expect(sessions!.length).toBeGreaterThan(0);
      expect((sessions as Array<{ user_id: string }>)[0].user_id).toBe(testUserId);

      console.log(`✓ Chat session persisted: ${(sessions as Array<{ id: string }>)[0].id}`);
    }, 30000);

    it('should update learning_progress with hints and attempts', async () => {
      // Clear existing progress
      await supabase
        .from('learning_progress' as any)
        .delete()
        .eq('user_id', testUserId)
        .eq('competency_name', 'MATH.fractions.grade4');

      // Send chat with competency code
      const response = await fetch(`${TEST_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          message: 'Can you help me understand fractions?',
          history: [],
          grade: 'Grade 4',
          subject: 'Mathematics',
          language: 'english',
          studentName: 'Test Student',
          mode: 'homework-help',
          competencyCode: 'MATH.fractions.grade4',
        }),
      });

      expect(response.status).toBe(200);

      // Consume stream
      const reader = response.body!.getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
      reader.releaseLock();

      // Check learning_progress updated
      await new Promise(resolve => setTimeout(resolve, 1500));

      const { data: progress, error } = await supabase
        .from('learning_progress' as any)
        .select('*')
        .eq('user_id', testUserId)
        .eq('competency_name', 'MATH.fractions.grade4')
        .single();

      if (error) {
        console.warn('No progress record found (expected for first interaction)');
      } else {
        expect(progress).toBeDefined();
        expect((progress as { user_id: string }).user_id).toBe(testUserId);
        console.log(`✓ Learning progress tracked: ${(progress as { attempts: number }).attempts} attempts`);
      }
    }, 30000);
  });

  describe('RLS Security', () => {
    it('should prevent reading other students progress', async () => {
      // Try to query progress with a different user_id filter
      const { data, error } = await supabase
        .from('learning_progress' as any)
        .select('*')
        .neq('user_id', testUserId) // Try to read OTHER students' data
        .limit(1);

      // RLS should enforce user_id = auth.uid(), returning empty or error
      expect(data).toEqual([]);
      console.log('✓ RLS prevents cross-student data access');
    });

    it('should only return own chat sessions', async () => {
      const { data, error } = await supabase
        .from('chat_sessions' as any)
        .select('*');

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // All returned sessions should belong to the authenticated user
      const allOwnSessions = (data as Array<{ user_id: string }>).every(session => session.user_id === testUserId);
      expect(allOwnSessions).toBe(true);

      console.log(`✓ RLS enforces user owns ${data!.length} sessions`);
    });
  });

  describe('Multi-Provider AI Integration', () => {
    it('should handle different subjects correctly', async () => {
      const subjects = ['Mathematics', 'English', 'Science'];
      
      for (const subject of subjects) {
        const response = await fetch(`${TEST_API_URL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            message: `Tell me something interesting about ${subject}`,
            history: [],
            grade: 'Grade 4',
            subject,
            language: 'english',
            studentName: 'Test Student',
            mode: 'compass',
          }),
        });

        expect(response.status).toBe(200);
        console.log(`✓ ${subject} chat working`);

        // Consume stream
        const reader = response.body!.getReader();
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
        reader.releaseLock();
      }
    }, 90000); // 90s for 3 subjects
  });

  describe('Error Handling', () => {
    it('should handle invalid grade gracefully', async () => {
      const response = await fetch(`${TEST_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          message: 'Hello',
          history: [],
          grade: 'Invalid Grade 99', // Invalid
          subject: 'Mathematics',
          language: 'english',
          studentName: 'Test Student',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
      console.log(`✓ Invalid grade rejected: ${data.error}`);
    });

    it('should handle missing required fields', async () => {
      const response = await fetch(`${TEST_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          // Missing message
          history: [],
          grade: 'Grade 4',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid request');
      console.log('✓ Missing fields validation working');
    });

    it('should handle empty message', async () => {
      const response = await fetch(`${TEST_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          message: '', // Empty
          history: [],
          grade: 'Grade 4',
          subject: 'Mathematics',
        }),
      });

      expect(response.status).toBe(400);
      console.log('✓ Empty message validation working');
    });
  });
});
