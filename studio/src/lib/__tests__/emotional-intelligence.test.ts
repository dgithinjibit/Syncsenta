import { describe, it, expect } from 'vitest';
import {
  analyzeEmotionalState,
  generateEncouragement,
  generateCelebration,
} from '../emotional-intelligence';

describe('Emotional Intelligence', () => {
  describe('analyzeEmotionalState', () => {
    it('detects frustration from keywords', () => {
      const state = analyzeEmotionalState("I don't understand this at all");
      expect(state.sentiment).toBe('frustrated');
      expect(state.needsEncouragement).toBe(true);
      expect(state.detectedPatterns).toContain('frustration_keywords');
    });

    it('detects confusion from question patterns', () => {
      const state = analyzeEmotionalState("What does this mean? How do I solve it?");
      expect(state.sentiment).toBe('confused');
      expect(state.needsEncouragement).toBe(true);
      expect(state.detectedPatterns).toContain('confusion_keywords');
    });

    it('detects confidence from positive statements', () => {
      const state = analyzeEmotionalState("I understand now! I can do this.");
      expect(state.sentiment).toBe('confident');
      expect(state.confidence).toBeGreaterThan(0.7);
      expect(state.needsEncouragement).toBe(false);
    });

    it('detects excitement from enthusiastic language', () => {
      const state = analyzeEmotionalState("Wow! This is so cool!");
      expect(state.sentiment).toBe('excited');
      expect(state.confidence).toBeGreaterThan(0.8);
    });

    it('detects repeated questions as frustration', () => {
      const history = [
        { role: 'user' as const, content: 'How do I solve this?' },
        { role: 'model' as const, content: 'Let me explain...' },
        { role: 'user' as const, content: 'But how do I solve this?' },
      ];
      const state = analyzeEmotionalState("I still don't get how to solve this", history);
      expect(state.sentiment).toBe('frustrated');
      expect(state.detectedPatterns).toContain('repeated_questions');
    });
  });

  describe('generateEncouragement', () => {
    it('generates encouragement for frustrated students', () => {
      const state = {
        sentiment: 'frustrated' as const,
        confidence: 0.2,
        needsEncouragement: true,
        detectedPatterns: ['frustration_keywords'],
      };
      const encouragement = generateEncouragement(state, 'Wanjiru', 'Mathematics');
      expect(encouragement).not.toBeNull();
      expect(encouragement?.message).toContain('Wanjiru');
      expect(encouragement?.tone).toBe('reassuring');
    });

    it('generates encouragement for confused students', () => {
      const state = {
        sentiment: 'confused' as const,
        confidence: 0.4,
        needsEncouragement: true,
        detectedPatterns: ['confusion_keywords'],
      };
      const encouragement = generateEncouragement(state, 'Kamau');
      expect(encouragement).not.toBeNull();
      expect(encouragement?.message).toContain('Kamau');
      expect(encouragement?.tone).toBe('supportive');
    });

    it('returns null for confident students', () => {
      const state = {
        sentiment: 'confident' as const,
        confidence: 0.8,
        needsEncouragement: false,
        detectedPatterns: [],
      };
      const encouragement = generateEncouragement(state);
      expect(encouragement).toBeNull();
    });
  });

  describe('generateCelebration', () => {
    it('generates celebration for confident students', () => {
      const state = {
        sentiment: 'confident' as const,
        confidence: 0.8,
        needsEncouragement: false,
        detectedPatterns: ['confidence_keywords'],
      };
      const celebration = generateCelebration(state, 'Njeri');
      expect(celebration).not.toBeNull();
      expect(celebration?.message).toContain('Njeri');
      expect(celebration?.tone).toBe('celebratory');
    });

    it('generates celebration for excited students', () => {
      const state = {
        sentiment: 'excited' as const,
        confidence: 0.9,
        needsEncouragement: false,
        detectedPatterns: ['excitement_keywords'],
      };
      const celebration = generateCelebration(state, 'Mwangi');
      expect(celebration).not.toBeNull();
      expect(celebration?.message).toContain('Mwangi');
    });

    it('returns null for frustrated students', () => {
      const state = {
        sentiment: 'frustrated' as const,
        confidence: 0.2,
        needsEncouragement: true,
        detectedPatterns: [],
      };
      const celebration = generateCelebration(state);
      expect(celebration).toBeNull();
    });
  });
});
