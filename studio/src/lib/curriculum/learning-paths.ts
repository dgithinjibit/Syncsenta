/**
 * Learning Paths System
 *
 * Defines structured learning sequences aligned to CBC curriculum.
 * Students follow guided paths that build competencies sequentially.
 *
 * Each path has:
 * - Clear learning objectives (CBC competencies)
 * - Prerequisite topics
 * - Recommended progression
 * - Estimated time to complete
 * - Validation checkpoints (mini-quizzes)
 */

export interface LearningCheckpoint {
  competencyCode: string;
  competencyName: string;
  description: string;
  suggestedDuration: number; // minutes
  estimatedQuestions: number;
  validateBefore: string[]; // other competencies to master first
}

export interface LearningPath {
  id: string;
  subject: string;
  grade: string;
  pathName: string;
  description: string;
  checkpoints: LearningCheckpoint[];
  totalEstimatedHours: number;
  icon: string;
}

/**
 * Grade 2 Mathematics Learning Path - CBC-aligned
 */
export const Grade2MathPath: LearningPath = {
  id: 'math-gr2',
  subject: 'Mathematics',
  grade: 'Grade 2',
  pathName: 'Numbers & Operations',
  description: 'Master numbers 0-100, addition, subtraction, and simple problem solving',
  totalEstimatedHours: 15,
  icon: '🔢',
  checkpoints: [
    {
      competencyCode: 'MA2.1.1',
      competencyName: 'Number Recognition 0-100',
      description: 'Read, write, and recognize numbers from 0 to 100',
      suggestedDuration: 45,
      estimatedQuestions: 15,
      validateBefore: [],
    },
    {
      competencyCode: 'MA2.1.2',
      competencyName: 'Counting & Skip Counting',
      description: 'Count forward and backward, skip count by 2s, 5s, and 10s',
      suggestedDuration: 60,
      estimatedQuestions: 20,
      validateBefore: ['MA2.1.1'],
    },
    {
      competencyCode: 'MA2.2.1',
      competencyName: 'Addition within 20',
      description: 'Add numbers within 20 with and without regrouping',
      suggestedDuration: 90,
      estimatedQuestions: 25,
      validateBefore: ['MA2.1.2'],
    },
    {
      competencyCode: 'MA2.2.2',
      competencyName: 'Subtraction within 20',
      description: 'Subtract numbers within 20 with and without borrowing',
      suggestedDuration: 90,
      estimatedQuestions: 25,
      validateBefore: ['MA2.2.1'],
    },
    {
      competencyCode: 'MA2.3.1',
      competencyName: 'Word Problems',
      description: 'Solve simple addition and subtraction word problems',
      suggestedDuration: 120,
      estimatedQuestions: 30,
      validateBefore: ['MA2.2.2'],
    },
  ],
};

/**
 * Grade 2 English Learning Path - CBC-aligned
 */
export const Grade2EnglishPath: LearningPath = {
  id: 'english-gr2',
  subject: 'English',
  grade: 'Grade 2',
  pathName: 'Reading & Comprehension',
  description: 'Build reading fluency and understand simple stories',
  totalEstimatedHours: 16,
  icon: '📖',
  checkpoints: [
    {
      competencyCode: 'EN2.1.1',
      competencyName: 'Reading Simple Words',
      description: 'Read CVC words and sight words fluently',
      suggestedDuration: 60,
      estimatedQuestions: 20,
      validateBefore: [],
    },
    {
      competencyCode: 'EN2.1.2',
      competencyName: 'Reading Simple Sentences',
      description: 'Read short sentences with expression',
      suggestedDuration: 90,
      estimatedQuestions: 25,
      validateBefore: ['EN2.1.1'],
    },
    {
      competencyCode: 'EN2.2.1',
      competencyName: 'Story Comprehension',
      description: 'Answer questions about stories read',
      suggestedDuration: 120,
      estimatedQuestions: 30,
      validateBefore: ['EN2.1.2'],
    },
    {
      competencyCode: 'EN2.3.1',
      competencyName: 'Writing Simple Sentences',
      description: 'Write simple sentences using capital letters and full stops',
      suggestedDuration: 90,
      estimatedQuestions: 20,
      validateBefore: ['EN2.2.1'],
    },
  ],
};

/**
 * Grade 2 Creative Activities Learning Path - CBC-aligned
 */
