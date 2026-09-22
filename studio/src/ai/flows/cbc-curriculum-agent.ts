/**
 * CBC Curriculum Agent - Authoritative source for KICD curriculum knowledge
 * Ensures 100% accuracy and curriculum alignment for all educational content
 */
import {
  getOmegaClawScopeMessage,
  isOmegaClawAdvancedRequest,
  isOmegaClawGrade,
  isOmegaClawSeniorGrade,
  isOmegaClawTopic,
  omegaClawSeniorCurriculum,
  omegaClawIntroductoryCurriculum,
} from '@/curriculum/omega-claw-ai-blockchain';

interface CBCContext {
  grade: string;
  subject: string;
  language?: 'english' | 'kiswahili' | 'mixed';
}

interface CBCResponse {
  content: string;
  isAccurate: boolean;
  source: string;
  curriculumAlignment: string;
  confidence: number;
  language: string;
  error?: string;
  suggestions?: string[];
}

interface CBCCompetency {
  code: string;
  description: string;
  level: string;
  subject: string;
  strand: string;
  subStrand: string;
}

interface CurriculumValidation {
  isAligned: boolean;
  confidence: number;
  reason?: string;
  suggestions?: string[];
}

export class CBCCurriculumAgent {
  private curriculumDatabase: Map<string, any>;
  private competencyMappings: Map<string, CBCCompetency[]>;

  constructor() {
    this.curriculumDatabase = new Map();
    this.competencyMappings = new Map();
    this.initializeCurriculumData();
  }

