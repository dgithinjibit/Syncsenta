/**
 * CBC Curriculum Data Types
 * Core types for Kenya's Competency-Based Curriculum (PP1-Senior School)
 */

/**
 * Canonical data type representing one lesson row in a scheme of work
 */
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
  reflection?: string;
}

/**
 * Quiz/Exam question types
 */
export type QuestionType = "mcq" | "short" | "long";

/**
 * Canonical data type for exam/quiz questions
 */
export interface QuizQuestion {
  id: string;
  type: QuestionType;
  strand: string;
  subStrand: string;
  question: string;
  marks: number;
  
  // MCQ-specific fields
  options?: string[];
  answerIndex?: number;
  
  // Short answer-specific fields
  expectedAnswer?: string;
  acceptableKeywords?: string[];
  
  // Long answer-specific fields
  rubric?: string;
}

/**
 * Sub-strand information
 */
export interface SubStrandInfo {
  name: string;
  lessons?: number;
  description?: string;
  learningOutcomes?: string[];
  keyInquiryQuestion?: string;
  suggestedExperiences?: string[];
}

/**
 * Strand information
 */
export interface StrandInfo {
  name: string;
  description?: string;
  subStrands: SubStrandInfo[];
}

/**
 * Grade levels in CBC
 */
export type GradeLevel = 
  | "PP1" | "PP2" 
  | "Grade1" | "Grade2" | "Grade3" 
  | "Grade4" | "Grade5" | "Grade6"
  | "Grade7" | "Grade8" | "Grade9"
  | "Grade10" | "Grade11" | "Grade12";

/**
 * CBC Terms
 */
export type Term = "Term1" | "Term2" | "Term3";

/**
 * Subject categories
 */
export type SubjectCategory = "language" | "non-language";

/**
 * Subject information
 */
export interface SubjectInfo {
  name: string;
  category: SubjectCategory;
  grades: GradeLevel[];
  description?: string;
}

export type LiteracyReleaseState = 'draft' | 'teacher_review' | 'verified';

/** Shared JSON contract for the AI and Blockchain Literacy packs. */
export interface LiteracyCurriculumEnvelope {
  curriculumId: string;
  schemaVersion: string;
  curriculumVersion: string;
  grade: GradeLevel;
  subject: 'AI Literacy' | 'Blockchain Literacy';
  gradeBand: 'upper_primary' | 'junior_secondary' | 'senior_school';
  lessonsPerWeek: number;
  sourceType: 'authored';
  provenance: string;
  evidenceRequired: boolean;
  teacherMediationRequired: boolean;
  syntheticDataOnly: boolean;
  externalActionsAllowed: false;
  prohibitedOperations: string[];
  releaseState: LiteracyReleaseState;
}

/**
 * Term allocation for non-language subjects
 */
export interface TermAllocation {
  term: Term;
  strands: {
    strand: string;
    subStrands: string[];
    weeks: number;
  }[];
}

/**
 * Weekly distribution for language subjects
 */
export interface WeeklyDistribution {
  week: number;
  strand: string;
  subStrand: string;
  lessonsPerWeek: number;
}

/**
 * Curriculum data for a grade-subject combination
 */
export interface CurriculumData {
  grade: GradeLevel;
  subject: string;
  category: SubjectCategory;
  strands: StrandInfo[];
  envelope?: LiteracyCurriculumEnvelope;
  termAllocations?: TermAllocation[];
  weeklyDistributions?: WeeklyDistribution[];
}

/**
 * Quiz generation request
 */
export interface QuizGenerationRequest {
  grade: GradeLevel;
  subject: string;
  term: Term;
  strand?: string;
  subStrand?: string;
  questionCount?: number;
  distribution?: {
    mcq: number;
    short: number;
    long: number;
  };
}

/**
 * Quiz generation response
 */
export interface QuizGenerationResponse {
  questions: QuizQuestion[];
  examId: string;
  cached: boolean;
}

/**
 * Mastery levels based on Suzuki + Kumon methods
 */
export enum MasteryLevel {
  Beginner = "Beginner",       // < 60%
  Developing = "Developing",   // 60-79%
  Proficient = "Proficient",   // 80-89%
  Mastery = "Mastery",         // 90-100%
}

/**
 * Practice types based on learning methods
 */
export enum PracticeType {
  HighRepetition = "HighRepetition",       // < 60% - Suzuki method
  ModerateRepetition = "ModerateRepetition", // 60-79%
  MinimalRepetition = "MinimalRepetition",   // 80%+
  DailyPractice = "DailyPractice",          // Kumon method
}

/**
 * Practice recommendation
 */
export interface PracticeRecommendation {
  strand: string;
  subStrand: string;
  practiceType: PracticeType;
  questionCount: number;
}

/**
 * Quiz result
 */
export interface QuizResult {
  studentId: string;
  quizId: string;
  questions: QuizQuestion[];
  answers: string[];
  scores: number[];
  totalScore: number;
  totalMarks: number;
  percentage: number;
  timeSpent: number;
}

/**
 * Feedback response from MeTTa engine
 */
