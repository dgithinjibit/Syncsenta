import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  LEARNING_PLANES,
  learningPlaneForGrade,
  planePostureForGrade,
  normalizeGradeKey,
  formatPlanePostureLine,
} from '../learning-planes';

/**
 * The two pedagogy hybrids (Waldorf's screen position, Montessori/Reggio's
 * rejection of points) are only decisions if the cut-off is in one place. These
 * tests pin the cut-off, the shape of every grade string the app actually
 * receives, and the fact that the posture reaches both prompt paths.
 */

describe('grade → plane mapping', () => {
  it('puts pre-primary in Plane I and primary in Plane II', () => {
    expect(learningPlaneForGrade('PP1')).toBe('plane-i');
    expect(learningPlaneForGrade('pp2')).toBe('plane-i');
    expect(learningPlaneForGrade('Grade 1')).toBe('plane-ii');
    expect(learningPlaneForGrade('g6')).toBe('plane-ii');
  });

  it('cuts to Plane III at Grade 7, the start of junior secondary', () => {
    expect(learningPlaneForGrade('Grade 6')).toBe('plane-ii');
    expect(learningPlaneForGrade('Grade 7')).toBe('plane-iii');
    expect(learningPlaneForGrade('grade-12')).toBe('plane-iii');
  });

  it('accepts the spellings the database and route params really send', () => {
    for (const raw of ['PP1', ' pp1 ', 'PP2', 'Grade 3', 'grade3', 'g3', 'G9', 'grade-11', '11']) {
      expect(learningPlaneForGrade(raw), raw).toBeTruthy();
    }
    expect(normalizeGradeKey('Grade 10')).toBe('10');
    expect(normalizeGradeKey('KICD-class-a')).toBe('');
  });

  it('returns no plane for an unknown grade rather than guessing a posture', () => {
    expect(learningPlaneForGrade('')).toBeNull();
    expect(learningPlaneForGrade('adult')).toBeNull();
    expect(learningPlaneForGrade('Grade 13')).toBeNull();
    expect(planePostureForGrade('Grade 99')).toBeNull();
  });

  it('covers Grades 1-12 and PP1-PP2 exactly once', () => {
    const grades = LEARNING_PLANES.flatMap((plane) => [...plane.grades]);
    expect(new Set(grades).size).toBe(grades.length);
    expect(grades.length).toBe(14);
    expect(grades).toContain('PP1');
    expect(grades).toContain('Grade 12');
  });
});

describe('the two recorded hybrids', () => {
  it('gives the youngest plane a cap and a required offline activity', () => {
    const posture = planePostureForGrade('PP1')!;
    expect(posture.sessionCapMinutes).toBeLessThan(30);
    expect(posture.offlineActivityRequired).toBe(true);
    expect(posture.learnerFacingRewardSurface).toBe('mastery-only');
  });

  it('keeps mastery language in front of the learner through Plane II', () => {
    for (const grade of ['Grade 1', 'Grade 3', 'Grade 6']) {
      expect(planePostureForGrade(grade)!.learnerFacingRewardSurface, grade).toBe('mastery-only');
    }
  });

  it('lets points lead only from Plane III upward', () => {
    for (const grade of ['Grade 7', 'Grade 10', 'Grade 12']) {
      expect(planePostureForGrade(grade)!.learnerFacingRewardSurface, grade).toBe('points-may-lead');
    }
  });

  it('caps every plane, so no stage is treated as unlimited screen time', () => {
    for (const posture of LEARNING_PLANES) {
      expect(posture.sessionCapMinutes, posture.plane).toBeGreaterThan(0);
      expect(posture.sessionCapMinutes, posture.plane).toBeLessThanOrEqual(60);
      expect(posture.rationale.length, posture.plane).toBeGreaterThan(40);
    }
  });
});

describe('posture reaches the prompt', () => {
  it('names the cap, the offline rule and the reward surface', () => {
    const line = formatPlanePostureLine('Grade 4');
    expect(line).toContain('45 minutes');
    expect(line).toContain('mastery');
    expect(line).toContain('Reasoning Mind');
    expect(line).toContain('Grade 1-Grade 6');
  });

  it('degrades to mastery language when the grade is missing', () => {
    const line = formatPlanePostureLine('');
    expect(line).toContain('not recognisable');
    expect(line).toContain('mastery language');
  });

  /**
   * Both learner prompt paths must append the registry block and the posture.
   * There is no cheap runtime harness for a streaming route handler, so this
   * checks the wiring exists at the source level; behaviour is covered above.
   */
  it('is wired into /api/chat and the Mwalimu pipeline', () => {
    const chatRoute = readFileSync('src/app/api/chat/route.ts', 'utf8');
    const pipeline = readFileSync('src/lib/mwalimu-pipeline.ts', 'utf8');
    for (const source of [chatRoute, pipeline]) {
      expect(source).toContain('formatPedagogyConstraintBlock');
      expect(source).toContain('formatPlanePostureLine');
    }
    expect(chatRoute).toMatch(/systemPrompt \+= [^\n]*formatPedagogyConstraintBlock\(\)/);
  });
});
