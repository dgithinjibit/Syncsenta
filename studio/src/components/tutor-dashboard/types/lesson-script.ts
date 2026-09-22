/**
 * Lesson Script Type Definitions
 * 
 * Defines the structure for CBC-aligned interactive lessons using state machine-driven flow.
 * Inspired by Synthesis Tutor's approach to structured, adaptive learning.
 */

// CBC Curriculum Types
export type CBCStrand = 
  | 'Numbers'
  | 'Algebra'
  | 'Geometry'
  | 'Measurement'
  | 'Data Handling'
  | 'Probability';

export type CBCSubStrand = string; // e.g., "Fractions", "Whole Numbers", "Addition"

export type GradeLevel = 
  | 'Grade 1' | 'Grade 2' | 'Grade 3' 
  | 'Grade 4' | 'Grade 5' | 'Grade 6'
  | 'Grade 7' | 'Grade 8' | 'Grade 9';

export type Subject = 'Mathematics' | 'English' | 'Science' | 'Social Studies' | 'Kiswahili';

// Widget Types
export type WidgetType = 
  | 'number-line'
  | 'fraction-builder'
  | 'block-manipulator'
  | 'binary-counter'
  | 'word-problem-visualizer';

// Lesson Node Types
export type LessonNodeType = 
  | 'teaching'      // Explanation/instruction node
  | 'micro-eval'    // Assessment node
  | 'scaffolding'   // Help/hint node
  | 'practice'      // Additional practice
  | 'summary';      // Lesson wrap-up

// Question Types for Micro-Evaluations
export type QuestionType = 
  | 'mcq'           // Multiple choice
  | 'numeric'       // Numeric input
  | 'widget-based'  // Answer through widget interaction
  | 'free-response'; // Open-ended text

// Lesson Metadata
export interface LessonMetadata {
  id: string;
  title: string;
  subject: Subject;
  grade: GradeLevel;
  topic: string;
  cbcStrand: CBCStrand;
  cbcSubStrand: CBCSubStrand;
  estimatedTime: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites?: string[]; // IDs of prerequisite lessons
  learningOutcomes: string[]; // CBC learning outcomes
  culturalContext?: string; // Kenyan-specific context notes
}

// Widget Configuration
export interface WidgetConfig {
  type: WidgetType;
  config: Record<string, any>; // Widget-specific configuration
}

// Teaching Node
export interface TeachingNode {
  id: string;
  type: 'teaching';
  explanation: {
    text: string;
    voiceOver?: string; // For accessibility (future)
    culturalContext?: string; // Kenyan examples
  };
  widget?: WidgetConfig; // Optional interactive demonstration
  transitions: {
    onNext: string; // Next node ID
  };
}

// Micro-Evaluation Node
export interface MicroEvalNode {
  id: string;
  type: 'micro-eval';
  question: {
    text: string;
    type: QuestionType;
    correctAnswer: any; // Type depends on question type
    options?: string[]; // For MCQ
    hints: string[]; // Progressive hints (max 3)
    explanation?: string; // Shown after correct answer
  };
  widget?: WidgetConfig; // Widget for answering
  knowledgeComponent: string; // For BKT tracking
  transitions: {
    onCorrect: string; // Next node ID
    onIncorrect: string; // Scaffolding node ID
    onTimeout?: string; // Optional timeout handling
  };
  scaffolding?: ScaffoldingConfig;
}

// Scaffolding Configuration
export interface ScaffoldingConfig {
  lockUI?: boolean; // Lock non-essential UI elements
  highlightElements?: string[]; // Widget elements to emphasize
  simplifyWidget?: boolean; // Reduce widget complexity
  message?: string; // Scaffolding message
}

// Scaffolding Node
export interface ScaffoldingNode {
  id: string;
  type: 'scaffolding';
  explanation: {
    text: string;
    culturalContext?: string;
  };
  scaffolding: ScaffoldingConfig;
  transitions: {
    onRetry: string; // Return to micro-eval node ID
  };
}

// Practice Node
export interface PracticeNode {
  id: string;
  type: 'practice';
  instructions: string;
  widget: WidgetConfig;
  transitions: {
    onComplete: string; // Next node ID
  };
}

// Summary Node
export interface SummaryNode {
  id: string;
  type: 'summary';
  summary: {
    text: string;
    keyTakeaways: string[];
    masteryIndicators?: string[]; // What student should now be able to do
  };
  transitions: {
    onComplete: 'completed'; // Always ends lesson
  };
}

// Union type for all node types
export type LessonNode = 
  | TeachingNode 
  | MicroEvalNode 
  | ScaffoldingNode 
  | PracticeNode 
  | SummaryNode;

// Complete Lesson Script
export interface LessonScript {
  metadata: LessonMetadata;
  initialNode: string; // ID of first node
  nodes: LessonNode[];
}

// Lesson State (for XState context)
export interface LessonState {
  studentId: string;
  lessonId: string;
  currentNodeId: string;
  completedNodes: string[];
  attempts: Record<string, number>; // Node ID -> attempt count
  hintsUsed: Record<string, number>; // Node ID -> hints used
  startTime: number;
  interactions: InteractionLog[];
}

// Interaction Log Entry
export interface InteractionLog {
  timestamp: number;
  nodeId: string;
  nodeType: LessonNodeType;
  action: 'view' | 'answer' | 'hint' | 'skip' | 'error';
  data?: any; // Action-specific data
  correct?: boolean; // For answers
  timeOnTask?: number; // Milliseconds
}

// Lesson Progress (for persistence)
export interface LessonProgress {
  studentId: string;
  lessonId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  currentNodeId?: string;
  completedAt?: number;
  totalTime: number; // milliseconds
  score?: number; // percentage
  masteryLevel?: 'beginner' | 'developing' | 'proficient' | 'mastery';
}
