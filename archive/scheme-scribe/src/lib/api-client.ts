/**
 * Centralized API Client for AI Agents Backend
 * 
 * This replaces the Supabase Edge Functions approach with direct calls
 * to the Python AI agents backend for consistency across the platform.
 */

const AI_AGENTS_URL = import.meta.env.VITE_AI_AGENTS_URL || 'http://localhost:8001';

export interface GenerateSchemeRequest {
  grade: string;
  subject: string;
  term: string;
  mode: string;
  teacher_id: string;
  language?: string;
}

export interface GenerateLessonPlanRequest {
  teacher_id: string;
  week: number;
  lesson: number;
  scheme_id?: string;
  row?: any;
  grade?: string;
  subject?: string;
  term?: string;
  additional_notes?: string;
  language?: string;
}

export interface SchemeRow {
  week: number;
  lesson: number;
  strand: string;
  subStrand: string;
  specificLearningOutcome: string;
  learningExperiences: string;
  keyInquiryQuestion: string;
  learningResources: string;
  assessmentMethods: string;
  reflection: string;
}

export interface LessonPlan {
  title: string;
  grade: string;
  subject: string;
  strand: string;
  subStrand: string;
  duration: string;
  objectives: string[];
  keyInquiryQuestion: string;
  introduction: {
    duration: string;
    activities: string[];
  };
  development: {
    duration: string;
    activities: string[];
  };
  conclusion: {
    duration: string;
    activities: string[];
  };
  assessment: string[];
  differentiation: {
    advanced: string;
    struggling: string;
  };
  resources: string[];
  teacherReflection: string;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = AI_AGENTS_URL;
  }

  async generateScheme(request: GenerateSchemeRequest): Promise<{ rows: SchemeRow[] }> {
    const response = await fetch(`${this.baseUrl}/lesson-architect/generate-scheme`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Failed to generate scheme: ${response.statusText}`);
    }

    const data = await response.json();
    return { rows: data.rows || [] };
  }

  async generateLessonPlan(request: GenerateLessonPlanRequest): Promise<{ plan: LessonPlan }> {
    const response = await fetch(`${this.baseUrl}/lesson-architect/generate-lesson-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Failed to generate lesson plan: ${response.statusText}`);
    }

    const data = await response.json();
    return { plan: data.lesson_plan };
  }

  async saveScheme(scheme: any): Promise<{ scheme_id: string }> {
    const response = await fetch(`${this.baseUrl}/lesson-architect/schemes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scheme),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Failed to save scheme: ${response.statusText}`);
    }

    const data = await response.json();
    return { scheme_id: data.scheme_id };
  }
}

export const apiClient = new ApiClient();
