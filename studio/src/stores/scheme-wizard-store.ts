/**
 * Scheme Wizard State Management
 * Zustand store for managing the 6-step scheme generation wizard
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GradeLevel, Term, IndigenousLanguage } from '@/types/curriculum';

/**
 * Wizard steps
 */
export type WizardStep = 
  | 'grade'
  | 'subject'
  | 'term'
  | 'strands'
  | 'inputs'
  | 'preview';

/**
 * Strand selection for term allocation
 */
export interface StrandSelection {
  strand: string;
  subStrands: string[];
  weeks: number;
}

/**
 * Teacher inputs for scheme generation
 */
export interface TeacherInputs {
  keyInquiryQuestions?: string;
  learningOutcomes?: string;
  learningExperiences?: string;
  learningResources?: string;
  assessmentMethods?: string;
}

/**
 * Scheme wizard state
 */
export interface SchemeWizardState {
  // Current step
  currentStep: WizardStep;
  
  // Step 1: Grade selection
  selectedGrade: GradeLevel | null;
  
  // Step 2: Subject selection
  selectedSubject: string | null;
  selectedIndigenousLanguage: IndigenousLanguage | null;
  
  // Step 3: Term selection
  selectedTerm: Term | null;
  
  // Step 4: Strand/sub-strand selection
  selectedStrands: StrandSelection[];
  useWeeklyMode: boolean; // true for language subjects
  
  // Step 5: Teacher inputs
  teacherInputs: TeacherInputs;
  
  // Step 6: Preview/generation
  generatedScheme: any | null; // SchemeRow[] when generated
  isGenerating: boolean;
  generationError: string | null;
  
  // Saving state
  isSaving: boolean;
  saveError: string | null;
  savedSchemeId: string | null;
  
  // Navigation actions
  goToStep: (step: WizardStep) => void;
  nextStep: () => void;
  previousStep: () => void;
  
  // Data actions
  setGrade: (grade: GradeLevel) => void;
  setSubject: (subject: string, indigenousLanguage?: IndigenousLanguage) => void;
  setTerm: (term: Term) => void;
  setStrands: (strands: StrandSelection[]) => void;
  setWeeklyMode: (useWeekly: boolean) => void;
  setTeacherInputs: (inputs: TeacherInputs) => void;
  setGeneratedScheme: (scheme: any) => void;
  setGenerating: (isGenerating: boolean) => void;
  setGenerationError: (error: string | null) => void;
  
  // Save actions
  setSaving: (isSaving: boolean) => void;
  setSaveError: (error: string | null) => void;
  setSavedSchemeId: (id: string | null) => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  currentStep: 'grade' as WizardStep,
  selectedGrade: null,
  selectedSubject: null,
  selectedIndigenousLanguage: null,
  selectedTerm: null,
  selectedStrands: [],
  useWeeklyMode: false,
  teacherInputs: {},
  generatedScheme: null,
  isGenerating: false,
  generationError: null,
  isSaving: false,
  saveError: null,
  savedSchemeId: null,
};

/**
 * Scheme wizard store
 */
export const useSchemeWizardStore = create<SchemeWizardState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Navigation
      goToStep: (step) => set({ currentStep: step }),
      
      nextStep: () => {
        const { currentStep } = get();
        const steps: WizardStep[] = ['grade', 'subject', 'term', 'strands', 'inputs', 'preview'];
        const currentIndex = steps.indexOf(currentStep);
        
        if (currentIndex < steps.length - 1) {
          set({ currentStep: steps[currentIndex + 1] });
        }
      },
      
      previousStep: () => {
        const { currentStep } = get();
        const steps: WizardStep[] = ['grade', 'subject', 'term', 'strands', 'inputs', 'preview'];
        const currentIndex = steps.indexOf(currentStep);
        
        if (currentIndex > 0) {
          set({ currentStep: steps[currentIndex - 1] });
        }
      },
      
      // Data setters
      setGrade: (grade) => set({ selectedGrade: grade }),
      
      setSubject: (subject, indigenousLanguage) => set({ 
        selectedSubject: subject,
        selectedIndigenousLanguage: indigenousLanguage || null,
      }),
      
      setTerm: (term) => set({ selectedTerm: term }),
      
      setStrands: (strands) => set({ selectedStrands: strands }),
      
      setWeeklyMode: (useWeekly) => set({ useWeeklyMode: useWeekly }),
      
      setTeacherInputs: (inputs) => set({ teacherInputs: inputs }),
      
      setGeneratedScheme: (scheme) => set({ generatedScheme: scheme }),
      
      setGenerating: (isGenerating) => set({ isGenerating }),
      
      setGenerationError: (error) => set({ generationError: error }),
      
      // Save actions
      setSaving: (isSaving) => set({ isSaving }),
      
      setSaveError: (error) => set({ saveError: error }),
      
      setSavedSchemeId: (id) => set({ savedSchemeId: id }),
      
      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'scheme-wizard-storage',
      partialize: (state) => ({
        // Only persist essential data, not UI state
        selectedGrade: state.selectedGrade,
        selectedSubject: state.selectedSubject,
        selectedIndigenousLanguage: state.selectedIndigenousLanguage,
        selectedTerm: state.selectedTerm,
        selectedStrands: state.selectedStrands,
        useWeeklyMode: state.useWeeklyMode,
        teacherInputs: state.teacherInputs,
      }),
    }
  )
);

