/**
 * Answer Validation Utilities
 * 
 * Provides validation functions for different question types in micro-evaluations.
 */

import type { QuestionType } from '../types/lesson-script';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isCorrect: boolean;
  feedback?: string;
  partialCredit?: number; // 0-1 for partial correctness
}

/**
 * Validate numeric answer
 * 
 * Supports:
 * - Exact match
 * - Tolerance-based matching (for floating point)
 * - Range-based matching
 */
export function validateNumericAnswer(
  studentAnswer: number,
  correctAnswer: number,
  options?: {
    tolerance?: number;
    range?: { min: number; max: number };
  }
): ValidationResult {
  // Check if answer is a valid number
  if (typeof studentAnswer !== 'number' || isNaN(studentAnswer)) {
    return {
      isCorrect: false,
      feedback: 'Please enter a valid number.',
    };
  }

  // Range-based validation
  if (options?.range) {
    const { min, max } = options.range;
    const isInRange = studentAnswer >= min && studentAnswer <= max;
    return {
      isCorrect: isInRange,
      feedback: isInRange
        ? 'Correct! Your answer is within the expected range.'
        : `Your answer should be between ${min} and ${max}.`,
    };
  }

  // Tolerance-based validation (for floating point)
  const tolerance = options?.tolerance ?? 0.001;
  const difference = Math.abs(studentAnswer - correctAnswer);
  const isCorrect = difference <= tolerance;

  return {
    isCorrect,
    feedback: isCorrect
      ? 'Correct! Well done.'
      : `Not quite. The correct answer is ${correctAnswer}.`,
  };
}

/**
 * Validate fraction answer
 * 
 * Supports:
 * - Fraction equivalence (e.g., 1/2 = 2/4)
 * - Simplified form checking
 * - Mixed number support
 */
export function validateFractionAnswer(
  studentAnswer: { numerator: number; denominator: number },
  correctAnswer: { numerator: number; denominator: number },
  options?: {
    requireSimplified?: boolean;
    tolerance?: number;
  }
): ValidationResult {
  // Validate input
  if (
    !studentAnswer ||
    typeof studentAnswer.numerator !== 'number' ||
    typeof studentAnswer.denominator !== 'number'
  ) {
    return {
      isCorrect: false,
      feedback: 'Please enter a valid fraction.',
    };
  }

  // Check for zero denominator
  if (studentAnswer.denominator === 0) {
    return {
      isCorrect: false,
      feedback: 'The denominator cannot be zero.',
    };
  }

  // Calculate decimal values for equivalence check
  const studentValue = studentAnswer.numerator / studentAnswer.denominator;
  const correctValue = correctAnswer.numerator / correctAnswer.denominator;
  const tolerance = options?.tolerance ?? 0.001;

  const isEquivalent = Math.abs(studentValue - correctValue) < tolerance;

  // Check if simplified form is required
  if (options?.requireSimplified && isEquivalent) {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const studentGcd = gcd(
      Math.abs(studentAnswer.numerator),
      Math.abs(studentAnswer.denominator)
    );
    const isSimplified = studentGcd === 1;

    if (!isSimplified) {
      return {
        isCorrect: false,
        feedback: 'Your fraction is correct but not in simplified form. Try simplifying it.',
        partialCredit: 0.7,
      };
    }
  }

  return {
    isCorrect: isEquivalent,
    feedback: isEquivalent
      ? 'Correct! Well done.'
      : `Not quite. The correct answer is ${correctAnswer.numerator}/${correctAnswer.denominator}.`,
  };
}

/**
 * Validate multiple choice answer
 */
