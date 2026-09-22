/**
 * Curriculum Loader - Loads CBC curriculum context for specific strands
 * 
 * Integrates with scheme-genie curriculum data to provide:
 * - Learning outcomes
 * - Key inquiry questions
 * - Suggested learning experiences
 */

import type { StrandClassification } from './strand-classifier';

export interface CurriculumContext {
  strand: string;
  subStrand?: string;
  learningOutcomes: string[];
  keyInquiryQuestions: string[];
  suggestedActivities: string[];
  cbcReference: string;
}

/**
 * Load curriculum context for a classified strand
 */
export async function loadCurriculumContext(
  classification: StrandClassification
): Promise<CurriculumContext> {
  // For now, return hardcoded curriculum context
  // TODO: Integrate with scheme-genie data dynamically
  
  const { subject, grade, strand, subStrand } = classification;
  
  // Mathematics - Numbers - Counting
  if (subject.includes('Mathematics') && strand.includes('Numbers')) {
    return {
      strand: 'Numbers',
      subStrand: subStrand || 'Counting',
      learningOutcomes: [
        'Count numbers forward and backward up to 100',
        'Identify patterns in number sequences',
        'Use skip counting (2s, 5s, 10s) to count efficiently',
        'Understand place value (tens and ones)',
      ],
      keyInquiryQuestions: [
        'How can we count large numbers quickly?',
        'What patterns do you notice when counting by 10s?',
        'Why is it important to count accurately?',
      ],
      suggestedActivities: [
        'Count objects in groups of 10',
        'Use a number chart to identify patterns',
        'Practice skip counting with physical movements',
        'Count money using 10-shilling coins',
      ],
      cbcReference: `CBC ${grade} Mathematics - Numbers Strand`,
    };
  }
  
  // English - Grammar
  if (subject.includes('English') && strand.includes('Language Use')) {
    return {
      strand: 'Language Use',
      subStrand: subStrand || 'Word Classes',
      learningOutcomes: [
        'Identify and use nouns correctly',
        'Understand the function of different word classes',
        'Apply grammar rules in writing',
      ],
      keyInquiryQuestions: [
        'What is a noun and why is it important?',
        'How do nouns help us name things?',
        'Can you find nouns in everyday life?',
      ],
      suggestedActivities: [
        'Noun hunt in the classroom',
        'Sort nouns by category (person, place, thing)',
        'Create sentences using different types of nouns',
      ],
      cbcReference: `CBC ${grade} English - Language Use Strand`,
    };
  }
  
  // Kiswahili - Sarufi (Grammar)
  if (subject.includes('Kiswahili') && strand.includes('Sarufi')) {
    return {
      strand: 'Sarufi',
      subStrand: subStrand || 'Nomino',
      learningOutcomes: [
        'Kutambua na kutumia nomino kwa usahihi',
        'Kuelewa aina za nomino (watu, vitu, mahali)',
        'Kutumia nomino katika sentensi',
      ],
      keyInquiryQuestions: [
        'Nomino ni nini na kwa nini ni muhimu?',
        'Nomino zinasaidiaje kutaja vitu?',
        'Unaweza kupata nomino wapi?',
      ],
      suggestedActivities: [
        'Tafuta nomino darasani',
        'Panga nomino kwa makundi (watu, vitu, mahali)',
        'Unda sentensi kwa kutumia nomino',
      ],
      cbcReference: `CBC ${grade} Kiswahili - Sarufi Strand`,
    };
  }
  
  // Default fallback
  return {
    strand: strand || 'General',
    subStrand,
    learningOutcomes: ['Engage with the topic through inquiry'],
    keyInquiryQuestions: ['What do you want to learn about this topic?'],
    suggestedActivities: ['Explore the concept through discussion'],
    cbcReference: `CBC ${grade} ${subject}`,
  };
}
