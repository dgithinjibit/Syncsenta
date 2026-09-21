import { describe, expect, it } from 'vitest';
import { buildSocraticSystemPrompt } from '../chat/socratic-prompts';
import { getLearningTrack, getLearningTrackPolicy } from '../learning-track-policy';
import { evaluateTutoringDecision } from '../omega-agent/metta-core';
import { getCulturalExamples } from '../omega-agent/server-enrichment';

const state = {
  attempts: 0,
  correctAttempts: 0,
  hintsUsed: 0,
  frustrationSignal: false,
};

describe('learning track policy', () => {
  it('maps the stable ai subject slug to AI Literacy', () => {
    expect(getLearningTrack('ai')).toBe('agi');
    expect(getLearningTrackPolicy('ai').label).toBe('AI Literacy');
  });

  it('maps blockchain and financial literacy aliases', () => {
    expect(getLearningTrack('Blockchain')).toBe('blockchain');
    expect(getLearningTrack('financial-literacy')).toBe('financial-literacy');
  });
});

describe('track-aware Socratic tutor', () => {
  it('adds AI evidence and human-oversight boundaries', () => {
    const prompt = buildSocraticSystemPrompt({ grade: 'Grade 8', subject: 'ai' });
    expect(prompt).toContain('LEARNING TRACK — AI Literacy');
    expect(prompt).toMatch(/evidence/i);
    expect(prompt).toMatch(/human oversight/i);
  });

  it('adds blockchain record and transaction safety boundaries', () => {
    const prompt = buildSocraticSystemPrompt({ grade: 'Grade 8', subject: 'blockchain' });
    expect(prompt).toContain('LEARNING TRACK — Blockchain Literacy');
    expect(prompt).toMatch(/private keys/i);
    expect(prompt).toMatch(/investment instructions/i);
  });

  it('adds general-financial-education boundaries', () => {
    const prompt = buildSocraticSystemPrompt({ grade: 'Grade 8', subject: 'financial-literacy' });
    expect(prompt).toContain('LEARNING TRACK — Financial Literacy');
    expect(prompt).toMatch(/personalized investment/i);
    expect(prompt).toMatch(/opportunity cost/i);
  });
});

describe('track-aware Omega decisions', () => {
  it('selects an AGI evidence question for a new learner', () => {
    const decision = evaluateTutoringDecision(state, 'ai');
    expect(decision.scaffolding).toBe('Guided');
    expect(decision.nextAction).toBe('ask_agi_evidence_question');
  });

  it('selects safe blockchain tracing for intensive support', () => {
    const decision = evaluateTutoringDecision({ ...state, attempts: 10, correctAttempts: 2 }, 'blockchain');
    expect(decision.scaffolding).toBe('Intensive');
    expect(decision.nextAction).toBe('trace_blockchain_record_safely');
    expect(decision.hint).toMatch(/private/i);
  });

  it('selects a financial trade-off question for guided support', () => {
    const decision = evaluateTutoringDecision({ ...state, attempts: 10, correctAttempts: 6 }, 'financial-literacy');
    expect(decision.scaffolding).toBe('Guided');
    expect(decision.nextAction).toBe('ask_financial_tradeoff_question');
  });

  it('keeps the CBC decision contract unchanged when no track is supplied', () => {
    expect(evaluateTutoringDecision(state)).toMatchObject({
      scaffolding: 'Guided',
      nextAction: 'ask_guiding_question',
    });
  });
});

describe('track-aware Omega enrichment', () => {
  it('uses the track example palette instead of generic examples', () => {
    expect(getCulturalExamples('blockchain')).toContain('a class shared ledger');
    expect(getCulturalExamples('financial-literacy')).toContain('a market budget in Kenyan shillings');
    expect(getCulturalExamples('ai')).toContain('a human teacher checking an AI suggestion');
  });
});
