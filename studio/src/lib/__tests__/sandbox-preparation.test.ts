import { describe, expect, it } from 'vitest';
import {
  getSubjectLearningPath,
  prepareSandboxForSubject,
  subjectToLearningSlug,
  subjectToSandboxId,
} from '../sandbox-preparation';

describe('sandbox preparation', () => {
  it('keeps the AGI learning slug stable while using the shared sandbox contract', () => {
    expect(subjectToLearningSlug('AGI')).toBe('ai');
    expect(subjectToSandboxId('AGI')).toBeNull();
  });

  it('prepares a grade-specific CBC activity without navigating', () => {
    const preparation = prepareSandboxForSubject('Grade 4', 'Mathematics');
    expect(preparation.gradeId).toBe('g4');
    expect(preparation.subjectId).toBe('mathematics');
    expect(preparation.preparedAt).toBeTruthy();
  });

  it('routes a core subject to its grade-specific sandbox overview', () => {
    expect(getSubjectLearningPath('Grade 4', 'Mathematics')).toBe('/student/sandbox/g4/mathematics');
  });

  it('keeps extended courses on their chat-first subject route', () => {
    expect(getSubjectLearningPath('Grade 4', 'Financial Literacy')).toBe('/student/subject/financial-literacy');
  });
});
