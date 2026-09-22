/**
 * CBC Curriculum Data Layer
 * Unified curriculum data module for KICD CBC (PP1-Senior School)
 */

import type {
  GradeLevel,
  SubjectInfo,
  StrandInfo,
  SubStrandInfo,
  CurriculumData,
  TermAllocation,
  WeeklyDistribution,
  Term,
} from '@/types/curriculum';

/**
 * Get all subjects available for a given grade
 */
export function getSubjectsForGrade(grade: GradeLevel): SubjectInfo[] {
  // Lower Primary (PP1-Grade 3)
  if (['PP1', 'PP2', 'Grade1', 'Grade2', 'Grade3'].includes(grade)) {
    return [
      { name: 'English Language Activities', category: 'language', grades: ['PP1', 'PP2', 'Grade1', 'Grade2', 'Grade3'] },
      { name: 'Kiswahili Language Activities', category: 'language', grades: ['PP1', 'PP2', 'Grade1', 'Grade2', 'Grade3'] },
      { name: 'Mathematical Activities', category: 'non-language', grades: ['PP1', 'PP2', 'Grade1', 'Grade2', 'Grade3'] },
      { name: 'Environmental Activities', category: 'non-language', grades: ['PP1', 'PP2', 'Grade1', 'Grade2', 'Grade3'] },
      { name: 'Creative Activities', category: 'non-language', grades: ['PP1', 'PP2', 'Grade1', 'Grade2', 'Grade3'] },
      { name: 'Religious Education', category: 'non-language', grades: ['PP1', 'PP2', 'Grade1', 'Grade2', 'Grade3'] },
      { name: 'Indigenous Language', category: 'language', grades: ['PP1', 'PP2', 'Grade1', 'Grade2', 'Grade3'] },
    ];
  }
  
  // Upper Primary (Grade 4-6)
  if (['Grade4', 'Grade5', 'Grade6'].includes(grade)) {
    return [
      { name: 'English', category: 'language', grades: ['Grade4', 'Grade5', 'Grade6'] },
      { name: 'Kiswahili', category: 'language', grades: ['Grade4', 'Grade5', 'Grade6'] },
      { name: 'Mathematics', category: 'non-language', grades: ['Grade4', 'Grade5', 'Grade6'] },
      { name: 'Agriculture', category: 'non-language', grades: ['Grade4', 'Grade5', 'Grade6'] },
      { name: 'Science and Technology', category: 'non-language', grades: ['Grade4', 'Grade5', 'Grade6'] },
      { name: 'Social Studies', category: 'non-language', grades: ['Grade4', 'Grade5', 'Grade6'] },
      { name: 'Creative Arts', category: 'non-language', grades: ['Grade4', 'Grade5', 'Grade6'] },
      { name: 'Indigenous Language', category: 'language', grades: ['Grade4', 'Grade5', 'Grade6'] },
    ];
  }
  
  // Senior School (Grade 10-12): Omega Claw subjects are available for teacher planning.
  if (['Grade10', 'Grade11', 'Grade12'].includes(grade)) {
    return [
      { name: 'Artificial Intelligence', category: 'non-language', grades: ['Grade10', 'Grade11', 'Grade12'] },
      { name: 'Blockchain and Distributed Systems', category: 'non-language', grades: ['Grade10', 'Grade11', 'Grade12'] },
      { name: 'Computer Science', category: 'non-language', grades: ['Grade10', 'Grade11', 'Grade12'] },
      { name: 'English', category: 'language', grades: ['Grade10', 'Grade11', 'Grade12'] },
    ];
  }

  // Junior School (Grade 7-9) - placeholder for future
  return [];
}

/**
 * Get hardcoded strands for a grade-subject combination
 * This is a simplified version - full data will be ported from scheme-scribe-ai
 */
