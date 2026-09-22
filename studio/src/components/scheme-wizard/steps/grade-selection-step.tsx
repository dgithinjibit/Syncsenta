'use client';

/**
 * Grade Selection Step
 * Step 1: Select grade level (PP1-Senior School)
 */

import React from 'react';
import { useSchemeWizardStore } from '@/stores/scheme-wizard-store';
import { getAllGrades } from '@/data/curriculum';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import type { GradeLevel } from '@/types/curriculum';

export function GradeSelectionStep() {
  const { selectedGrade, setGrade, nextStep } = useSchemeWizardStore();
  const grades = getAllGrades();
  const formatGradeLabel = (grade: GradeLevel) => grade.replace(/^Grade(\d+)$/, 'Grade $1');

  const handleGradeSelect = (grade: GradeLevel) => {
    setGrade(grade);
    // Auto-advance to next step
    setTimeout(() => nextStep(), 300);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select the grade level for which you want to create a scheme of work.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {grades.map((grade) => (
          <Button
            key={grade}
            variant={selectedGrade === grade ? 'default' : 'outline'}
            className="h-20 text-lg font-semibold relative"
            onClick={() => handleGradeSelect(grade)}
          >
            {formatGradeLabel(grade)}
            {selectedGrade === grade && (
              <CheckCircle2 className="absolute top-2 right-2 h-5 w-5" />
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}
