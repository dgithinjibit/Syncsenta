'use client';

/**
 * Strand Selection Step
 * Step 4: Select strands and sub-strands with term allocation or weekly distribution
 */

import React, { useState, useEffect } from 'react';
import { useSchemeWizardStore } from '@/stores/scheme-wizard-store';
import {
  getHardcodedStrands,
  getTermAllocation,
  getWeeklyDistribution,
  getSubjectsForGrade,
} from '@/data/curriculum';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, BookOpen, Calendar } from 'lucide-react';
import type { StrandSelection } from '@/stores/scheme-wizard-store';

export function StrandSelectionStep() {
  const {
    selectedGrade,
    selectedSubject,
    selectedTerm,
    selectedStrands,
    useWeeklyMode,
    setStrands,
    setWeeklyMode,
    nextStep,
  } = useSchemeWizardStore();

  const [localStrands, setLocalStrands] = useState<StrandSelection[]>(selectedStrands);
  const [error, setError] = useState<string | null>(null);

  // Determine if this is a language subject
  const isLanguageSubject = selectedSubject && selectedGrade
    ? getSubjectsForGrade(selectedGrade).find(s => s.name === selectedSubject)?.category === 'language'
    : false;

  // Get available strands
  const availableStrands = selectedGrade && selectedSubject
    ? getHardcodedStrands(selectedGrade, selectedSubject)
    : [];

  // Initialize with term allocation or weekly distribution
  useEffect(() => {
    if (!selectedGrade || !selectedSubject || !selectedTerm) return;

    if (isLanguageSubject) {
      // Weekly mode for language subjects
      setWeeklyMode(true);
      const distribution = getWeeklyDistribution(selectedGrade, selectedSubject, selectedTerm);
      
      if (distribution.length > 0) {
        // Group by strand and sub-strand
        const strandMap = new Map<string, Set<string>>();
        
        distribution.forEach(d => {
          if (!strandMap.has(d.strand)) {
            strandMap.set(d.strand, new Set());
          }
          strandMap.get(d.strand)!.add(d.subStrand);
        });
        
        const initialStrands: StrandSelection[] = Array.from(strandMap.entries()).map(([strand, subStrands]) => ({
          strand,
          subStrands: Array.from(subStrands),
          weeks: 13, // Full term for language subjects
        }));
        
        setLocalStrands(initialStrands);
      }
    } else {
      // Term allocation mode for non-language subjects
      setWeeklyMode(false);
      const allocation = getTermAllocation(selectedGrade, selectedSubject, selectedTerm);
      
      if (allocation) {
        setLocalStrands(allocation.strands);
      }
    }
  }, [selectedGrade, selectedSubject, selectedTerm, isLanguageSubject, setWeeklyMode]);

  const handleStrandToggle = (strandName: string) => {
    const strand = availableStrands.find(s => s.name === strandName);
    if (!strand) return;

    const exists = localStrands.find(s => s.strand === strandName);
    
    if (exists) {
      // Remove strand
      setLocalStrands(localStrands.filter(s => s.strand !== strandName));
    } else {
      // Add strand with all sub-strands
      setLocalStrands([
        ...localStrands,
        {
          strand: strandName,
          subStrands: strand.subStrands.map(ss => ss.name),
          weeks: isLanguageSubject ? 13 : 4, // Default weeks
        },
      ]);
    }
  };

  const handleSubStrandToggle = (strandName: string, subStrandName: string) => {
    setLocalStrands(localStrands.map(s => {
      if (s.strand !== strandName) return s;
      
      const hasSubStrand = s.subStrands.includes(subStrandName);
      
      return {
        ...s,
        subStrands: hasSubStrand
          ? s.subStrands.filter(ss => ss !== subStrandName)
          : [...s.subStrands, subStrandName],
      };
    }));
  };

  const handleWeeksChange = (strandName: string, weeks: number) => {
    setLocalStrands(localStrands.map(s => 
      s.strand === strandName ? { ...s, weeks } : s
    ));
  };

  const handleContinue = () => {
    // Validation
    if (localStrands.length === 0) {
      setError('Please select at least one strand');
      return;
    }

    const hasEmptySubStrands = localStrands.some(s => s.subStrands.length === 0);
    if (hasEmptySubStrands) {
      setError('Each selected strand must have at least one sub-strand');
      return;
    }

    if (!isLanguageSubject) {
      const totalWeeks = localStrands.reduce((sum, s) => sum + s.weeks, 0);
      if (totalWeeks > 13) {
        setError('Total weeks cannot exceed 13 (one term)');
        return;
      }
    }

    setError(null);
    setStrands(localStrands);
    nextStep();
  };

  if (!selectedGrade || !selectedSubject || !selectedTerm) {
    return (
      <div className="text-center text-muted-foreground">
        Please complete previous steps first.
      </div>
    );
  }

  if (availableStrands.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No curriculum data available for {selectedGrade} {selectedSubject}.
          Please contact support.
        </AlertDescription>
      </Alert>
    );
  }

  const totalWeeks = localStrands.reduce((sum, s) => sum + s.weeks, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Select the strands and sub-strands you want to cover in {selectedTerm}.
          </p>
          {!isLanguageSubject && (
            <p className="text-xs text-muted-foreground mt-1">
              Allocate weeks for each strand (total: {totalWeeks}/13 weeks)
            </p>
          )}
        </div>
        
        <Badge variant={isLanguageSubject ? 'default' : 'secondary'}>
          {isLanguageSubject ? (
            <>
              <Calendar className="h-3 w-3 mr-1" />
              Weekly Mode
            </>
          ) : (
            <>
              <BookOpen className="h-3 w-3 mr-1" />
              Term Mode
            </>
          )}
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {availableStrands.map((strand) => {
          const isSelected = localStrands.some(s => s.strand === strand.name);
          const selectedStrand = localStrands.find(s => s.strand === strand.name);

          return (
            <Card
              key={strand.name}
              className={`transition-all ${
                isSelected ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Checkbox
                      id={`strand-${strand.name}`}
                      checked={isSelected}
                      onCheckedChange={() => handleStrandToggle(strand.name)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`strand-${strand.name}`}
                        className="text-base font-semibold cursor-pointer"
                      >
                        {strand.name}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {strand.description}
                      </p>
                    </div>
                  </div>

                  {isSelected && !isLanguageSubject && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`weeks-${strand.name}`} className="text-sm">
                        Weeks:
                      </Label>
                      <Input
                        id={`weeks-${strand.name}`}
                        type="number"
                        min="1"
                        max="13"
                        value={selectedStrand?.weeks || 4}
                        onChange={(e) => handleWeeksChange(strand.name, parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                    </div>
                  )}
                </div>
              </CardHeader>

              {isSelected && (
                <CardContent className="pt-0">
                  <div className="pl-8 space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Sub-strands:
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {strand.subStrands.map((subStrand) => {
                        const isSubStrandSelected = selectedStrand?.subStrands.includes(subStrand.name);

                        return (
                          <div
                            key={subStrand.name}
                            className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50"
                          >
                            <Checkbox
                              id={`substrand-${strand.name}-${subStrand.name}`}
                              checked={isSubStrandSelected}
                              onCheckedChange={() => handleSubStrandToggle(strand.name, subStrand.name)}
                            />
                            <Label
                              htmlFor={`substrand-${strand.name}-${subStrand.name}`}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {subStrand.name}
                            </Label>
                            {isSubStrandSelected && (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          {localStrands.length} strand{localStrands.length !== 1 ? 's' : ''} selected
          {!isLanguageSubject && ` • ${totalWeeks}/13 weeks allocated`}
        </div>
        
        <Button
          onClick={handleContinue}
          disabled={localStrands.length === 0}
          size="lg"
        >
          Continue to Teacher Inputs
        </Button>
      </div>
    </div>
  );
}
