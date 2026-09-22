'use client';

/**
 * Scheme Wizard - Main Component
 * 6-step wizard for generating CBC-compliant schemes of work
 */

import React from 'react';
import { useSchemeWizardStore } from '@/stores/scheme-wizard-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';

// Step components (to be implemented)
import { GradeSelectionStep } from './steps/grade-selection-step';
import { SubjectSelectionStep } from './steps/subject-selection-step';
import { TermSelectionStep } from './steps/term-selection-step';
import { StrandSelectionStep } from './steps/strand-selection-step';
import { TeacherInputsStep } from './steps/teacher-inputs-step';
import { PreviewStep } from './steps/preview-step';

const STEP_TITLES = {
  grade: 'Select Grade',
  subject: 'Select Subject',
  term: 'Select Term',
  strands: 'Select Strands',
  inputs: 'Teacher Inputs',
  preview: 'Preview & Generate',
};

const STEP_DESCRIPTIONS = {
  grade: 'Choose the grade level for your scheme of work',
  subject: 'Select the subject you want to create a scheme for',
  term: 'Choose which term this scheme covers',
  strands: 'Select the strands and sub-strands to include',
  inputs: 'Provide additional teaching context and preferences',
  preview: 'Review and generate your CBC-compliant scheme',
};

export function SchemeWizard() {
  const {
    currentStep,
    selectedGrade,
    selectedSubject,
    selectedTerm,
    selectedStrands,
    teacherInputs,
    nextStep,
    previousStep,
    goToStep,
  } = useSchemeWizardStore();

  // Calculate progress
  const steps = ['grade', 'subject', 'term', 'strands', 'inputs', 'preview'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Check if current step is complete
  const isStepComplete = () => {
    switch (currentStep) {
      case 'grade':
        return selectedGrade !== null;
      case 'subject':
        return selectedSubject !== null;
      case 'term':
        return selectedTerm !== null;
      case 'strands':
        return selectedStrands.length > 0;
      case 'inputs':
        return true; // Optional step
      case 'preview':
        return true;
      default:
        return false;
    }
  };

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 'grade':
        return <GradeSelectionStep />;
      case 'subject':
        return <SubjectSelectionStep />;
      case 'term':
        return <TermSelectionStep />;
      case 'strands':
        return <StrandSelectionStep />;
      case 'inputs':
        return <TeacherInputsStep />;
      case 'preview':
        return <PreviewStep />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStepIndex + 1} of {steps.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <button
              onClick={() => index < currentStepIndex && goToStep(step as any)}
              disabled={index > currentStepIndex}
              className={`flex flex-col items-center gap-1 transition-all ${
                index < currentStepIndex
                  ? 'cursor-pointer hover:opacity-80'
                  : index === currentStepIndex
                  ? 'scale-110'
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  index < currentStepIndex
                    ? 'bg-green-500 text-white'
                    : index === currentStepIndex
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/30'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index < currentStepIndex ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </div>
              <span className="text-xs font-medium hidden sm:block">
                {STEP_TITLES[step as keyof typeof STEP_TITLES]}
              </span>
            </button>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 transition-colors ${
                  index < currentStepIndex ? 'bg-green-500' : 'bg-muted'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <CardTitle>{STEP_TITLES[currentStep]}</CardTitle>
          <CardDescription>{STEP_DESCRIPTIONS[currentStep]}</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[400px]">
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={previousStep}
          disabled={currentStepIndex === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <Button
          onClick={nextStep}
          disabled={!isStepComplete() || currentStepIndex === steps.length - 1}
        >
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