export function validateMultipleChoiceAnswer(
  studentAnswer: string,
  correctAnswer: string,
  options?: {
    caseSensitive?: boolean;
  }
): ValidationResult {
  const caseSensitive = options?.caseSensitive ?? false;

  const studentNormalized = caseSensitive
    ? studentAnswer
    : studentAnswer.toLowerCase().trim();
  const correctNormalized = caseSensitive
    ? correctAnswer
    : correctAnswer.toLowerCase().trim();

  const isCorrect = studentNormalized === correctNormalized;

  return {
    isCorrect,
    feedback: isCorrect ? 'Correct! Well done.' : 'Not quite. Try again.',
  };
}

/**
 * Validate free response answer
 * 
 * Uses keyword matching and similarity scoring.
 * This is a simplified version - in production, you'd use NLP/LLM for better validation.
 */
export function validateFreeResponseAnswer(
  studentAnswer: string,
  correctAnswer: string,
  options?: {
    keywords?: string[];
    minSimilarity?: number;
  }
): ValidationResult {
  const studentNormalized = studentAnswer.toLowerCase().trim();
  const correctNormalized = correctAnswer.toLowerCase().trim();

  // Exact match
  if (studentNormalized === correctNormalized) {
    return {
      isCorrect: true,
      feedback: 'Excellent answer!',
    };
  }

  // Keyword matching
  if (options?.keywords) {
    const foundKeywords = options.keywords.filter((keyword) =>
      studentNormalized.includes(keyword.toLowerCase())
    );
    const keywordScore = foundKeywords.length / options.keywords.length;

    if (keywordScore >= (options.minSimilarity ?? 0.6)) {
      return {
        isCorrect: true,
        feedback: 'Good answer! You included the key concepts.',
        partialCredit: keywordScore,
      };
    }
  }

  // Simple similarity check (Jaccard similarity on words)
  const studentWords = new Set(studentNormalized.split(/\s+/));
  const correctWords = new Set(correctNormalized.split(/\s+/));
  const intersection = new Set(
    [...studentWords].filter((word) => correctWords.has(word))
  );
  const union = new Set([...studentWords, ...correctWords]);
  const similarity = intersection.size / union.size;

  const minSimilarity = options?.minSimilarity ?? 0.5;
  const isCorrect = similarity >= minSimilarity;

  return {
    isCorrect,
    feedback: isCorrect
      ? 'Good answer!'
      : 'Your answer is on the right track, but missing some key points.',
    partialCredit: similarity,
  };
}

/**
 * Main validation function that routes to appropriate validator
 */
export function validateAnswer(
  questionType: QuestionType,
  studentAnswer: any,
  correctAnswer: any,
  options?: Record<string, any>
): ValidationResult {
  switch (questionType) {
    case 'numeric':
      return validateNumericAnswer(studentAnswer, correctAnswer, options);

    case 'mcq':
      return validateMultipleChoiceAnswer(studentAnswer, correctAnswer, options);

    case 'free-response':
      return validateFreeResponseAnswer(studentAnswer, correctAnswer, options);

    case 'widget-based':
      // Widget-based validation is handled by the widget itself
      // This is a fallback
      return {
        isCorrect: false,
        feedback: 'Widget-based validation should be handled by the widget component.',
      };

    default:
      return {
        isCorrect: false,
        feedback: 'Unknown question type.',
      };
  }
}

/**
 * Validate number line answer
 * 
 * Special validator for number line widget
 */
export function validateNumberLineAnswer(
  studentAnswer: number,
  expectedValue: number,
  options?: {
    tolerance?: number;
    snapToGrid?: number;
  }
): ValidationResult {
  return validateNumericAnswer(studentAnswer, expectedValue, {
    tolerance: options?.tolerance ?? 0.1,
  });
}

/**
 * Validate fraction builder answer
 * 
 * Special validator for fraction builder widget
 */
export function validateFractionBuilderAnswer(
  studentAnswer: { numerator: number; denominator: number },
  expectedFraction: { numerator: number; denominator: number },
  options?: {
    requireSimplified?: boolean;
  }
): ValidationResult {
  return validateFractionAnswer(studentAnswer, expectedFraction, options);
}
