/**
 * CBC (Competency-Based Curriculum) Data Structure for Kenya
 * 
 * This file defines the structure of the Kenyan education system
 * including grade levels, teaching models, and subject assignments.
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export type CBCLevel = 'pre-primary' | 'lower-primary' | 'upper-primary' | 'junior-secondary';
export type TeachingModel = 'generalist' | 'specialist';
export type Grade = 'PP1' | 'PP2' | 'Grade 1' | 'Grade 2' | 'Grade 3' | 'Grade 4' | 'Grade 5' | 'Grade 6' | 'Grade 7' | 'Grade 8' | 'Grade 9';

export interface CBCLevelInfo {
  grades: readonly Grade[];
  model: TeachingModel;
  description: string;
}

export interface SubjectCategory {
  name: string;
  subjects: readonly string[];
  description: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CBC LEVEL STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

export const CBC_LEVELS: Record<CBCLevel, CBCLevelInfo> = {
  'pre-primary': {
    grades: ['PP1', 'PP2'],
    model: 'generalist',
    description: 'Pre-Primary education focusing on play-based learning and foundational skills'
  },
  'lower-primary': {
    grades: ['Grade 1', 'Grade 2', 'Grade 3'],
    model: 'generalist',
    description: 'Lower Primary with integrated learning areas taught by one teacher'
  },
  'upper-primary': {
    grades: ['Grade 4', 'Grade 5', 'Grade 6'],
    model: 'specialist',
    description: 'Upper Primary with subject-specific teaching by specialist teachers'
  },
  'junior-secondary': {
    grades: ['Grade 7', 'Grade 8', 'Grade 9'],
    model: 'specialist',
    description: 'Junior Secondary with specialized subject teaching'
  }
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// CBC SUBJECTS BY LEVEL
// ═══════════════════════════════════════════════════════════════════════════

export const CBC_SUBJECTS = {
  'pre-primary': [
    'Language Activities',
    'Mathematics Activities',
    'Environmental Activities',
    'Creative Activities',
    'Religious Education'
  ],
  'lower-primary': [
    'Mathematics Activities',
    'English Language Activities',
    'Kiswahili Language Activities',
    'Environmental Activities',
    'Creative Activities',
    'CRE/IRE/HRE',
    'Indigenous Language'
  ],
  'upper-primary': [
    'Mathematics',
    'English',
    'Kiswahili',
    'Science & Technology',
    'Social Studies',
    'CRE/IRE/HRE',
    'Creative Arts & Sports',
    'Agriculture & Nutrition'
  ],
  'junior-secondary': [
    'Mathematics',
    'English',
    'Kiswahili',
    'Integrated Science',
    'Health Education',
    'Pre-Technical Studies',
    'Social Studies',
    'CRE/IRE/HRE',
    'Business Studies',
    'Agriculture',
    'Life Skills Education',
    'Sports & Physical Education',
    'Performing Arts',
    'Visual Arts'
  ]
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// SUBJECT CATEGORIES (for Upper Primary & Junior Secondary)
// ═══════════════════════════════════════════════════════════════════════════

export const SUBJECT_CATEGORIES: Record<string, SubjectCategory> = {
  core: {
    name: 'Core Subjects',
    subjects: ['Mathematics', 'English', 'Kiswahili'],
    description: 'Essential subjects required for all students'
  },
  science: {
    name: 'Science & Technology',
    subjects: ['Science & Technology', 'Integrated Science', 'Pre-Technical Studies'],
    description: 'Science and technology-related subjects'
  },
  humanities: {
    name: 'Humanities',
    subjects: ['Social Studies', 'Business Studies'],
    description: 'Social sciences and humanities'
  },
  religious: {
    name: 'Religious Education',
    subjects: ['CRE/IRE/HRE'],
    description: 'Religious and moral education'
  },
  practical: {
    name: 'Practical Subjects',
    subjects: ['Agriculture', 'Agriculture & Nutrition', 'Health Education', 'Life Skills Education'],
    description: 'Practical and life skills subjects'
  },
  creative: {
    name: 'Creative Arts',
    subjects: ['Creative Arts & Sports', 'Performing Arts', 'Visual Arts', 'Sports & Physical Education'],
    description: 'Arts, sports, and creative expression'
  }
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the CBC level for a given grade
 */
export function getLevelForGrade(grade: Grade): CBCLevel {
  if (['PP1', 'PP2'].includes(grade)) return 'pre-primary';
  if (['Grade 1', 'Grade 2', 'Grade 3'].includes(grade)) return 'lower-primary';
  if (['Grade 4', 'Grade 5', 'Grade 6'].includes(grade)) return 'upper-primary';
  if (['Grade 7', 'Grade 8', 'Grade 9'].includes(grade)) return 'junior-secondary';
  throw new Error(`Invalid grade: ${grade}`);
}