export const Grade2CreativeActivitiesPath: LearningPath = {
  id: 'creative-gr2',
  subject: 'Creative Activities',
  grade: 'Grade 2',
  pathName: 'Art & Music Exploration',
  description: 'Express creativity through drawing, coloring, and rhythm',
  totalEstimatedHours: 12,
  icon: '🎨',
  checkpoints: [
    {
      competencyCode: 'CA2.1.1',
      competencyName: 'Drawing Basic Shapes',
      description: 'Draw circles, squares, triangles, and rectangles',
      suggestedDuration: 45,
      estimatedQuestions: 10,
      validateBefore: [],
    },
    {
      competencyCode: 'CA2.1.2',
      competencyName: 'Coloring Within Lines',
      description: 'Color pictures neatly within boundaries',
      suggestedDuration: 60,
      estimatedQuestions: 10,
      validateBefore: ['CA2.1.1'],
    },
    {
      competencyCode: 'CA2.2.1',
      competencyName: 'Simple Patterns',
      description: 'Create and continue simple patterns',
      suggestedDuration: 60,
      estimatedQuestions: 15,
      validateBefore: ['CA2.1.2'],
    },
    {
      competencyCode: 'CA2.3.1',
      competencyName: 'Rhythm & Movement',
      description: 'Clap rhythms and move to music',
      suggestedDuration: 45,
      estimatedQuestions: 10,
      validateBefore: [],
    },
  ],
};

/**
 * Grade 2 Environmental Activities Learning Path - CBC-aligned
 */
export const Grade2EnvironmentalPath: LearningPath = {
  id: 'environmental-gr2',
  subject: 'Environmental Activities',
  grade: 'Grade 2',
  pathName: 'My Environment',
  description: 'Learn about plants, animals, and caring for our environment',
  totalEstimatedHours: 14,
  icon: '🌍',
  checkpoints: [
    {
      competencyCode: 'EA2.1.1',
      competencyName: 'Living and Non-living Things',
      description: 'Identify and classify living and non-living things',
      suggestedDuration: 60,
      estimatedQuestions: 15,
      validateBefore: [],
    },
    {
      competencyCode: 'EA2.1.2',
      competencyName: 'Plants We Eat',
      description: 'Name common food plants and their parts',
      suggestedDuration: 75,
      estimatedQuestions: 20,
      validateBefore: ['EA2.1.1'],
    },
    {
      competencyCode: 'EA2.2.1',
      competencyName: 'Animals Around Us',
      description: 'Identify domestic and wild animals',
      suggestedDuration: 90,
      estimatedQuestions: 20,
      validateBefore: ['EA2.1.2'],
    },
    {
      competencyCode: 'EA2.3.1',
      competencyName: 'Caring for Environment',
      description: 'Learn ways to keep our environment clean',
      suggestedDuration: 60,
      estimatedQuestions: 15,
      validateBefore: ['EA2.2.1'],
    },
  ],
};

/**
 * Grade 1-3 Mathematics Learning Path
 */
export const Grade1MathPath: LearningPath = {
  id: 'math-gr1',
  subject: 'mathematics',
  grade: 'grade-1',
  pathName: 'Numbers & Counting',
  description: 'Master counting, number recognition, and simple addition',
  totalEstimatedHours: 12,
  icon: '🔢',
  checkpoints: [
    {
      competencyCode: 'MA1.1.1',
      competencyName: 'Number Recognition 0-10',
      description: 'Recognize and name numbers from 0 to 10',
      suggestedDuration: 60,
      estimatedQuestions: 15,
      validateBefore: [],
    },
    {
      competencyCode: 'MA1.1.2',
      competencyName: 'Counting & Cardinality',
      description: 'Count objects and understand one-to-one correspondence',
      suggestedDuration: 90,
      estimatedQuestions: 20,
      validateBefore: ['MA1.1.1'],
    },
    {
      competencyCode: 'MA1.2.1',
      competencyName: 'Addition with Objects',
      description: 'Add small numbers using concrete objects',
      suggestedDuration: 120,
      estimatedQuestions: 25,
      validateBefore: ['MA1.1.2'],
    },
    {
      competencyCode: 'MA1.2.2',
      competencyName: 'Simple Subtraction',
      description: 'Subtract small numbers using objects',
      suggestedDuration: 120,
      estimatedQuestions: 25,
      validateBefore: ['MA1.2.1'],
    },
  ],
};

/**
 * Grade 1-3 English Learning Path
 */
