import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Grade, CBCLevel, TeachingModel } from '@/lib/curriculum/cbc-curriculum';

/**
 * Teacher Context Store
 * 
 * Manages teacher's grade/subject assignments and current context
 * for navigation and content filtering throughout the application.
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TeacherAssignment {
  id: string;
  grade: Grade;
  level: CBCLevel;
  teaching_model: TeachingModel;
  subjects: string[];
  is_active: boolean;
}

export interface TeacherContextState {
  // Assignments
  assignments: TeacherAssignment[];
  isLoading: boolean;
  error: string | null;
  
  // Current Context
  currentGrade: Grade | null;
  currentSubject: string | null;
  
  // Actions
  setAssignments: (assignments: TeacherAssignment[]) => void;
  addAssignment: (assignment: TeacherAssignment) => void;
  removeAssignment: (assignmentId: string) => void;
  updateAssignment: (assignmentId: string, updates: Partial<TeacherAssignment>) => void;
  
  // Context Management
  setContext: (grade: Grade, subject?: string) => void;
  clearContext: () => void;
  
  // Loading & Error States
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Utility
  hasAssignments: () => boolean;
  getAssignmentForGrade: (grade: Grade) => TeacherAssignment | undefined;
  getSubjectsForGrade: (grade: Grade) => string[];
  isGeneralistForGrade: (grade: Grade) => boolean;
  
  // Reset
  reset: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// INITIAL STATE
// ═══════════════════════════════════════════════════════════════════════════

const initialState = {
  assignments: [],
  isLoading: false,
  error: null,
  currentGrade: null,
  currentSubject: null,
};

// ═══════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════

export const useTeacherContext = create<TeacherContextState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ─────────────────────────────────────────────────────────────────────
      // Assignment Management
      // ─────────────────────────────────────────────────────────────────────

      setAssignments: (assignments) => {
        set({ 
          assignments,
          error: null 
        });
      },

      addAssignment: (assignment) => {
        set((state) => ({
          assignments: [...state.assignments, assignment],
          error: null
        }));
      },

      removeAssignment: (assignmentId) => {
        set((state) => ({
          assignments: state.assignments.filter((a) => a.id !== assignmentId),
          // Clear context if removing current assignment
          currentGrade: state.assignments.find((a) => a.id === assignmentId)?.grade === state.currentGrade
            ? null
            : state.currentGrade,
          currentSubject: state.assignments.find((a) => a.id === assignmentId)?.grade === state.currentGrade
            ? null
            : state.currentSubject,
        }));
      },

      updateAssignment: (assignmentId, updates) => {
        set((state) => ({
          assignments: state.assignments.map((a) =>
            a.id === assignmentId ? { ...a, ...updates } : a
          ),
        }));
      },

      // ─────────────────────────────────────────────────────────────────────
      // Context Management
      // ─────────────────────────────────────────────────────────────────────

      setContext: (grade, subject) => {
        const assignment = get().getAssignmentForGrade(grade);
        
        if (!assignment) {
          console.warn(`No assignment found for grade: ${grade}`);
          set({ error: `You are not assigned to ${grade}` });
          return;
        }

        // For generalist grades, ignore subject parameter
        if (assignment.teaching_model === 'generalist') {
          set({
            currentGrade: grade,
            currentSubject: null,
            error: null
          });
          return;
        }

        // For specialist grades, validate subject
        if (subject && !assignment.subjects.includes(subject)) {
          console.warn(`Subject ${subject} not found in assignment for ${grade}`);
          set({ error: `You are not assigned to teach ${subject} in ${grade}` });
          return;
        }

        set({
          currentGrade: grade,
          currentSubject: subject || null,
          error: null
        });
      },

      clearContext: () => {
        set({
          currentGrade: null,
          currentSubject: null,
          error: null
        });
      },

      // ─────────────────────────────────────────────────────────────────────
      // Loading & Error States
      // ─────────────────────────────────────────────────────────────────────

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setError: (error) => {
        set({ error });
      },

      // ─────────────────────────────────────────────────────────────────────
      // Utility Functions
      // ─────────────────────────────────────────────────────────────────────

      hasAssignments: () => {
        return get().assignments.length > 0;
      },

      getAssignmentForGrade: (grade) => {
        return get().assignments.find((a) => a.grade === grade && a.is_active);
      },

      getSubjectsForGrade: (grade) => {
        const assignment = get().getAssignmentForGrade(grade);
        return assignment?.subjects || [];
      },

      isGeneralistForGrade: (grade) => {
        const assignment = get().getAssignmentForGrade(grade);
        return assignment?.teaching_model === 'generalist';
      },

      // ─────────────────────────────────────────────────────────────────────
      // Reset
      // ─────────────────────────────────────────────────────────────────────

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'teacher-context-storage',
      partialize: (state) => ({
        // Only persist assignments and current context
        assignments: state.assignments,
        currentGrade: state.currentGrade,
        currentSubject: state.currentSubject,
      }),
    }
  )
);

// ═══════════════════════════════════════════════════════════════════════════
// HELPER HOOKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook to get current context display string
 */
export function useCurrentContextDisplay(): string {
  const { currentGrade, currentSubject, isGeneralistForGrade } = useTeacherContext();
  
  if (!currentGrade) return 'No grade selected';
  
  if (isGeneralistForGrade(currentGrade) || !currentSubject) {
    return currentGrade;
  }
  
  return `${currentGrade} - ${currentSubject}`;
}

/**
 * Hook to check if teacher has access to a specific grade/subject
 */
export function useHasAccess(grade: Grade, subject?: string): boolean {
  const { getAssignmentForGrade } = useTeacherContext();
  
  const assignment = getAssignmentForGrade(grade);
  if (!assignment) return false;
  
  // Generalist teachers have access to all subjects
  if (assignment.teaching_model === 'generalist') return true;
  
  // Specialist teachers need specific subject assignment
  if (subject) {
    return assignment.subjects.includes(subject);
  }
  
  // If no subject specified for specialist, they have grade access
  return true;
}

/**
 * Hook to get all unique subjects across all assignments
 */
export function useAllSubjects(): string[] {
  const { assignments } = useTeacherContext();
  
  const allSubjects = assignments.flatMap((a) => a.subjects);
  return Array.from(new Set(allSubjects)).sort();
}

/**
 * Hook to get assignments grouped by level
 */
export function useAssignmentsByLevel(): Record<CBCLevel, TeacherAssignment[]> {
  const { assignments } = useTeacherContext();
  
  return assignments.reduce((acc, assignment) => {
    if (!acc[assignment.level]) {
      acc[assignment.level] = [];
    }
    acc[assignment.level].push(assignment);
    return acc;
  }, {} as Record<CBCLevel, TeacherAssignment[]>);
}

// Made with Bob
