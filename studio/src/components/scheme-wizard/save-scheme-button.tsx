"use client";

/**
 * Save Scheme Button Component
 * 
 * Handles saving generated schemes to the database with IPFS integration.
 * Integrates with the scheme wizard store and backend API.
 */

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Save, Loader2, Check } from "lucide-react";
import { useSchemeWizardStore } from '@/stores/scheme-wizard-store';
import { saveScheme } from '@/lib/scheme-v2-client';
import { useToast } from '@/hooks/use-toast';
import type { SchemeV2, SchemeRow, TeacherInputs as TeacherInputsType } from '@/types/curriculum';

interface SaveSchemeButtonProps {
  teacherId: string;
  classId?: string;
  token: string;
  onSaveComplete?: (schemeId: string) => void;
}

export function SaveSchemeButton({
  teacherId,
  classId,
  token,
  onSaveComplete,
}: SaveSchemeButtonProps) {
  const {
    selectedGrade,
    selectedSubject,
    selectedTerm,
    generatedScheme,
    teacherInputs,
    isSaving,
    setSaving,
    setSaveError,
    setSavedSchemeId,
  } = useSchemeWizardStore();

  const { toast } = useToast();
  const [justSaved, setJustSaved] = useState(false);

  const handleSave = async () => {
    // Validation
    if (!selectedGrade || !selectedSubject || !selectedTerm) {
      toast({
        title: "Missing Information",
        description: "Please complete all wizard steps before saving.",
        variant: "destructive",
      });
      return;
    }

    if (!generatedScheme || !Array.isArray(generatedScheme) || generatedScheme.length === 0) {
      toast({
        title: "No Scheme Generated",
        description: "Please generate a scheme before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      // Prepare scheme data
      const schemeData: Omit<SchemeV2, 'id' | 'created_at' | 'updated_at'> = {
        teacher_id: teacherId,
        class_id: classId,
        grade: selectedGrade,
        subject: selectedSubject,
        term: selectedTerm,
        scheme_rows: generatedScheme as SchemeRow[],
        teacher_inputs: {
          keyInquiryQuestions: teacherInputs.keyInquiryQuestions ? [teacherInputs.keyInquiryQuestions] : [],
          learningOutcomes: teacherInputs.learningOutcomes ? [teacherInputs.learningOutcomes] : [],
          learningExperiences: teacherInputs.learningExperiences ? [teacherInputs.learningExperiences] : [],
          learningResources: teacherInputs.learningResources ? [teacherInputs.learningResources] : [],
          assessmentMethods: teacherInputs.assessmentMethods ? [teacherInputs.assessmentMethods] : [],
        } as TeacherInputsType,
        curriculum_ref: `${selectedGrade}-${selectedSubject}-${selectedTerm}`,
        version: 1,
      };

      // Save to backend
      const response = await saveScheme(schemeData, token);

      // Update store
      setSavedSchemeId(response.id);
      setJustSaved(true);

      // Show success toast
      toast({
        title: "Scheme Saved!",
        description: `Your ${selectedSubject} scheme has been saved successfully.`,
      });

      // Call completion callback
      onSaveComplete?.(response.id);

      // Reset "just saved" indicator after 3 seconds
      setTimeout(() => setJustSaved(false), 3000);

    } catch (error) {
      console.error('Failed to save scheme:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setSaveError(errorMessage);
      toast({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const isDisabled = !generatedScheme || isSaving || justSaved;

  return (
    <Button
      onClick={handleSave}
      disabled={isDisabled}
      size="lg"
      className="min-w-[140px]"
    >
      {isSaving ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Saving...
        </>
      ) : justSaved ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          Saved!
        </>
      ) : (
        <>
          <Save className="h-4 w-4 mr-2" />
          Save Scheme
        </>
      )}
    </Button>
  );
}