export function getHardcodedStrands(grade: GradeLevel, subject: string): StrandInfo[] {
  const key = `${grade}-${subject}`;
  
  // Mathematics strands (simplified example)
  if (subject === 'Mathematics' || subject === 'Mathematical Activities') {
    return [
      {
        name: 'Numbers',
        description: 'Number concepts and operations',
        subStrands: [
          { name: 'Whole Numbers', learningOutcomes: ['Count and write numbers', 'Add and subtract'] },
          { name: 'Fractions', learningOutcomes: ['Identify fractions', 'Compare fractions'] },
          { name: 'Decimals', learningOutcomes: ['Read decimals', 'Add decimals'] },
        ],
      },
      {
        name: 'Measurement',
        description: 'Measuring length, mass, capacity, time',
        subStrands: [
          { name: 'Length', learningOutcomes: ['Measure length', 'Convert units'] },
          { name: 'Mass', learningOutcomes: ['Measure mass', 'Compare masses'] },
          { name: 'Time', learningOutcomes: ['Tell time', 'Calculate duration'] },
        ],
      },
      {
        name: 'Geometry',
        description: 'Shapes, space, and position',
        subStrands: [
          { name: '2D Shapes', learningOutcomes: ['Identify shapes', 'Draw shapes'] },
          { name: '3D Shapes', learningOutcomes: ['Identify solids', 'Build models'] },
        ],
      },
    ];
  }
  
  // English/English Language Activities strands
  if (subject === 'English' || subject === 'English Language Activities') {
    return [
      {
        name: 'Listening and Speaking',
        description: 'Oral communication skills',
        subStrands: [
          { name: 'Listening Comprehension', learningOutcomes: ['Listen attentively', 'Follow instructions'] },
          { name: 'Speaking', learningOutcomes: ['Express ideas clearly', 'Participate in discussions'] },
        ],
      },
      {
        name: 'Reading',
        description: 'Reading skills and comprehension',
        subStrands: [
          { name: 'Reading Aloud', learningOutcomes: ['Read fluently', 'Use expression'] },
          { name: 'Reading Comprehension', learningOutcomes: ['Understand texts', 'Answer questions'] },
        ],
      },
      {
        name: 'Writing',
        description: 'Writing skills',
        subStrands: [
          { name: 'Handwriting', learningOutcomes: ['Write legibly', 'Form letters correctly'] },
          { name: 'Composition', learningOutcomes: ['Write sentences', 'Write paragraphs'] },
        ],
      },
    ];
  }
  
  // Default empty strands with warning
  console.warn(`[Curriculum] No strands defined for ${key}`);
  return [];
}

/**
 * Get sub-strands for a specific strand
 */
export function getSubStrandsForStrand(
  grade: GradeLevel,
  subject: string,
  strand: string
): SubStrandInfo[] {
  const strands = getHardcodedStrands(grade, subject);
  const foundStrand = strands.find(s => s.name === strand);
  
  if (!foundStrand) {
    console.warn(`[Curriculum] Strand "${strand}" not found for ${grade} ${subject}`);
    return [];
  }
  
  return foundStrand.subStrands;
}

/**
 * Get lessons per week for a subject
 */
export function getLessonsPerWeek(subject: string): number {
  // Language subjects typically have more lessons
  if (subject.toLowerCase().includes('english') || 
      subject.toLowerCase().includes('kiswahili') ||
      subject.toLowerCase().includes('indigenous')) {
    return 5;
  }
  
  // Mathematics
  if (subject.toLowerCase().includes('math')) {
    return 5;
  }
  
  // Other subjects
  return 3;
}

/**
 * Get term allocation for non-language subjects
 * Distributes strands across the three CBC terms with proper error handling
 */
export function getTermAllocation(
  grade: GradeLevel,
  subject: string,
  term: Term
): TermAllocation | null {
  try {
    const strands = getHardcodedStrands(grade, subject);
    
    if (strands.length === 0) {
      console.warn(`[Curriculum] No strands available for ${grade} ${subject} - graceful degradation`);
      return null;
    }
    
    // Calculate weeks per term (13 weeks standard CBC term)
    const weeksPerTerm = 13;
    const totalWeeks = weeksPerTerm * 3; // 39 weeks total
    
    // Distribute strands evenly across terms
    const strandsPerTerm = Math.ceil(strands.length / 3);
    const termIndex = term === 'Term1' ? 0 : term === 'Term2' ? 1 : 2;
    const startIndex = termIndex * strandsPerTerm;
    const endIndex = Math.min(startIndex + strandsPerTerm, strands.length);
    
    const termStrands = strands.slice(startIndex, endIndex);
    
    // Calculate weeks per strand for this term
    const weeksForTermStrands = Math.floor(weeksPerTerm / termStrands.length);
    const remainingWeeks = weeksPerTerm % termStrands.length;
    
    return {
      term,
      strands: termStrands.map((strand, index) => ({
        strand: strand.name,
        subStrands: strand.subStrands.map(ss => ss.name),
        // Distribute remaining weeks to first strands
        weeks: weeksForTermStrands + (index < remainingWeeks ? 1 : 0),
      })),
    };
  } catch (error) {
    console.error(`[Curriculum] Error getting term allocation for ${grade} ${subject} ${term}:`, error);
    // Graceful degradation: return null
    return null;
  }
}

