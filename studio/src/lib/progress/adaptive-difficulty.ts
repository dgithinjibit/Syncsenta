/**
 * Adaptive Difficulty System
 *
 * Analyzes student performance on current topic and adjusts Socratic Mentor
 * question difficulty in real-time. Uses accuracy, speed, and confidence metrics
 * to determine optimal challenge level.
 *
 * Difficulty Levels:
 *   L1 (Foundational): Concrete examples, simple concepts, visual/kinesthetic aids
 *   L2 (Developing): Multi-step thinking, compare/contrast, begin abstraction
 *   L3 (Proficient): Abstract reasoning, apply to new contexts, explain reasoning
 *   L4 (Advanced): Create, synthesize, evaluate, defend positions, Blooms L5-6
 */

import { supabase } from '../supabase/client';
import { getLearningProgress, type MasteryLevel } from './progress-tracking';

export type DifficultyLevel = 'L1' | 'L2' | 'L3' | 'L4';

export interface AdaptiveDifficultyContext {
  level: DifficultyLevel;
  masteryLevel: MasteryLevel;
  progressPercentage: number;
  questionsAnsweredOnTopic: number;
  recentAccuracy: number; // accuracy in last 5 messages on this competency
  suggestedActions: string[];
  promptAdjustment: string; // Guidance to include in system prompt
}

/**
 * Analyze student performance and determine adaptive difficulty
 */
