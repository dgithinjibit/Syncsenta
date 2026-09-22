'use client';

/**
 * Term Selection Step
 * Step 3: Select academic term (Term 1, 2, or 3)
 */

import React from 'react';
import { useSchemeWizardStore } from '@/stores/scheme-wizard-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Calendar } from 'lucide-react';
import type { Term } from '@/types/curriculum';

const TERMS: { value: Term; label: string; description: string; months: string }[] = [
  {
    value: 'Term1',
    label: 'Term 1',
    description: 'First term of the academic year',
    months: 'January - April',
  },
  {
    value: 'Term2',
    label: 'Term 2',
    description: 'Second term of the academic year',
    months: 'May - August',
  },
  {
    value: 'Term3',
    label: 'Term 3',
    description: 'Third term of the academic year',
    months: 'September - November',
  },
];

export function TermSelectionStep() {
  const { selectedTerm, setTerm, nextStep } = useSchemeWizardStore();

  const handleTermSelect = (term: Term) => {
    setTerm(term);
    setTimeout(() => nextStep(), 300);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select which term this scheme of work will cover.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TERMS.map((term) => (
          <Card
            key={term.value}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedTerm === term.value
                ? 'border-primary bg-primary/5 ring-2 ring-primary'
                : 'hover:border-primary/50'
            }`}
            onClick={() => handleTermSelect(term.value)}
          >
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-start justify-between">
                <Calendar className="h-8 w-8 text-primary" />
                {selectedTerm === term.value && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </div>

              <div>
                <h3 className="font-bold text-lg">{term.label}</h3>
                <p className="text-sm text-muted-foreground">{term.description}</p>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground">
                  {term.months}
                </p>
                <p className="text-xs text-muted-foreground">13 weeks</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Each CBC term is 13 weeks long. The scheme will be generated
          to cover the full term with appropriate pacing and distribution of content.
        </p>
      </div>
    </div>
  );
}