/**
 * Get weekly distribution for language subjects
 * Distributes strands and sub-strands across 13-week term with proper error handling
 */
export function getWeeklyDistribution(
  grade: GradeLevel,
  subject: string,
  term: Term
): WeeklyDistribution[] {
  try {
    const strands = getHardcodedStrands(grade, subject);
    
    if (strands.length === 0) {
      console.warn(`[Curriculum] No strands available for ${grade} ${subject} - returning empty distribution`);
      return [];
    }
    
    const lessonsPerWeek = getLessonsPerWeek(subject);
    const weeksPerTerm = 13; // Standard CBC term length
    
    const distributions: WeeklyDistribution[] = [];
    
    // Calculate total sub-strands
    const totalSubStrands = strands.reduce((sum, strand) => sum + strand.subStrands.length, 0);
    
    if (totalSubStrands === 0) {
      console.warn(`[Curriculum] No sub-strands available for ${grade} ${subject}`);
      return [];
    }
    
    // Calculate weeks per sub-strand
    const weeksPerSubStrand = Math.max(1, Math.floor(weeksPerTerm / totalSubStrands));
    
    let currentWeek = 1;
    
    // Distribute strands and sub-strands across weeks
    for (const strand of strands) {
      for (const subStrand of strand.subStrands) {
        if (currentWeek > weeksPerTerm) {
          console.warn(`[Curriculum] Exceeded ${weeksPerTerm} weeks for ${grade} ${subject} ${term}`);
          break;
        }
        
        // Allocate weeks for this sub-strand
        for (let w = 0; w < weeksPerSubStrand && currentWeek <= weeksPerTerm; w++) {
          distributions.push({
            week: currentWeek,
            strand: strand.name,
            subStrand: subStrand.name,
            lessonsPerWeek,
          });
          
          currentWeek++;
        }
      }
      
      if (currentWeek > weeksPerTerm) break;
    }
    
    // Fill remaining weeks if any
    if (currentWeek <= weeksPerTerm && distributions.length > 0) {
      const lastDistribution = distributions[distributions.length - 1];
      for (let w = currentWeek; w <= weeksPerTerm; w++) {
        distributions.push({
          week: w,
          strand: lastDistribution.strand,
          subStrand: lastDistribution.subStrand,
          lessonsPerWeek,
        });
      }
    }
    
    return distributions;
  } catch (error) {
    console.error(`[Curriculum] Error getting weekly distribution for ${grade} ${subject} ${term}:`, error);
    // Graceful degradation: return empty array
    return [];
  }
}

/**
 * Get complete curriculum data for a grade-subject combination
 */
export function getCurriculumData(
  grade: GradeLevel,
  subject: string
): CurriculumData | null {
  const subjects = getSubjectsForGrade(grade);
  const subjectInfo = subjects.find(s => s.name === subject);
  
  if (!subjectInfo) {
    console.warn(`[Curriculum] Subject "${subject}" not found for grade ${grade}`);
    return null;
  }
  
  const strands = getHardcodedStrands(grade, subject);
  
  if (strands.length === 0) {
    console.warn(`[Curriculum] No curriculum data for ${grade} ${subject}`);
    return null;
  }
  
  const data: CurriculumData = {
    grade,
    subject,
    category: subjectInfo.category,
    strands,
  };
  
  // Add term allocations for non-language subjects
  if (subjectInfo.category === 'non-language') {
    data.termAllocations = [
      getTermAllocation(grade, subject, 'Term1'),
      getTermAllocation(grade, subject, 'Term2'),
      getTermAllocation(grade, subject, 'Term3'),
    ].filter((t): t is TermAllocation => t !== null);
  }
  
  // Add weekly distributions for language subjects
  if (subjectInfo.category === 'language') {
    data.weeklyDistributions = getWeeklyDistribution(grade, subject, 'Term1');
  }
  
  return data;
}

/**
 * Validate that curriculum data exists for a grade-subject combination
 */
export function validateCurriculumExists(
  grade: GradeLevel,
  subject: string
): boolean {
  const data = getCurriculumData(grade, subject);
  return data !== null && data.strands.length > 0;
}

/**
 * Get all available grades
 */
export function getAllGrades(): GradeLevel[] {
  return [
    'PP1', 'PP2',
    'Grade1', 'Grade2', 'Grade3',
    'Grade4', 'Grade5', 'Grade6',
    'Grade10', 'Grade11', 'Grade12',
  ];
}

/**
 * Export column headers for scheme of work
 */
export { SCHEME_COLUMN_HEADERS } from '@/types/curriculum';
