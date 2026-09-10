import { describe, expect, it } from 'vitest';
import {
  MeTTaEducationKnowledgeGraph,
  MeTTaSession,
  toMeTTaSymbol,
} from '../omega-agent/metta-core';

describe('student-turn MeTTa boundary', () => {
  it('normalizes every subject label into a safe symbol', () => {
    expect(toMeTTaSymbol('Environmental Activities')).toBe('environmental-activities');
    expect(toMeTTaSymbol('Kenyan Sign Language')).toBe('kenyan-sign-language');
    expect(toMeTTaSymbol('')).toBe('unknown');
  });
});

describe('MeTTaEducationKnowledgeGraph', () => {
  it('initializes Kenyan CBC knowledge and core education types', () => {
    const graph = new MeTTaEducationKnowledgeGraph();
    const space = graph.getSpace();

    expect(space.types.has('Student')).toBe(true);
    expect(space.types.has('Activity')).toBe(true);
    expect(space.equalities.length).toBeGreaterThan(0);
  });

  it('matches a known cultural adaptation rule', () => {
    const graph = new MeTTaEducationKnowledgeGraph();
    const results = graph.query('(cultural-adaptation counting kenya)');

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('expression');
  });

  it('adds knowledge without mutating the seeded type registry', () => {
    const graph = new MeTTaEducationKnowledgeGraph();
    const before = graph.getSpace().expressions.length;

    graph.addKnowledge('(student-progress learner-1 counting 0.5)');

    expect(graph.getSpace().expressions).toHaveLength(before + 1);
    expect(graph.getSpace().types.has('Student')).toBe(true);
  });
});

describe('MeTTaSession', () => {
  it('starts with isolated learner context facts', () => {
    const session = new MeTTaSession(
      'learner-1',
      new MeTTaEducationKnowledgeGraph(),
      'Grade 2',
    );
    const state = session.getSessionState();

    expect(state).toContain('(session-user learner-1)');
    expect(state).toContain('(session-grade Grade 2)');
    expect(state).toContain('(session-language mixed)');
    expect(state).toContain('(session-region kenya)');
  });

  it('records activity progress and returns a processed result', async () => {
    const session = new MeTTaSession(
      'learner-2',
      new MeTTaEducationKnowledgeGraph(),
      'Grade 2',
    );

    const result = await session.processInteraction({
      type: 'activity_progress',
      activityId: 'counting-1',
      progress: 0.5,
      timeSpent: 120,
    });

    expect(result.status).toBe('processed');
    expect(session.getSessionState()).toContain(
      '(activity-progress counting-1 0.5 120)',
    );
  });
});