/**
 * Get all subjects available for a specific grade
 */
export function getSubjectsForGrade(grade: Grade): readonly string[] {
  const level = getLevelForGrade(grade);
  return CBC_SUBJECTS[level];
}

/**
 * Check if a grade uses the generalist teaching model
 */
export function isGeneralistGrade(grade: Grade): boolean {
  const level = getLevelForGrade(grade);
  return CBC_LEVELS[level].model === 'generalist';
}

/**
 * Check if a grade uses the specialist teaching model
 */
export function isSpecialistGrade(grade: Grade): boolean {
  return !isGeneralistGrade(grade);
}

/**
 * Check if a grade is in Lower Primary (Grades 1-3)
 */
export function isLowerPrimary(grade: Grade): boolean {
  return ['Grade 1', 'Grade 2', 'Grade 3'].includes(grade);
}

/**
 * Check if a grade is in Upper Primary (Grades 4-6)
 */
export function isUpperPrimary(grade: Grade): boolean {
  return ['Grade 4', 'Grade 5', 'Grade 6'].includes(grade);
}

/**
 * Check if a grade is in Junior Secondary (Grades 7-9)
 */
export function isJuniorSecondary(grade: Grade): boolean {
  return ['Grade 7', 'Grade 8', 'Grade 9'].includes(grade);
}

/**
 * Get the teaching model for a specific grade
 */
export function getTeachingModel(grade: Grade): TeachingModel {
  const level = getLevelForGrade(grade);
  return CBC_LEVELS[level].model;
}

/**
 * Get all grades for a specific level
 */
export function getGradesForLevel(level: CBCLevel): readonly Grade[] {
  return CBC_LEVELS[level].grades;
}

/**
 * Get the subject category for a given subject
 */
export function getSubjectCategory(subject: string): string | null {
  for (const [categoryKey, category] of Object.entries(SUBJECT_CATEGORIES)) {
    if (category.subjects.includes(subject)) {
      return categoryKey;
    }
  }
  return null;
}

/**
 * Validate if a subject is valid for a given grade
 */
export function isValidSubjectForGrade(grade: Grade, subject: string): boolean {
  const validSubjects = getSubjectsForGrade(grade);
  return validSubjects.includes(subject);
}

/**
 * Get a display-friendly name for a grade/subject combination
 */
export function getGradeSubjectDisplay(grade: Grade, subject?: string): string {
  if (!subject || isGeneralistGrade(grade)) {
    return grade;
  }
  return `${grade} - ${subject}`;
}

/**
 * Get all valid grade options for teacher assignment
 */
export function getAllGrades(): Grade[] {
  return [
    'PP1', 'PP2',
    'Grade 1', 'Grade 2', 'Grade 3',
    'Grade 4', 'Grade 5', 'Grade 6',
    'Grade 7', 'Grade 8', 'Grade 9'
  ];
}

/**
 * Group grades by level for display purposes
 */
export function getGradesByLevel(): Record<CBCLevel, Grade[]> {
  return {
    'pre-primary': ['PP1', 'PP2'],
    'lower-primary': ['Grade 1', 'Grade 2', 'Grade 3'],
    'upper-primary': ['Grade 4', 'Grade 5', 'Grade 6'],
    'junior-secondary': ['Grade 7', 'Grade 8', 'Grade 9']
  };
}

/**
 * Get a human-readable description of the CBC level
 */
export function getLevelDescription(level: CBCLevel): string {
  return CBC_LEVELS[level].description;
}

/**
 * Check if subjects are required for a grade (specialist model)
 */
export function requiresSubjectSelection(grade: Grade): boolean {
  return isSpecialistGrade(grade);
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate teacher assignment data
 */
export interface TeacherAssignmentValidation {
  isValid: boolean;
  errors: string[];
}

export function validateTeacherAssignment(
  grade: Grade,
  subjects?: string[]
): TeacherAssignmentValidation {
  const errors: string[] = [];
  
  // Check if grade is valid
  if (!getAllGrades().includes(grade)) {
    errors.push(`Invalid grade: ${grade}`);
  }
  
  // Check if subjects are required
  if (requiresSubjectSelection(grade)) {
    if (!subjects || subjects.length === 0) {
      errors.push(`Subject selection is required for ${grade}`);
    } else {
      // Validate each subject
      const validSubjects = getSubjectsForGrade(grade);
      for (const subject of subjects) {
        if (!validSubjects.includes(subject)) {
          errors.push(`Invalid subject "${subject}" for ${grade}`);
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT CONSTANTS FOR EASY ACCESS
// ═══════════════════════════════════════════════════════════════════════════

export const ALL_GRADES = getAllGrades();
export const GRADES_BY_LEVEL = getGradesByLevel();

// Made with Bob
