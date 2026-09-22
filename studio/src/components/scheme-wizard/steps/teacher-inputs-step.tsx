'use client';

/**
 * Teacher Inputs Step
 * Step 5: Collect teacher inputs for scheme generation
 */

import React, { useState, useEffect } from 'react';
import { useSchemeWizardStore } from '@/stores/scheme-wizard-store';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Sparkles, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function TeacherInputsStep() {
  const {
    teacherInputs,
    setTeacherInputs,
    nextStep,
  } = useSchemeWizardStore();

  const [localInputs, setLocalInputs] = useState(teacherInputs);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalInputs(teacherInputs);
  }, [teacherInputs]);

  const handleInputChange = (field: keyof typeof localInputs, value: string) => {
    setLocalInputs({
      ...localInputs,
      [field]: value,
    });
  };

  const handleContinue = () => {
    // Optional validation - all fields are optional
    // AI will generate content for empty fields
    
    setError(null);
    setTeacherInputs(localInputs);
    nextStep();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Provide guidance for AI-powered scheme generation. All fields are optional - the AI will generate content based on CBC curriculum standards.
        </p>
      </div>

      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          <strong>AI-Powered Generation:</strong> Leave fields empty to let the AI generate CBC-aligned content automatically. Add your own inputs to customize the scheme to your teaching style.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Key Inquiry Questions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Key Inquiry Questions (KIQ)</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Open-ended questions that guide learners' exploration and critical thinking. Example: "How do fractions help us share things fairly?"</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>
              Questions that drive inquiry-based learning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="e.g., How can we use numbers to solve everyday problems?"
              value={localInputs.keyInquiryQuestions || ''}
              onChange={(e) => handleInputChange('keyInquiryQuestions', e.target.value)}
              rows={3}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Learning Outcomes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Specific Learning Outcomes</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>What learners should be able to do by the end of the lesson. Use action verbs: identify, explain, demonstrate, apply.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>
              What learners will be able to do
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="e.g., By the end of this unit, learners should be able to identify and compare fractions..."
              value={localInputs.learningOutcomes || ''}
              onChange={(e) => handleInputChange('learningOutcomes', e.target.value)}
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Learning Experiences */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Suggested Learning Experiences</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Hands-on activities, group work, discussions, and practical tasks that help learners achieve the outcomes.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>
              Activities and experiences for learners
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="e.g., Group activities using real objects, drawing and coloring fractions, sharing food items..."
              value={localInputs.learningExperiences || ''}
              onChange={(e) => handleInputChange('learningExperiences', e.target.value)}
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Learning Resources */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Learning Resources</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Materials and resources needed: textbooks, charts, manipulatives, digital resources, real objects.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>
              Materials and resources needed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="e.g., Mathematics textbook, fraction charts, counters, worksheets, digital fraction games..."
              value={localInputs.learningResources || ''}
              onChange={(e) => handleInputChange('learningResources', e.target.value)}
              rows={3}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Assessment Methods */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Assessment Methods</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>How you will assess learner progress: observation, oral questions, written work, practical tasks, projects.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription>
              How learner progress will be assessed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="e.g., Observation during group work, oral questions, written exercises, practical demonstrations..."
              value={localInputs.assessmentMethods || ''}
              onChange={(e) => handleInputChange('assessmentMethods', e.target.value)}
              rows={3}
              className="resize-none"
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          {Object.values(localInputs).filter(v => v && v.trim()).length} of 5 fields completed
        </div>
        
        <Button
          onClick={handleContinue}
          size="lg"
        >
          Generate Scheme Preview
          <Sparkles className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
