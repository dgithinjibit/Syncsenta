/**
 * Curriculum Extractor - Extracts curriculum data from scheme-scribe-ai
 * and stores it in a reusable format for Mwalimu AI
 */

import { getHardcodedStrands } from '@/data/curriculum';

interface ExtractedSubStrand {
  name: string;
  learningOutcomes: string[];
  suggestedExperiences: string[];
  keyInquiryQuestion?: string;
}

interface ExtractedStrand {
  name: string;
  subStrands: ExtractedSubStrand[];
}

export interface CurriculumData {
  grade: string;
  subject: string;
  strands: ExtractedStrand[];
}

export interface StrandMatch {
  strand: string;
  subStrand: string;
  learningOutcomes: string[];
  suggestedExperiences: string[];
  keyInquiryQuestion: string;
  confidence: number;
}

/**
 * Extract curriculum data from the local SyncSenta curriculum layer.
 * This avoids a runtime/build dependency on a separate repository checkout.
 */
export async function extractCurriculumData(): Promise<CurriculumData[]> {
  const curriculumData: CurriculumData[] = [];
  const subjects = [
    ['Mathematics Activities', 'Mathematics'],
    ['English Language Activities', 'English'],
    ['Mathematics', 'Mathematics'],
    ['English', 'English'],
  ] as const;

  for (const grade of ['Grade1', 'Grade2', 'Grade3', 'Grade4', 'Grade5', 'Grade6'] as const) {
    for (const [subject, localSubject] of subjects) {
      const strands = getHardcodedStrands(grade, localSubject).map((strand) => ({
        name: strand.name,
        subStrands: strand.subStrands.map((subStrand) => ({
          name: subStrand.name,
          learningOutcomes: subStrand.learningOutcomes ?? [],
          suggestedExperiences: [],
        })),
      }));
      if (strands.length > 0) curriculumData.push({ grade, subject, strands });
    }
  }

  return curriculumData;
}

/**
 * Identify which strand a student question belongs to
 */
export function identifyStrand(
  question: string,
  grade: string,
  subject: string,
  curriculumData: CurriculumData[]
): StrandMatch | null {
  // Find curriculum for this grade and subject
  const curriculum = curriculumData.find(
    (c) => c.grade === grade && c.subject === subject
  );
  
  if (!curriculum) return null;
  
  const questionLower = question.toLowerCase();
  let bestMatch: StrandMatch | null = null;
  let highestScore = 0;
  
  // Search through all strands and sub-strands
  for (const strand of curriculum.strands) {
    for (const subStrand of strand.subStrands) {
      let score = 0;
      
      // Check if question keywords match learning outcomes
      for (const outcome of subStrand.learningOutcomes) {
        const outcomeLower = outcome.toLowerCase();
        const keywords = extractKeywords(outcomeLower);
        
        for (const keyword of keywords) {
          if (questionLower.includes(keyword)) {
            score += 2;
          }
        }
      }
      
      // Check if question matches key inquiry question
      if (subStrand.keyInquiryQuestion) {
        const inquiryLower = subStrand.keyInquiryQuestion.toLowerCase();
        const inquiryKeywords = extractKeywords(inquiryLower);
        
        for (const keyword of inquiryKeywords) {
          if (questionLower.includes(keyword)) {
            score += 3;
          }
        }
      }
      
      // Check strand name
      const strandKeywords = extractKeywords(strand.name.toLowerCase());
      for (const keyword of strandKeywords) {
        if (questionLower.includes(keyword)) {
          score += 1;
        }
      }
      
      // Check sub-strand name
      const subStrandKeywords = extractKeywords(subStrand.name.toLowerCase());
      for (const keyword of subStrandKeywords) {
        if (questionLower.includes(keyword)) {
          score += 1;
        }
      }
      
      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          strand: strand.name,
          subStrand: subStrand.name,
          learningOutcomes: subStrand.learningOutcomes,
          suggestedExperiences: subStrand.suggestedExperiences,
          keyInquiryQuestion: subStrand.keyInquiryQuestion || '',
          confidence: Math.min(score / 10, 1), // Normalize to 0-1
        };
      }
    }
  }
  
  return bestMatch;
}

/**
 * Extract meaningful keywords from text
 */
function extractKeywords(text: string): string[] {
  // Remove common words
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once'];
  
  const words = text
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.includes(word));
  
  return words;
}

/**
 * Build curriculum context string for AI prompt
 */
export function buildCurriculumContext(match: StrandMatch, language: 'en' | 'sw'): string {
  if (language === 'sw') {
    return `
# MUKTADHA WA MTAALA (Curriculum Context):
Strand: ${match.strand}
Sub-Strand: ${match.subStrand}

Matokeo ya Kujifunza (Learning Outcomes):
${match.learningOutcomes.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Maswali Muhimu (Key Question):
${match.keyInquiryQuestion}

Shughuli Zilizopendekezwa (Suggested Activities):
${match.suggestedExperiences.slice(0, 3).map((e, i) => `${i + 1}. ${e}`).join('\n')}
`;
  }
  
  return `
# CURRICULUM CONTEXT:
Strand: ${match.strand}
Sub-Strand: ${match.subStrand}

Learning Outcomes:
${match.learningOutcomes.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Key Inquiry Question:
${match.keyInquiryQuestion}

Suggested Experiences:
${match.suggestedExperiences.slice(0, 3).map((e, i) => `${i + 1}. ${e}`).join('\n')}
`;
}