export interface FeedbackResponse {
  overallScore: number;
  masteryLevel: MasteryLevel;
  feedbackText: string;
  weakStrands: string[];
  practiceRecommendations: PracticeRecommendation[];
  canAdvance: boolean;
}

/**
 * Quiz completion result
 */
export interface QuizCompletionResult {
  score: number;
  totalMarks: number;
  percentage: number;
  masteryLevel: MasteryLevel;
  feedback: FeedbackResponse;
  timeSpent: number;
}

/**
 * Column headers for scheme of work (English/Kiswahili)
 */
export const SCHEME_COLUMN_HEADERS = {
  week: { en: "Week", sw: "Wiki" },
  lesson: { en: "Lesson", sw: "Somo" },
  strand: { en: "Strand", sw: "Mada" },
  subStrand: { en: "Sub-Strand", sw: "Mada Ndogo" },
  specificLearningOutcome: { en: "Specific Learning Outcome", sw: "Matokeo Maalum" },
  keyInquiryQuestion: { en: "Key Inquiry Question", sw: "Swali Dadisi" },
  learningExperiences: { en: "Learning Experiences", sw: "Shughuli za Ujifunzaji" },
  learningResources: { en: "Learning Resources", sw: "Vifaa vya Kujifunzia" },
  assessmentMethods: { en: "Assessment Methods", sw: "Tathmini" },
  reflection: { en: "Reflection", sw: "Tafakari" },
} as const;

/**
 * 38 Kenyan Indigenous Languages
 */
export const INDIGENOUS_LANGUAGES = [
  "Gikuyu",
  "Luo",
  "Luhya",
  "Kamba",
  "Kalenjin",
  "Kisii",
  "Meru",
  "Mijikenda",
  "Taita",
  "Embu",
  "Tharaka",
  "Maasai",
  "Turkana",
  "Samburu",
  "Pokot",
  "Rendille",
  "Borana",
  "Somali",
  "Orma",
  "Sakuye",
  "Burji",
  "Gabra",
  "Konso",
  "Dahalo",
  "Boni",
  "Sanye",
  "Waata",
  "Aweer",
  "Elmolo",
  "Yaaku",
  "Ogiek",
  "Sengwer",
  "Endorois",
  "Ilchamus",
  "Kore",
  "Omotik",
  "Suba",
  "Taveta",
] as const;

export type IndigenousLanguage = typeof INDIGENOUS_LANGUAGES[number];

/**
 * Teacher inputs for scheme generation
 */
export interface TeacherInputs {
  keyInquiryQuestions: string[];
  learningOutcomes: string[];
  learningExperiences: string[];
  learningResources: string[];
  assessmentMethods: string[];
}

/**
 * Strand selection for scheme generation
 */
export interface StrandSelection {
  name: string;
  subStrands: string[];
}

/**
 * Enhanced Scheme v2.0 with JSONB storage and IPFS integration
 */
export interface SchemeV2 {
  id: string;
  teacher_id: string;
  class_id?: string;
  grade: string;
  subject: string;
  term: string;
  scheme_rows: SchemeRow[];
  teacher_inputs: TeacherInputs;
  curriculum_ref: string;
  ipfs_cid?: string;
  blockchain_tx_hash?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

/**
 * Lesson plan for a specific scheme row
 */
export interface LessonPlan {
  id: string;
  scheme_id: string;
  week: number;
  lesson: number;
  title: string;
  duration_minutes: number;
  learning_objectives: string[];
  activities: any; // JSONB - flexible structure
  resources: string[];
  assessment_criteria?: any; // JSONB - flexible structure
  created_at: string;
  updated_at: string;
}

/**
 * Exam question for scheme-based assessments
 */
export interface ExamQuestion {
  type: QuestionType;
  strand: string;
  sub_strand: string;
  question: string;
  options?: string[];
  answer_index?: number;
  expected_answer?: string;
  acceptable_keywords?: string[];
  rubric?: string;
  marks: number;
}

/**
 * Exam metadata
 */
export interface Exam {
  id: string;
  teacher_id: string;
  scheme_id?: string;
  grade: string;
  subject: string;
  term: string;
  title: string;
  questions: ExamQuestion[];
  total_marks: number;
  duration_minutes: number;
  ipfs_cid?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Exam session (student attempt)
 */
export interface ExamSession {
  id: string;
  exam_id: string;
  student_id: string;
  started_at: string;
  submitted_at?: string;
  answers?: any; // JSONB
  total_score?: number;
  strand_scores?: any; // JSONB
  weak_areas?: string[];
  duration_seconds?: number;
  created_at: string;
}

/**
 * Exam result (question-level)
 */
export interface ExamResult {
  id: string;
  exam_session_id: string;
  question_index: number;
  question_type: string;
  strand: string;
  sub_strand: string;
  student_answer?: string;
  correct_answer?: string;
  marks_awarded: number;
  max_marks: number;
  feedback?: string;
  created_at: string;
}

/**
 * Scheme credential (blockchain)
 */
export interface SchemeCredential {
  id: string;
  teacher_id: string;
  scheme_id: string;
  credential_type: string;
  credential_data: any; // JSONB
  blockchain_tx_hash?: string;
  ipfs_cid?: string;
  issued_at: string;
  verified_at?: string;
}
