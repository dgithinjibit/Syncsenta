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
  LiteracyCurriculumEnvelope,
} from '@/types/curriculum';
import { grade6AI, grade7AI, grade8AI, grade9AI, grade10AI, grade11AI, grade12AI } from './senior-school/ai';
import { BLOCKCHAIN_LITERACY_VERSION, blockchainStrandsByGrade } from './blockchain';
import { AI_LITERACY_VERSION } from './senior-school/ai';
import { grade4Kiswahili } from './upper-primary/kiswahili';
import { grade4ScienceTechnology } from './upper-primary/science-technology-grade4';
import { grade1Kiswahili, grade2Kiswahili, grade3Kiswahili } from './lower-primary/kiswahili';
import { grade1EnvironmentalActivities } from './lower-primary/environmental-activities';

/**
 * Get all subjects available for a given grade
 */
export function getSubjectsForGrade(grade: GradeLevel): SubjectInfo[] {
  const normalizedGrade = String(grade).replace(/\s+/g, '') as GradeLevel;

  // Lower Primary (PP1-Grade 3)
  if (['PP1', 'PP2', 'Grade1', 'Grade2', 'Grade3'].includes(normalizedGrade)) {
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
  if (['Grade4', 'Grade5', 'Grade6'].includes(normalizedGrade)) {
    const subjects: SubjectInfo[] = [
      { name: 'English', category: 'language', grades: ['Grade4', 'Grade5', 'Grade6'] },
      { name: 'Kiswahili', category: 'language', grades: ['Grade4', 'Grade5', 'Grade6'] },
      { name: 'Mathematics', category: 'non-language', grades: ['Grade4', 'Grade5', 'Grade6'] },
      { name: 'Agriculture', category: 'non-language', grades: ['Grade4', 'Grade5', 'Grade6'] },
      { name: 'Science and Technology', category: 'non-language', grades: ['Grade4', 'Grade5', 'Grade6'] },
      { name: 'Social Studies', category: 'non-language', grades: ['Grade4', 'Grade5', 'Grade6'] },
      { name: 'Creative Arts', category: 'non-language', grades: ['Grade4', 'Grade5', 'Grade6'] },
      { name: 'Indigenous Language', category: 'language', grades: ['Grade4', 'Grade5', 'Grade6'] },
    ];
    if (normalizedGrade === 'Grade6') {
      subjects.unshift(
        { name: 'AI Literacy', category: 'non-language', grades: ['Grade6'] },
        { name: 'Blockchain Literacy', category: 'non-language', grades: ['Grade6'] },
      );
    }
    return subjects;
  }
  
  // Senior School (Grade 10-12): Omega Claw subjects are available for teacher planning.
  if (['Grade10', 'Grade11', 'Grade12'].includes(normalizedGrade)) {
    return [
      { name: 'AI Literacy', category: 'non-language', grades: ['Grade10', 'Grade11', 'Grade12'] },
      { name: 'Blockchain Literacy', category: 'non-language', grades: ['Grade10', 'Grade11', 'Grade12'] },
      { name: 'Computer Science', category: 'non-language', grades: ['Grade10', 'Grade11', 'Grade12'] },
      { name: 'English', category: 'language', grades: ['Grade10', 'Grade11', 'Grade12'] },
    ];
  }

  // Junior School (Grade 7-9)
  if (['Grade7', 'Grade8', 'Grade9'].includes(normalizedGrade)) {
    return [
      { name: 'AI Literacy', category: 'non-language', grades: ['Grade7', 'Grade8', 'Grade9'] },
      { name: 'Blockchain Literacy', category: 'non-language', grades: ['Grade7', 'Grade8', 'Grade9'] },
      { name: 'Computer Science', category: 'non-language', grades: ['Grade7', 'Grade8', 'Grade9'] },
      { name: 'English', category: 'language', grades: ['Grade7', 'Grade8', 'Grade9'] },
    ];
  }

  return [];
}

/**
 * Get hardcoded strands for a grade-subject combination
 * This is a simplified version - full data will be ported from scheme-scribe-ai
 */
export function getHardcodedStrands(grade: GradeLevel, subject: string): StrandInfo[] {
  const normalizedGrade = String(grade).replace(/\s+/g, '') as GradeLevel;
  const key = `${normalizedGrade}-${subject}`;

  if (subject === 'AI Literacy') {
    return ({ Grade6: grade6AI, Grade7: grade7AI, Grade8: grade8AI, Grade9: grade9AI, Grade10: grade10AI, Grade11: grade11AI, Grade12: grade12AI } as Record<string, StrandInfo[]>)[normalizedGrade] || [];
  }

  if (subject === 'Blockchain Literacy') {
    return blockchainStrandsByGrade[normalizedGrade] || [];
  }

  if (subject === 'Kiswahili' && String(grade).replace(/\s+/g, '') === 'Grade4') {
    return grade4Kiswahili;
  }

  if (subject === 'Science and Technology' && String(grade).replace(/\s+/g, '') === 'Grade4') {
    return grade4ScienceTechnology;
  }

  if (subject === 'Environmental Activities' && String(grade).replace(/\s+/g, '') === 'Grade1') {
    return grade1EnvironmentalActivities;
  }

  if (subject === 'Kiswahili Language Activities') {
    const lowerGrade = String(grade).replace(/\s+/g, '');
    return ({ Grade1: grade1Kiswahili, Grade2: grade2Kiswahili, Grade3: grade3Kiswahili } as Record<string, StrandInfo[]>)[lowerGrade] || [];
  }
  
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

  if (['Social Studies', 'CRE', 'Religious Education', 'Creative Activities', 'Creative Arts'].includes(subject)) {
    return [
      {
        name: `${subject} Foundations`,
        description: `Guided foundations for ${subject.toLowerCase()}`,
        subStrands: [
          { name: 'Knowledge and Meaning', learningOutcomes: ['identify a key idea', 'explain it using a familiar example'] },
          { name: 'Practice and Community', learningOutcomes: ['apply the idea in a fictional scenario', 'share a respectful response'] },
        ],
      },
    ];
  }
  
  // Graceful offline fallback: keep the activity player usable while a full
  // authored pack is being ported. This is deliberately bounded and does not
  // pretend to be an official subject-specific sequence.
  console.warn(`[Curriculum] No authored strands defined for ${key}; using guided foundations`);
  return [
    {
      name: `${subject} Guided Foundations`,
      description: `Offline starter activities for ${subject.toLowerCase()}`,
      subStrands: [
        { name: 'Notice and Explain', learningOutcomes: ['identify one familiar idea', 'explain it in their own words'] },
        { name: 'Practise and Share', learningOutcomes: ['apply the idea in a safe fictional scenario', 'share a reflection with a partner'] },
      ],
    },
  ];
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
  if (subject === 'AI Literacy' || subject === 'Blockchain Literacy') {
    return 2;
  }

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

export function getLiteracyEnvelope(
  grade: GradeLevel | string,
  subject: string,
): LiteracyCurriculumEnvelope | null {
  const canonicalGrade = String(grade).replace(/\s+/g, '') as GradeLevel;
  const canonicalSubject = subject === 'AI' ? 'AI Literacy' : subject;
  if (canonicalSubject !== 'AI Literacy' && canonicalSubject !== 'Blockchain Literacy') return null;
  if (getHardcodedStrands(canonicalGrade, canonicalSubject).length === 0) return null;
  const numericGrade = Number(canonicalGrade.replace(/\D/g, ''));
  return {
    curriculumId: `${canonicalGrade}|${canonicalSubject}`,
    schemaVersion: '2026-09-22.phase1.v1',
    curriculumVersion: canonicalSubject === 'AI Literacy' ? AI_LITERACY_VERSION : BLOCKCHAIN_LITERACY_VERSION,
    grade: canonicalGrade,
    subject: canonicalSubject,
    gradeBand: numericGrade <= 6 ? 'upper_primary' : numericGrade <= 9 ? 'junior_secondary' : 'senior_school',
    lessonsPerWeek: getLessonsPerWeek(canonicalSubject),
    sourceType: 'authored',
    provenance: 'Syncsenta authored AI and Blockchain Literacy progression',
    evidenceRequired: true,
    teacherMediationRequired: true,
    syntheticDataOnly: true,
    externalActionsAllowed: false,
    prohibitedOperations: ['credentials', 'personal_identity_data', 'precise_location_data', 'wallets', 'tokens', 'seed_phrases', 'private_keys', 'trading', 'real_transactions', 'unsupervised_external_ai'],
    releaseState: 'teacher_review',
  };
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
  grade: GradeLevel | string,
  subject: string
): CurriculumData | null {
  const normalizedGrade = String(grade).replace(/\s+/g, '') as GradeLevel;
  const subjects = getSubjectsForGrade(normalizedGrade);
  const strands = getHardcodedStrands(normalizedGrade, subject);
  
  if (strands.length === 0) {
    console.warn(`[Curriculum] No curriculum data for ${grade} ${subject}`);
    return null;
  }

  const subjectInfo = subjects.find(s => s.name === subject);
  const category = subjectInfo?.category ?? (subject.toLowerCase().includes('english') || subject.toLowerCase().includes('kiswahili') ? 'language' : 'non-language');
  
  const data: CurriculumData = {
    grade: normalizedGrade,
    subject,
    category,
    strands,
    envelope: getLiteracyEnvelope(grade, subject) ?? undefined,
  };
  
  // Add term allocations for non-language subjects
  if (category === 'non-language') {
    data.termAllocations = [
      getTermAllocation(normalizedGrade, subject, 'Term1'),
      getTermAllocation(normalizedGrade, subject, 'Term2'),
      getTermAllocation(normalizedGrade, subject, 'Term3'),
    ].filter((t): t is TermAllocation => t !== null);
  }
  
  // Add weekly distributions for language subjects
  if (category === 'language') {
    data.weeklyDistributions = getWeeklyDistribution(normalizedGrade, subject, 'Term1');
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
    'Grade4', 'Grade5', 'Grade6', 'Grade7', 'Grade8', 'Grade9',
    'Grade10', 'Grade11', 'Grade12',
  ];
}

/**
 * Export column headers for scheme of work
 */
export { SCHEME_COLUMN_HEADERS } from '@/types/curriculum';