export const Grade1EnglishPath: LearningPath = {
  id: 'english-gr1',
  subject: 'english-activities',
  grade: 'grade-1',
  pathName: 'Phonics & Sound',
  description: 'Learn letter sounds and begin blending',
  totalEstimatedHours: 15,
  icon: '📖',
  checkpoints: [
    {
      competencyCode: 'EN1.1.1',
      competencyName: 'Letter Recognition A-Z',
      description: 'Recognize uppercase and lowercase letters',
      suggestedDuration: 120,
      estimatedQuestions: 26,
      validateBefore: [],
    },
    {
      competencyCode: 'EN1.1.2',
      competencyName: 'Letter Sounds',
      description: 'Produce sounds for individual letters',
      suggestedDuration: 150,
      estimatedQuestions: 30,
      validateBefore: ['EN1.1.1'],
    },
    {
      competencyCode: 'EN1.1.3',
      competencyName: 'Sound Blending',
      description: 'Blend sounds to read simple words',
      suggestedDuration: 180,
      estimatedQuestions: 40,
      validateBefore: ['EN1.1.2'],
    },
    {
      competencyCode: 'EN1.1.4',
      competencyName: 'Reading Simple Sentences',
      description: 'Read short, simple sentences with CVC words',
      suggestedDuration: 180,
      estimatedQuestions: 40,
      validateBefore: ['EN1.1.3'],
    },
  ],
};

/**
 * Grade 4-6 Science Learning Path
 */
export const Grade4SciencePath: LearningPath = {
  id: 'science-gr4',
  subject: 'science-and-technology',
  grade: 'grade-4',
  pathName: 'Living Things & Habitats',
  description: 'Explore animals, plants, and their environments',
  totalEstimatedHours: 18,
  icon: '🌿',
  checkpoints: [
    {
      competencyCode: 'SC4.1.1',
      competencyName: 'Animal Classification',
      description: 'Classify animals by characteristics',
      suggestedDuration: 120,
      estimatedQuestions: 20,
      validateBefore: [],
    },
    {
      competencyCode: 'SC4.1.2',
      competencyName: 'Plant Parts & Functions',
      description: 'Learn plant structures and their roles',
      suggestedDuration: 120,
      estimatedQuestions: 20,
      validateBefore: [],
    },
    {
      competencyCode: 'SC4.2.1',
      competencyName: 'Food Chains',
      description: 'Understand energy flow in ecosystems',
      suggestedDuration: 150,
      estimatedQuestions: 25,
      validateBefore: ['SC4.1.1', 'SC4.1.2'],
    },
    {
      competencyCode: 'SC4.3.1',
      competencyName: 'Habitats & Adaptation',
      description: 'Explore how animals adapt to environments',
      suggestedDuration: 150,
      estimatedQuestions: 25,
      validateBefore: ['SC4.2.1'],
    },
  ],
};

/**
 * Collection of all defined learning paths
 */
export const allLearningPaths: LearningPath[] = [
  Grade2MathPath,
  Grade2EnglishPath,
  Grade2CreativeActivitiesPath,
  Grade2EnvironmentalPath,
  Grade1MathPath,
  Grade1EnglishPath,
  Grade4SciencePath,
];

/**
 * Get learning path for subject and grade
 */
export function getLearningPath(subject: string, grade: string): LearningPath | undefined {
  return allLearningPaths.find(
    (path) => path.subject === subject && path.grade === grade
  );
}

/**
 * Get all paths available for a grade
 */
export function getPathsForGrade(grade: string): LearningPath[] {
  return allLearningPaths.filter((path) => path.grade === grade);
}

/**
 * Get next checkpoint in path based on progress
 */
export function getNextCheckpoint(
  path: LearningPath,
  masteredCompetencies: string[]
): LearningCheckpoint | undefined {
  for (const checkpoint of path.checkpoints) {
    // Check if prerequisites are met
    const prereqsMet = checkpoint.validateBefore.every((prereq) =>
      masteredCompetencies.includes(prereq)
    );

    // Check if this checkpoint is not yet mastered
    if (prereqsMet && !masteredCompetencies.includes(checkpoint.competencyCode)) {
      return checkpoint;
    }
  }

  return undefined; // All checkpoints mastered or no eligible checkpoint
}

/**
 * Calculate progress through a learning path
 */
export function calculatePathProgress(
  path: LearningPath,
  masteredCompetencies: string[]
): {
  totalCheckpoints: number;
  completedCheckpoints: number;
  percentComplete: number;
  currentCheckpoint: LearningCheckpoint | undefined;
} {
  const completed = path.checkpoints.filter((c) =>
    masteredCompetencies.includes(c.competencyCode)
  );

  const current = getNextCheckpoint(path, masteredCompetencies);

  return {
    totalCheckpoints: path.checkpoints.length,
    completedCheckpoints: completed.length,
    percentComplete: Math.round((completed.length / path.checkpoints.length) * 100),
    currentCheckpoint: current,
  };
}