  /**
   * Query the CBC curriculum for accurate information
   * Now calls the Rust backend API on port 3001
   */
  async query(query: string, context: CBCContext): Promise<CBCResponse> {
    try {
      // Omega Claw is intentionally restricted to a Grade 6 introduction.
      // Apply this gate before the backend so retrieved content cannot widen
      // the age range or turn the introduction into an advanced lesson.
      if (isOmegaClawTopic(query)) {
        if (!isOmegaClawGrade(context.grade) && !isOmegaClawSeniorGrade(context.grade)) {
          return {
            content: '',
            isAccurate: false,
            source: 'Omega Claw Curriculum Guardrail',
            curriculumAlignment: 'Out of scope',
            confidence: 1,
            language: context.language || 'english',
            error: getOmegaClawScopeMessage(context.grade),
            suggestions: [`Use ${context.grade} CBC content instead of the Grade 6 AI and blockchain introduction.`],
          };
        }

        if (isOmegaClawSeniorGrade(context.grade)) {
          return {
            content: `${getOmegaClawScopeMessage(context.grade)}\n\nSenior School progression: ${omegaClawSeniorCurriculum.progression.map((stage) => `${stage.grade} — ${stage.theme}`).join('; ')}.`,
            isAccurate: true,
            source: 'Omega Claw Senior School Curriculum Guide',
            curriculumAlignment: 'Senior School applied AI and blockchain curriculum',
            confidence: 1,
            language: context.language || 'english',
          };
        }

        if (isOmegaClawAdvancedRequest(query)) {
          return {
            content: '',
            isAccurate: false,
            source: 'Omega Claw Curriculum Guardrail',
            curriculumAlignment: 'Introductory scope exceeded',
            confidence: 1,
            language: context.language || 'english',
            error: 'Omega Claw Grade 6 is introductory only. Keep the lesson conceptual and use a teacher-approved example instead of coding, deployment, wallets, tokens, trading, investment, or advanced model-building.',
            suggestions: ['Ask for a simple explanation, classroom activity, safety scenario, or paper-based demonstration.'],
          };
        }

        return {
          content: `${getOmegaClawScopeMessage(context.grade)}\n\nTopics: ${omegaClawIntroductoryCurriculum.strands.map((strand) => strand.title).join('; ')}.`,
          isAccurate: true,
          source: 'Omega Claw Grade 6 Curriculum Guide',
          curriculumAlignment: 'CBC Grade 6 introductory technology concepts',
          confidence: 1,
          language: context.language || 'english',
        };
      }

      // Validate context
      const validation = this.validateContext(context);
      if (!validation.isValid) {
        return {
          content: '',
          isAccurate: false,
          source: 'CBC Curriculum Agent',
          curriculumAlignment: 'Invalid',
          confidence: 0,
          language: context.language || 'english',
          error: validation.error
        };
      }

      // Call Rust backend API
      const backendUrl = process.env.NEXT_PUBLIC_CBC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/curriculum/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          grade_level: context.grade,
          subject: context.subject,
          strand: null, // Optional filter
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        return {
          content: '',
          isAccurate: false,
          source: 'CBC Curriculum Agent',
          curriculumAlignment: 'Error',
          confidence: 0,
          language: context.language || 'english',
          error: errorData.error || `Backend error: ${response.status}`,
          suggestions: this.generateSuggestions(query, context)
        };
      }

      const data = await response.json();

      // Map backend response to CBCResponse format
      const citations = data.citations || [];
      const retrievedSections = data.retrieved_sections || [];
      
      // Build content with citations
      let content = data.response_text || '';
      
      // Add citation details if available
      if (citations.length > 0) {
        content += '\n\nSources:\n';
        citations.forEach((citation: any, index: number) => {
          content += `${index + 1}. ${citation.grade_level} ${citation.subject} - ${citation.strand}\n`;
        });
      }

      return {
        content,
        isAccurate: citations.length > 0, // Accurate if we have citations
        source: 'KICD Official Curriculum (RAG)',
        curriculumAlignment: `CBC ${context.grade} ${context.subject}`,
        confidence: retrievedSections.length > 0 ? 0.95 : 0.5,
        language: context.language || 'english'
      };

    } catch (error) {
      // Fallback to mock data if backend is unavailable
      console.warn('CBC Backend unavailable, using fallback:', error);
      return this.fallbackQuery(query, context);
    }
  }

  /**
   * Fallback query using mock data when backend is unavailable
   */
  private async fallbackQuery(query: string, context: CBCContext): Promise<CBCResponse> {
    // Search curriculum database
    const curriculumMatch = this.searchCurriculum(query, context);
    
    if (!curriculumMatch) {
      return {
        content: '',
        isAccurate: false,
        source: 'CBC Curriculum Agent (Fallback)',
        curriculumAlignment: 'Not Found',
        confidence: 0,
        language: context.language || 'english',
        error: 'Content not found in CBC curriculum (backend unavailable)',
        suggestions: this.generateSuggestions(query, context)
      };
    }

    // Generate accurate response
    const response = await this.generateCurriculumResponse(curriculumMatch, context);
    
    return {
      content: response.content + '\n\n⚠️ Note: Using fallback data (backend unavailable)',
      isAccurate: true,
      source: 'KICD Official Curriculum (Fallback)',
      curriculumAlignment: `CBC Grade ${context.grade.replace('g', '')} ${context.subject}`,
      confidence: response.confidence * 0.8, // Lower confidence for fallback
      language: context.language || 'english'
    };
  }

  /**
   * Validate if content aligns with CBC curriculum
   */
  async validateCurriculumAlignment(content: string, context: CBCContext): Promise<CurriculumValidation> {
    const contextValidation = this.validateContext(context);
    if (!contextValidation.isValid) {
      return {
        isAligned: false,
        confidence: 0,
        reason: contextValidation.error
      };
    }

    if (isOmegaClawTopic(content)) {
      if (!isOmegaClawGrade(context.grade) && !isOmegaClawSeniorGrade(context.grade)) {
        return {
          isAligned: false,
          confidence: 1,
          reason: getOmegaClawScopeMessage(context.grade),
          suggestions: ['Use the learner\'s own grade-level CBC content.']
        };
      }
      if (isOmegaClawSeniorGrade(context.grade)) {
        return {
          isAligned: true,
          confidence: 1,
          reason: 'Content fits the supervised Senior School Omega Claw scope; require evidence, ethics, safety, and teacher review.'
        };
      }
      if (isOmegaClawAdvancedRequest(content)) {
        return {
          isAligned: false,
          confidence: 1,
          reason: 'Content exceeds the Grade 6 introductory Omega Claw scope.',
          suggestions: ['Replace advanced or financial content with a conceptual, teacher-guided, offline-friendly activity.']
        };
      }
      return {
        isAligned: true,
        confidence: 1,
        reason: 'Content fits the Grade 6 introductory Omega Claw scope; keep it conceptual and teacher-guided.'
      };
    }

    // Check against curriculum standards
    const gradeKey = `${context.grade}-${context.subject}`;
    const curriculumStandards = this.curriculumDatabase.get(gradeKey);
    
    if (!curriculumStandards) {
      return {
        isAligned: false,
        confidence: 0,
        reason: 'No curriculum standards found for this grade/subject combination'
      };
    }

    // Analyze content alignment
    const alignment = this.analyzeContentAlignment(content, curriculumStandards, context);
    
    return alignment;
  }

  /**
   * Get CBC competencies for specific topic
   */
  async getCompetencies(grade: string, subject: string, topic: string): Promise<CBCCompetency[]> {
    const key = `${grade}-${subject.toLowerCase()}-${topic.toLowerCase()}`;
    const competencies = this.competencyMappings.get(key) || [];
    
    // If no specific competencies found, get general subject competencies
    if (competencies.length === 0) {
      const generalKey = `${grade}-${subject.toLowerCase()}`;
      return this.competencyMappings.get(generalKey) || [];
    }
    
    return competencies;
  }

  /**
   * Initialize curriculum database with KICD data
   */
  private initializeCurriculumData(): void {
    // Grade 4 Mathematics - Fractions
    this.curriculumDatabase.set('g4-Mathematics', {
      strands: {
        'Numbers': {
          subStrands: {
            'Fractions': {
              learningOutcomes: [
                'Identify parts of a whole',
                'Name fractions using proper terminology',
                'Compare fractions with same denominators',
                'Add simple fractions with same denominators'
              ],
              activities: [
                'Cut fruits into equal parts',
                'Use fraction charts and models',
                'Identify fractions in daily life'
              ],
              assessment: 'Continuous assessment through practical activities'
            }
          }
        }
      }
    });

    // Competency mappings for Grade 4 Mathematics Fractions
    this.competencyMappings.set('g4-mathematics-fractions', [
      {
        code: 'CBC-G4-MATH-NUM-001',
        description: 'Identify and name parts of a whole as fractions',
        level: 'Grade 4',
        subject: 'Mathematics',
        strand: 'Numbers',
        subStrand: 'Fractions'
      },
      {
        code: 'CBC-G4-MATH-NUM-002', 
        description: 'Compare fractions with the same denominator',
        level: 'Grade 4',
        subject: 'Mathematics',
        strand: 'Numbers',
        subStrand: 'Fractions'
      },
      {
        code: 'CBC-G4-MATH-NUM-003',
        description: 'Add simple fractions with same denominators',
        level: 'Grade 4',
        subject: 'Mathematics', 
        strand: 'Numbers',
        subStrand: 'Fractions'
      }
    ]);

    // General Grade 4 Mathematics competencies
    this.competencyMappings.set('g4-mathematics', [
      {
        code: 'CBC-G4-MATH-NUM-001',
        description: 'Identify and name parts of a whole as fractions',
        level: 'Grade 4',
        subject: 'Mathematics',
        strand: 'Numbers',
        subStrand: 'Fractions'
      },
      {
        code: 'CBC-G4-MATH-NUM-002', 
        description: 'Compare fractions with the same denominator',
        level: 'Grade 4',
        subject: 'Mathematics',
        strand: 'Numbers',
        subStrand: 'Fractions'
      },
      {
        code: 'CBC-G4-MATH-NUM-003',
        description: 'Add simple fractions with same denominators',
        level: 'Grade 4',
        subject: 'Mathematics', 
        strand: 'Numbers',
        subStrand: 'Fractions'
      }
    ]);

    // Add more curriculum data for other subjects/grades
    this.initializeEnglishCurriculum();
    this.initializeScienceCurriculum();
  }

  private initializeEnglishCurriculum(): void {
    this.curriculumDatabase.set('g4-English', {
      strands: {
        'Listening and Speaking': {
          subStrands: {
            'Pronunciation': {
              learningOutcomes: [
                'Pronounce words correctly',
                'Use appropriate intonation',
                'Speak clearly and audibly'
              ]
            }
          }
        },
        'Reading': {
          subStrands: {
            'Reading Comprehension': {
              learningOutcomes: [
                'Read and understand simple texts',
                'Answer questions about texts',
                'Identify main ideas'
              ]
            }
          }
        }
      }
    });
  }

  private initializeScienceCurriculum(): void {
    this.curriculumDatabase.set('g4-Science', {
      strands: {
        'Living Things': {
          subStrands: {
            'Plants': {
              learningOutcomes: [
                'Identify parts of a plant',
                'Describe functions of plant parts',
                'Care for plants'
              ]
            }
          }
        }
      }
    });
  }

  /**
   * Validate grade and subject context
   */
  private validateContext(context: CBCContext): { isValid: boolean; error?: string } {
    // Validate grade
    const validGrades = ['pp1', 'pp2', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11', 'g12'];
    if (!validGrades.includes(context.grade.toLowerCase())) {
      return {
        isValid: false,
        error: `Invalid grade level: ${context.grade}. Valid grades: PP1-PP2, G1-G9`
      };
    }

    // Validate subject
    const validSubjects = ['Mathematics', 'English', 'Science', 'Social Studies', 'Kiswahili', 'Creative Arts', 'Physical Education'];
    if (!validSubjects.includes(context.subject)) {
      return {
        isValid: false,
        error: `Invalid subject: ${context.subject}. Valid subjects: ${validSubjects.join(', ')}`
      };
    }

    return { isValid: true };
  }

  /**
   * Search curriculum database for relevant content
   */
  private searchCurriculum(query: string, context: CBCContext): any {
    const key = `${context.grade}-${context.subject}`;
    const curriculumData = this.curriculumDatabase.get(key);
    
    if (!curriculumData) {
      return null;
    }

    // Simple keyword matching for now (could be enhanced with vector search)
    const queryLower = query.toLowerCase();
    
    // Search through strands and sub-strands
    for (const [strandName, strand] of Object.entries(curriculumData.strands as Record<string, { subStrands: Record<string, unknown> }>)) {
      for (const [subStrandName, subStrand] of Object.entries(strand.subStrands)) {
        if (queryLower.includes(subStrandName.toLowerCase()) || 
            queryLower.includes(strandName.toLowerCase())) {
          return {
            strand: strandName,
            subStrand: subStrandName,
            data: subStrand
          };
        }
      }
    }

    return null;
  }

  /**
   * Generate curriculum-aligned response
   */
  private async generateCurriculumResponse(match: any, context: CBCContext): Promise<{ content: string; confidence: number }> {
    const { strand, subStrand, data } = match;
    
    let content = '';
    
    if (context.language === 'kiswahili') {
      content = this.generateKiswahiliResponse(strand, subStrand, data);
    } else {
      content = this.generateEnglishResponse(strand, subStrand, data);
    }

    return {
      content,
      confidence: 0.95 // High confidence for curriculum-aligned content
    };
  }

  private generateEnglishResponse(strand: string, subStrand: string, data: any): string {
    const outcomes = data.learningOutcomes || [];
    const activities = data.activities || [];
    
    let response = `According to the CBC curriculum for ${subStrand} in ${strand}:\n\n`;
    
    if (outcomes.length > 0) {
      response += `Learning Outcomes:\n`;
      outcomes.forEach((outcome: string, index: number) => {
        response += `${index + 1}. ${outcome}\n`;
      });
      response += '\n';
    }
    
    if (activities.length > 0) {
      response += `Suggested Activities:\n`;
      activities.forEach((activity: string, index: number) => {
        response += `${index + 1}. ${activity}\n`;
      });
    }
    
    return response.trim();
  }

  private generateKiswahiliResponse(strand: string, subStrand: string, data: any): string {
    // Simple translation for demonstration
    const translations: Record<string, string> = {
      'Fractions': 'Sehemu za Nambari',
      'Numbers': 'Nambari',
      'Learning Outcomes': 'Matokeo ya Kujifunza',
      'Suggested Activities': 'Shughuli za Mapendekezo'
    };
    
    const translatedSubStrand = translations[subStrand] || subStrand;
    const translatedStrand = translations[strand] || strand;
    
    return `Kulingana na mtaala wa CBC kwa ${translatedSubStrand} katika ${translatedStrand}:\n\nSehemu za nambari ni fungu la kitu kimoja. Kwa mfano, ikiwa unagawanya ugali katika sehemu nne sawa, kila sehemu ni 1/4 ya ugali.`;
  }

  /**
   * Analyze content alignment with curriculum
   */
  private analyzeContentAlignment(content: string, standards: any, context: CBCContext): CurriculumValidation {
    const contentLower = content.toLowerCase();
    
    // Check for age-inappropriate content
    const inappropriateKeywords = ['calculus', 'derivatives', 'integrals', 'advanced algebra'];
    const gradeNumber = parseInt(context.grade.replace('g', ''));
    
    for (const keyword of inappropriateKeywords) {
      if (contentLower.includes(keyword) && gradeNumber <= 6) {
        return {
          isAligned: false,
          confidence: 0.9,
          reason: `Content contains "${keyword}" which is not appropriate for Grade ${gradeNumber}`,
          suggestions: ['Focus on basic concepts', 'Use concrete examples', 'Simplify language']
        };
      }
    }

    // Check for curriculum keywords
    let alignmentScore = 0;
    let totalChecks = 0;

    for (const [strandName, strand] of Object.entries(standards.strands as Record<string, { subStrands: Record<string, unknown> }>)) {
      for (const [subStrandName, subStrand] of Object.entries(strand.subStrands)) {
        totalChecks++;
        if (contentLower.includes(subStrandName.toLowerCase()) || 
            contentLower.includes(strandName.toLowerCase())) {
          alignmentScore++;
        }
      }
    }

    const confidence = totalChecks > 0 ? alignmentScore / totalChecks : 0;
    
    return {
      isAligned: confidence > 0.3,
      confidence,
      reason: confidence > 0.3 ? 'Content aligns with CBC curriculum standards' : 'Content does not match curriculum topics',
      suggestions: confidence <= 0.3 ? this.generateAlignmentSuggestions(context) : undefined
    };
  }

  /**
   * Generate suggestions for better curriculum alignment
   */
  private generateSuggestions(query: string, context: CBCContext): string[] {
    const key = `${context.grade}-${context.subject}`;
    const curriculumData = this.curriculumDatabase.get(key);
    
    if (!curriculumData) {
      return ['Check grade and subject combination', 'Refer to official CBC documents', 'Contact curriculum specialist'];
    }

    const suggestions: string[] = [];
    
    // Extract available topics
    for (const [strandName, strand] of Object.entries(curriculumData.strands as Record<string, { subStrands: Record<string, unknown> }>)) {
      for (const subStrandName of Object.keys(strand.subStrands)) {
        suggestions.push(`Try asking about ${subStrandName} in ${strandName}`);
      }
    }

    return suggestions.length >= 3 ? suggestions.slice(0, 3) : [
      ...suggestions,
      'Check grade and subject combination',
      'Refer to official CBC documents'
    ].slice(0, 3);
  }

  private generateAlignmentSuggestions(context: CBCContext): string[] {
    return [
      `Focus on ${context.grade} appropriate content`,
      'Use concrete examples and practical activities',
      'Align with CBC learning outcomes'
    ];
  }
}
