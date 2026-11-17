export interface SubStrandInfo {
  name: string;
  lessons: number;
  /** Official KICD learning outcomes for this sub-strand */
  learningOutcomes?: string[];
  /** Official KICD suggested learning experiences */
  suggestedExperiences?: string[];
  /** Official KICD key inquiry question */
  keyInquiryQuestion?: string;
}

export interface StrandInfo {
  name: string;
  subStrands: SubStrandInfo[];
}

export interface SchemeRow {
  week: number;
  lesson: number;
  strand: string;
  subStrand: string;
  specificLearningOutcome: string;
  keyInquiryQuestion: string;
  learningExperiences: string;
  learningResources: string;
  assessmentMethods: string;
  reflection: string;
}
