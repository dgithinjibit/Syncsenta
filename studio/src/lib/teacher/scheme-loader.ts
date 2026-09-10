/**
 * Scheme Loader Utility
 * 
 * Handles loading saved schemes into the wizard for editing.
 * Converts SchemeV2 format back to wizard state.
 */

import type { SchemeV2 } from '@/types/curriculum';
import type { StrandSelection, TeacherInputs } from '@/stores/scheme-wizard-store';

/**
 * Load a scheme into the wizard store
 * Converts SchemeV2 data back to wizard state format
 */
export function loadSchemeIntoWizard(scheme: SchemeV2) {
  // Extract unique strands and sub-strands from scheme rows
  const strandMap = new Map<string, Set<string>>();
  
  scheme.scheme_rows.forEach(row => {
    if (!strandMap.has(row.strand)) {
      strandMap.set(row.strand, new Set());
    }
    strandMap.get(row.strand)!.add(row.subStrand);
  });

  // Convert to StrandSelection format
  const selectedStrands: StrandSelection[] = Array.from(strandMap.entries()).map(
    ([strand, subStrands]) => ({
      strand,
      subStrands: Array.from(subStrands),
      weeks: calculateWeeksForStrand(scheme.scheme_rows, strand),
    })
  );

  // Convert teacher inputs back to wizard format
  const teacherInputs: TeacherInputs = {
    keyInquiryQuestions: scheme.teacher_inputs.keyInquiryQuestions?.join('\n') || '',
    learningOutcomes: scheme.teacher_inputs.learningOutcomes?.join('\n') || '',
    learningExperiences: scheme.teacher_inputs.learningExperiences?.join('\n') || '',
    learningResources: scheme.teacher_inputs.learningResources?.join('\n') || '',
    assessmentMethods: scheme.teacher_inputs.assessmentMethods?.join('\n') || '',
  };

  // Determine if this is a language subject (weekly mode)
  const useWeeklyMode = isLanguageSubject(scheme.subject);

  return {
    selectedGrade: scheme.grade as any, // Cast to GradeLevel
    selectedSubject: scheme.subject,
    selectedTerm: scheme.term as any, // Cast to Term
    selectedStrands,
    useWeeklyMode,
    teacherInputs,
    generatedScheme: scheme.scheme_rows,
    savedSchemeId: scheme.id,
  };
}

/**
 * Calculate the number of weeks covered by a strand
 */
function calculateWeeksForStrand(schemeRows: any[], strand: string): number {
  const weeks = new Set(
    schemeRows
      .filter(row => row.strand === strand)
      .map(row => row.week)
  );
  return weeks.size;
}

/**
 * Determine if a subject is a language subject (uses weekly mode)
 */
function isLanguageSubject(subject: string): boolean {
  const languageSubjects = [
    'English',
    'English Language Activities',
    'Kiswahili',
    'Kiswahili Language Activities',
    'Indigenous Language',
  ];
  
  return languageSubjects.some(lang => 
    subject.toLowerCase().includes(lang.toLowerCase())
  );
}

/**
 * Validate that a scheme can be loaded into the wizard
 */
export function validateSchemeForLoading(scheme: SchemeV2): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!scheme.grade) {
    errors.push('Scheme is missing grade information');
  }

  if (!scheme.subject) {
    errors.push('Scheme is missing subject information');
  }

  if (!scheme.term) {
    errors.push('Scheme is missing term information');
  }

  if (!scheme.scheme_rows || scheme.scheme_rows.length === 0) {
    errors.push('Scheme has no lesson rows');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a curriculum reference string from scheme data
 */
export function createCurriculumRef(
  grade: string,
  subject: string,
  term: string
): string {
  return `${grade}-${subject}-${term}`;
}

/**
 * Parse a curriculum reference string
 */
export function parseCurriculumRef(ref: string): {
  grade: string;
  subject: string;
  term: string;
} | null {
  const parts = ref.split('-');
  if (parts.length < 3) {
    return null;
  }

  return {
    grade: parts[0],
    subject: parts.slice(1, -1).join('-'), // Handle subjects with hyphens
    term: parts[parts.length - 1],
  };
}
