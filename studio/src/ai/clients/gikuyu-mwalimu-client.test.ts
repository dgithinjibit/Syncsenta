/**
 * Test file for Gikuyu-Aware Mwalimu AI Client
 * 
 * Run with: npm test gikuyu-mwalimu-client.test.ts
 */

import { describe, it, expect } from 'vitest';
import { GikuyuMwalimuClient, createGikuyuMwalimuClient } from './gikuyu-mwalimu-client';

describe('GikuyuMwalimuClient', () => {
  describe('detectGikuyu', () => {
    it('should detect Gikuyu greetings', () => {
      const client = createGikuyuMwalimuClient('ollama');
      
      expect(client.detectGikuyu('wĩ mwega')).toBe(true);
      expect(client.detectGikuyu('Ũrĩ atĩa?')).toBe(true);
      expect(client.detectGikuyu('Ngwendaga kumenya')).toBe(true);
    });

    it('should not detect English as Gikuyu', () => {
      const client = createGikuyuMwalimuClient('ollama');
      
      expect(client.detectGikuyu('Hello, how are you?')).toBe(false);
      expect(client.detectGikuyu('I want to learn math')).toBe(false);
    });
  });

  describe('detectIdentityStatement', () => {
    it('should detect Kikuyu identity statements', () => {
      const client = createGikuyuMwalimuClient('ollama');
      
      const result1 = client.detectIdentityStatement('Im kikuyu');
      expect(result1.isIdentity).toBe(true);
      expect(result1.ethnicity).toBe('Kikuyu');

      const result2 = client.detectIdentityStatement('I am Kikuyu');
      expect(result2.isIdentity).toBe(true);
      expect(result2.ethnicity).toBe('Kikuyu');

      const result3 = client.detectIdentityStatement('also Im kikuyu');
      expect(result3.isIdentity).toBe(true);
      expect(result3.ethnicity).toBe('Kikuyu');
    });

    it('should detect other Kenyan ethnicities', () => {
      const client = createGikuyuMwalimuClient('ollama');
      
      const result1 = client.detectIdentityStatement('Im luo');
      expect(result1.isIdentity).toBe(true);
      expect(result1.ethnicity).toBe('Luo');

      const result2 = client.detectIdentityStatement('I am Maasai');
      expect(result2.isIdentity).toBe(true);
      expect(result2.ethnicity).toBe('Maasai');
    });

    it('should not detect non-identity statements', () => {
      const client = createGikuyuMwalimuClient('ollama');
      
      const result = client.detectIdentityStatement('I like math');
      expect(result.isIdentity).toBe(false);
      expect(result.ethnicity).toBeUndefined();
    });
  });

  describe('formatPrompt', () => {
    it('should format prompt with conversation history', () => {
      const client = createGikuyuMwalimuClient('ollama');
      
      const history = [
        { role: 'user' as const, content: 'I saw 2 giraffes' },
        { role: 'assistant' as const, content: 'That\'s wonderful!' }
      ];
      
      // Access private method via type assertion for testing
      const prompt = (client as any).formatPrompt('What if I saw 2 more?', history);
      
      expect(prompt).toContain('<|user|>');
      expect(prompt).toContain('I saw 2 giraffes');
      expect(prompt).toContain('<|assistant|>');
      expect(prompt).toContain('That\'s wonderful!');
      expect(prompt).toContain('What if I saw 2 more?');
    });
  });
});

/**
 * Integration test examples (requires running model)
 * 
 * Uncomment and run manually when model is deployed
 */

/*
describe('GikuyuMwalimuClient Integration Tests', () => {
  it('should handle Gikuyu name recognition', async () => {
    const client = createGikuyuMwalimuClient('ollama');
    
    const response = await client.generateResponse('Let\'s name it Loibor');
    
    // Should NOT hallucinate "Loibor means 'also'"
    expect(response.toLowerCase()).not.toContain('means');
    expect(response.toLowerCase()).not.toContain('also');
    
    // Should recognize it as a name
    expect(response.toLowerCase()).toContain('loibor');
    expect(response.toLowerCase()).toMatch(/name|great|beautiful/);
  });

  it('should handle identity statements', async () => {
    const client = createGikuyuMwalimuClient('ollama');
    
    const response = await client.generateResponse('Im kikuyu');
    
    // Should understand identity statement
    expect(response.toLowerCase()).toContain('kikuyu');
    expect(response.toLowerCase()).toMatch(/understand|see|know/);
  });

  it('should remember conversation context', async () => {
    const client = createGikuyuMwalimuClient('ollama');
    
    const history = [
      { role: 'user' as const, content: 'I saw 2 giraffes' },
      { role: 'assistant' as const, content: 'That\'s wonderful! Giraffes are amazing animals.' }
    ];
    
    const response = await client.generateResponse('What if I saw 2 more?', history);
    
    // Should reference original 2 giraffes
    expect(response).toMatch(/4|four/i);
  });

  it('should not repeat greetings', async () => {
    const client = createGikuyuMwalimuClient('ollama');
    
    const history = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Karibu! How can I help you today?' }
    ];
    
    const response = await client.generateResponse('Tell me about math', history);
    
    // Should NOT repeat "Karibu! Jambo!"
    expect(response.toLowerCase()).not.toContain('karibu');
    expect(response.toLowerCase()).not.toContain('jambo');
  });
});
*/
