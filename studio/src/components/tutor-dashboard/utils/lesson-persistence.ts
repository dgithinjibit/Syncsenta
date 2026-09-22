/**
 * Lesson State Persistence
 * 
 * Handles saving and restoring lesson state to/from localStorage.
 * Enables recovery from browser refresh and session interruptions.
 */

import type { LessonContext } from '../state-machines/lesson-machine';
import type { LessonProgress } from '../types/lesson-script';

const STORAGE_PREFIX = 'syncsenta_lesson_';
const PROGRESS_PREFIX = 'syncsenta_progress_';

/**
 * Save lesson state to localStorage
 */
export function saveLessonState(context: LessonContext): void {
  try {
    const key = `${STORAGE_PREFIX}${context.studentId}_${context.lessonScript.metadata.id}`;
    const serialized = JSON.stringify({
      currentNodeId: context.currentNodeId,
      completedNodes: context.completedNodes,
      attempts: context.attempts,
      hintsUsed: context.hintsUsed,
      startTime: context.startTime,
      interactions: context.interactions,
      timestamp: Date.now(),
    });
    localStorage.setItem(key, serialized);
  } catch (error) {
    console.error('Failed to save lesson state:', error);
  }
}

/**
 * Load lesson state from localStorage
 */
export function loadLessonState(
  studentId: string,
  lessonId: string
): Partial<LessonContext> | null {
  try {
    const key = `${STORAGE_PREFIX}${studentId}_${lessonId}`;
    const serialized = localStorage.getItem(key);
    
    if (!serialized) {
      return null;
    }

    const state = JSON.parse(serialized);
    
    // Check if state is stale (older than 24 hours)
    const age = Date.now() - state.timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      clearLessonState(studentId, lessonId);
      return null;
    }

    return {
      currentNodeId: state.currentNodeId,
      completedNodes: state.completedNodes,
      attempts: state.attempts,
      hintsUsed: state.hintsUsed,
      startTime: state.startTime,
      interactions: state.interactions,
    };
  } catch (error) {
    console.error('Failed to load lesson state:', error);
    return null;
  }
}

/**
 * Clear lesson state from localStorage
 */
export function clearLessonState(studentId: string, lessonId: string): void {
  try {
    const key = `${STORAGE_PREFIX}${studentId}_${lessonId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear lesson state:', error);
  }
}

/**
 * Save lesson progress (completion status)
 */
export function saveLessonProgress(progress: LessonProgress): void {
  try {
    const key = `${PROGRESS_PREFIX}${progress.studentId}_${progress.lessonId}`;
    localStorage.setItem(key, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save lesson progress:', error);
  }
}

/**
 * Load lesson progress
 */
export function loadLessonProgress(
  studentId: string,
  lessonId: string
): LessonProgress | null {
  try {
    const key = `${PROGRESS_PREFIX}${studentId}_${lessonId}`;
    const serialized = localStorage.getItem(key);
    
    if (!serialized) {
      return null;
    }

    return JSON.parse(serialized);
  } catch (error) {
    console.error('Failed to load lesson progress:', error);
    return null;
  }
}

/**
 * Get all lesson progress for a student
 */
export function getAllLessonProgress(studentId: string): LessonProgress[] {
  const progress: LessonProgress[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${PROGRESS_PREFIX}${studentId}_`)) {
        const serialized = localStorage.getItem(key);
        if (serialized) {
          progress.push(JSON.parse(serialized));
        }
      }
    }
  } catch (error) {
    console.error('Failed to load all lesson progress:', error);
  }
  
  return progress;
}

/**
 * Calculate lesson completion percentage
 */
export function calculateCompletionPercentage(
  completedNodes: string[],
  totalNodes: number
): number {
  if (totalNodes === 0) return 0;
  return Math.round((completedNodes.length / totalNodes) * 100);
}

/**
 * Calculate mastery level based on performance
 */
export function calculateMasteryLevel(
  correctAnswers: number,
  totalQuestions: number
): LessonProgress['masteryLevel'] {
  if (totalQuestions === 0) return 'beginner';
  
  const percentage = (correctAnswers / totalQuestions) * 100;
  
  if (percentage >= 90) return 'mastery';
  if (percentage >= 75) return 'proficient';
  if (percentage >= 50) return 'developing';
  return 'beginner';
}

/**
 * Export lesson data for analytics (future use)
 */
export function exportLessonData(context: LessonContext): string {
  const data = {
    studentId: context.studentId,
    lessonId: context.lessonScript.metadata.id,
    lessonTitle: context.lessonScript.metadata.title,
    startTime: context.startTime,
    endTime: Date.now(),
    totalTime: Date.now() - context.startTime,
    completedNodes: context.completedNodes,
    attempts: context.attempts,
    hintsUsed: context.hintsUsed,
    interactions: context.interactions,
  };
  
  return JSON.stringify(data, null, 2);
}
