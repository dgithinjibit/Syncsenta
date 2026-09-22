'use client';

/**
 * Subject Selection Step
 * Step 2: Select subject with indigenous language support
 */

import React, { useState } from 'react';
import { useSchemeWizardStore } from '@/stores/scheme-wizard-store';
import { getSubjectsForGrade } from '@/data/curriculum';
import { INDIGENOUS_LANGUAGES, type IndigenousLanguage } from '@/types/curriculum';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, Languages } from 'lucide-react';

export function SubjectSelectionStep() {
  const {
    selectedGrade,
    selectedSubject,
    selectedIndigenousLanguage,
    setSubject,
    nextStep,
  } = useSchemeWizardStore();

  const [tempIndigenousLanguage, setTempIndigenousLanguage] = useState<IndigenousLanguage | null>(
    selectedIndigenousLanguage
  );

  const subjects = selectedGrade ? getSubjectsForGrade(selectedGrade) : [];

  const handleSubjectSelect = (subject: string) => {
    if (subject === 'Indigenous Language') {
      // Don't auto-advance, wait for language selection
      setSubject(subject, tempIndigenousLanguage || undefined);
    } else {
      setSubject(subject);
      setTimeout(() => nextStep(), 300);
    }
  };

  const handleIndigenousLanguageSelect = (language: string) => {
    const lang = language as IndigenousLanguage;
    setTempIndigenousLanguage(lang);
    setSubject('Indigenous Language', lang);
  };

  const handleContinue = () => {
    if (selectedSubject === 'Indigenous Language' && tempIndigenousLanguage) {
      nextStep();
    }
  };

  if (!selectedGrade) {
    return (
      <div className="text-center text-muted-foreground">
        Please select a grade first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Select the subject you want to create a scheme of work for.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {subjects.map((subject) => (
          <Button
            key={subject.name}
            variant={selectedSubject === subject.name ? 'default' : 'outline'}
            className="h-16 text-left justify-start relative"
            onClick={() => handleSubjectSelect(subject.name)}
          >
            <div className="flex-1">
              <div className="font-semibold">{subject.name}</div>
              <div className="text-xs opacity-70 capitalize">{subject.category}</div>
            </div>
            {selectedSubject === subject.name && (
              <CheckCircle2 className="h-5 w-5 ml-2" />
            )}
          </Button>
        ))}
      </div>

      {/* Indigenous Language Selection */}
      {selectedSubject === 'Indigenous Language' && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Languages className="h-5 w-5" />
              <Label className="text-base font-semibold">
                Select Indigenous Language
              </Label>
            </div>

            <Select
              value={tempIndigenousLanguage || ''}
              onValueChange={handleIndigenousLanguageSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a language..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {INDIGENOUS_LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {tempIndigenousLanguage && (
              <Button onClick={handleContinue} className="w-full">
                Continue with {tempIndigenousLanguage}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