export async function analyzeAdaptiveDifficulty(
  userId: string,
  competencyCode: string,
  subject: string,
  recentMessageHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<AdaptiveDifficultyContext> {
  try {
    // Fetch current progress on this competency
    const progress = await getLearningProgress(userId, subject);
    const competencyProgress = progress.find(
      (p) => p.competencyCode === competencyCode
    );

    if (!competencyProgress) {
      // New topic, start at L1
      return {
        level: 'L1',
        masteryLevel: 'not_started',
        progressPercentage: 0,
        questionsAnsweredOnTopic: 0,
        recentAccuracy: 0,
        suggestedActions: [
          'Start with foundational concepts',
          'Use concrete examples from Kenya context',
          'Encourage exploration without pressure',
        ],
        promptAdjustment:
          'The student is beginning this topic. Use very concrete, everyday Kenyan examples. Ask simple questions where one or two steps of thinking get to the answer. Be encouraging.',
      };
    }

    // Calculate recent accuracy from message history
    const recentAccuracy = estimateRecentAccuracy(recentMessageHistory);

    // Determine difficulty level based on mastery and recent performance
    let level = mapMasteryToDifficulty(
      competencyProgress.masteryLevel,
      competencyProgress.questionsAnsweredOnTopic,
      recentAccuracy
    );

    // Generate context and actions
    const context: AdaptiveDifficultyContext = {
      level,
      masteryLevel: competencyProgress.masteryLevel,
      progressPercentage: competencyProgress.progressPercentage,
      questionsAnsweredOnTopic: competencyProgress.questionsAnsweredOnTopic,
      recentAccuracy,
      suggestedActions: generateSuggestedActions(level, competencyProgress),
      promptAdjustment: generatePromptAdjustment(
        level,
        competencyProgress.masteryLevel,
        recentAccuracy
      ),
    };

    return context;
  } catch (error) {
    console.error('Error analyzing adaptive difficulty:', error);
    // Safe fallback: start at L1
    return {
      level: 'L1',
      masteryLevel: 'not_started',
      progressPercentage: 0,
      questionsAnsweredOnTopic: 0,
      recentAccuracy: 0,
      suggestedActions: ['Continue learning at a comfortable pace'],
      promptAdjustment: 'Keep questions simple and concrete.',
    };
  }
}

/**
 * Map mastery level and performance to difficulty level
 */
function mapMasteryToDifficulty(
  masteryLevel: MasteryLevel,
  questionsAnswered: number,
  recentAccuracy: number
): DifficultyLevel {
  // If recent accuracy is very low, reduce difficulty
  if (recentAccuracy < 40 && questionsAnswered >= 3) {
    return 'L1';
  }

  // Map mastery levels to difficulties
  switch (masteryLevel) {
    case 'not_started':
      return 'L1';
    case 'emerging':
      // If accuracy is high, can move to L2; if low, stay at L1
      return recentAccuracy > 60 ? 'L2' : 'L1';
    case 'developing':
      // If accuracy is high, move to L3; if low, stay at L2
      return recentAccuracy > 70 ? 'L3' : 'L2';
    case 'proficient':
      // If accuracy is high, move to L4; if low, stay at L3
      return recentAccuracy > 75 ? 'L4' : 'L3';
    case 'mastered':
      return 'L4';
    default:
      return 'L1';
  }
}

/**
 * Estimate accuracy from recent message history
 * Looks for patterns like "correct", "right", "well done" vs "try again", "not quite"
 */
function estimateRecentAccuracy(
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
): number {
  if (!history || history.length < 2) return 50; // Default to middle

  // Count last 5 assistant messages that indicate correctness
  const recentAssistantMessages = history
    .filter((m) => m.role === 'assistant')
    .slice(-5);

  if (recentAssistantMessages.length === 0) return 50;

  const correctPatterns = [
    /hongera|vizuri|exactly right|that\'s correct|well done|brilliant|precisely/i,
  ];
  const incorrectPatterns = [
    /try again|not quite|not exactly|let\'s think|close but|almost|reconsider/i,
  ];

  let correctCount = 0;
  recentAssistantMessages.forEach((msg) => {
    if (correctPatterns.some((p) => p.test(msg.content))) {
      correctCount++;
    }
  });

  return Math.round((correctCount / recentAssistantMessages.length) * 100);
}

/**
 * Generate suggested actions for the student based on difficulty level
 */
function generateSuggestedActions(
  level: DifficultyLevel,
  progress: any
): string[] {
  const actions: Record<DifficultyLevel, string[]> = {
    L1: [
      'Start with simple, concrete examples',
      'Use real Kenyan scenarios (market, farm, school)',
      'Draw or visualize ideas',
      'Work slowly without rushing',
    ],
    L2: [
      'Compare ideas and spot patterns',
      'Think step-by-step about how to solve',
      'Ask why things work the way they do',
      'Try explaining to a friend',
    ],
    L3: [
      'Apply ideas to new problems',
      'Explain your reasoning clearly',
      'Think about edge cases',
      'Connect this to other topics you know',
    ],
    L4: [
      'Create your own examples and problems',
      'Defend your approach with reasoning',
      'Find alternative solutions',
      'Teach this concept to someone else',
    ],
  };

  return actions[level];
}

/**
 * Generate prompt adjustment text to embed in system prompt
 */
function generatePromptAdjustment(
  level: DifficultyLevel,
  masteryLevel: MasteryLevel,
  recentAccuracy: number
): string {
  const adjustments: Record<DifficultyLevel, string> = {
    L1: `The student is new to this topic or struggling. Use:
- Simple, concrete Kenyan examples (market, school, home, farm)
- One idea per sentence
- Lots of encouragement
- Draw diagrams or use objects they can picture
- Ask questions with obvious next steps
- Check understanding frequently
Example: Instead of "What is place value?", ask "If you have 23 shillings, how many 10-shilling coins is that?"`,

    L2: `The student is developing understanding. Use:
- Still use Kenyan examples but allow slightly more complexity
- Multi-step thinking (if-then, compare-contrast)
- Guide them to discover patterns themselves
- Ask them to explain their thinking
- Introduce one new term per turn
Example: "If 3 × 4 = 12, what do you think 3 × 5 would be? How did you figure that out?"`,

    L3: `The student is proficient and ready for challenge. Use:
- Abstract reasoning and symbolic notation
- Ask them to apply ideas to new contexts
- Encourage proof and reasoning
- Present small challenges that require creativity
- Ask "why" and "what if" questions
Example: "We know that a × b = b × a. Can you think of why that's always true?"`,

    L4: `The student is mastering this topic and ready for advanced work. Use:
- Synthesis and creation (make your own problems)
- Critique and evaluate approaches
- Connect across multiple domains
- Introduce elegant or surprising patterns
- Ask them to teach or mentor
Example: "Can you create a real-world problem that would need multiplication to solve? Now solve it and explain why that method works."`,
  };

  // Add performance-based guidance
  let performanceNote = '';
  if (recentAccuracy > 80) {
    performanceNote =
      ' They are doing very well right now—you can gently push harder.';
  } else if (recentAccuracy < 40) {
    performanceNote =
      ' They are struggling—slow down and break things into smaller steps.';
  }

  return adjustments[level] + performanceNote;
}

/**
 * Get difficulty label for UI display
 */
export function getDifficultyLabel(level: DifficultyLevel): string {
  const labels: Record<DifficultyLevel, string> = {
    L1: 'Foundational',
    L2: 'Developing',
    L3: 'Proficient',
    L4: 'Advanced',
  };
  return labels[level];
}
