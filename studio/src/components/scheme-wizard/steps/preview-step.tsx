'use client';

/**
 * Preview Step
 * Step 6: Generate and preview the complete scheme
 */

import React, { useEffect, useState } from 'react';
import { useSchemeWizardStore } from '@/stores/scheme-wizard-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Download, FileText, Sparkles, CheckCircle2 } from 'lucide-react';
import { exportSchemeToDocx, type SchemeRow } from '@/lib/export-docx';
import { useToast } from '@/hooks/use-toast';

// Column headers for CBC scheme of work
const COLUMN_HEADERS_EN = [
  'Week',
  'Lesson',
  'Strand',
  'Sub-Strand',
  'Specific Learning Outcome',
  'Learning Experiences',
  'Key Inquiry Question',
  'Learning Resources',
  'Assessment Methods',
  'Reflection',
];

const COLUMN_HEADERS_SW = [
  'Wiki',
  'Somo',
  'Mada',
  'Mada Ndogo',
  'Matokeo Maalum',
  'Shughuli za Ujifunzaji',
  'Swali Dadisi',
  'Vifaa vya Kujifunzia',
  'Tathmini',
  'Tafakari',
];

export function PreviewStep() {
  const {
    selectedGrade,
    selectedSubject,
    selectedTerm,
    selectedStrands,
    teacherInputs,
    generatedScheme,
    isGenerating,
    generationError,
    setGenerating,
    setGeneratedScheme,
    setGenerationError,
  } = useSchemeWizardStore();

  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  // Determine if Kiswahili subject
  const isKiswahili = selectedSubject?.toLowerCase().includes('kiswahili');
  const headers = isKiswahili ? COLUMN_HEADERS_SW : COLUMN_HEADERS_EN;

  // Generate scheme on mount if not already generated
  useEffect(() => {
    if (!generatedScheme && !isGenerating && !generationError) {
      handleGenerate();
    }
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerationError(null);

    try {
      // Prepare request payload
      const payload = {
        grade: selectedGrade,
        subject: selectedSubject,
        term: selectedTerm,
        strands: selectedStrands,
        teacherInputs,
      };

      // Call backend API for scheme generation
      const response = await fetch('/api/v1/schemes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate scheme');
      }

      const data = await response.json();
      setGeneratedScheme(data.scheme);
    } catch (error) {
      console.error('[PreviewStep] Generation error:', error);
      setGenerationError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleExportDOCX = async () => {
    if (!generatedScheme || !generatedScheme.rows || generatedScheme.rows.length === 0) {
      toast({
        title: 'Export Failed',
        description: 'No scheme data available to export',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      await exportSchemeToDocx(
        generatedScheme.rows as SchemeRow[],
        selectedGrade || 'Unknown Grade',
        selectedSubject || 'Unknown Subject',
        selectedTerm || 'Unknown Term',
        teacherInputs?.teacherName,
        teacherInputs?.schoolName
      );

      toast({
        title: 'Export Successful',
        description: 'Your scheme has been downloaded as a DOCX file',
      });
    } catch (error) {
      console.error('[PreviewStep] DOCX export error:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export DOCX',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    // TODO: Implement scheme saving in Task 7.1
    console.log('[PreviewStep] Scheme saving not yet implemented');
  };

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Generating Your Scheme...</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Our AI is creating a CBC-aligned scheme of work based on your selections.
            This may take up to 60 seconds.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span>Powered by GPT-4o</span>
        </div>
      </div>
    );
  }

  if (generationError) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Generation Failed:</strong> {generationError}
          </AlertDescription>
        </Alert>

        <div className="flex justify-center">
          <Button onClick={handleGenerate} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!generatedScheme || !generatedScheme.rows || generatedScheme.rows.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">No Scheme Generated</h3>
          <p className="text-sm text-muted-foreground">
            Click the button below to generate your scheme.
          </p>
        </div>
        <Button onClick={handleGenerate}>
          Generate Scheme
          <Sparkles className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  const rows = generatedScheme.rows;

  return (
    <div className="space-y-6">
      {/* Success message */}
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          <strong>Scheme Generated Successfully!</strong> Your CBC-aligned scheme of work is ready.
          Review it below and export or save when ready.
        </AlertDescription>
      </Alert>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} size="lg">
          <FileText className="mr-2 h-4 w-4" />
          Save to Library
        </Button>
        <Button onClick={handleExportDOCX} variant="outline" disabled={isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export DOCX
            </>
          )}
        </Button>
        <Button onClick={handlePrint} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Print / PDF
        </Button>
        <Button onClick={handleGenerate} variant="ghost">
          Regenerate
        </Button>
      </div>

      {/* Scheme preview */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="text-center space-y-1 pb-4 border-b">
              <h3 className="font-serif text-lg font-bold">
                {isKiswahili ? 'Mpango wa Kazi' : 'Scheme of Work'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedGrade} — {selectedSubject} — {selectedTerm}
              </p>
              <p className="text-xs text-muted-foreground">
                {isKiswahili ? 'Mtaala wa CBC - KICD Kenya' : 'CBC Curriculum — KICD Kenya'}
              </p>
            </div>

            {/* Table */}
            <div className="w-full rounded-lg border">
              <div className="overflow-x-auto">
                <table className="min-w-[1400px] w-full text-sm">
                  <thead>
                    <tr>
                      {headers.map((header) => (
                        <th
                          key={header}
                          className="bg-primary text-primary-foreground px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-card' : 'bg-muted/50'}>
                        <td className="px-3 py-2 text-xs align-top border-b min-w-[40px] font-medium">
                          {row.week}
                        </td>
                        <td className="px-3 py-2 text-xs align-top border-b min-w-[40px]">
                          {row.lesson}
                        </td>
                        <td className="px-3 py-2 text-xs align-top border-b min-w-[120px] font-medium">
                          {row.strand}
                        </td>
                        <td className="px-3 py-2 text-xs align-top border-b min-w-[130px]">
                          {row.subStrand}
                        </td>
                        <td className="px-3 py-2 text-xs align-top border-b whitespace-pre-line min-w-[220px]">
                          {row.specificLearningOutcome}
                        </td>
                        <td className="px-3 py-2 text-xs align-top border-b whitespace-pre-line min-w-[220px]">
                          {row.learningExperiences}
                        </td>
                        <td className="px-3 py-2 text-xs align-top border-b whitespace-pre-line min-w-[220px]">
                          {row.keyInquiryQuestion}
                        </td>
                        <td className="px-3 py-2 text-xs align-top border-b min-w-[150px]">
                          {row.learningResources}
                        </td>
                        <td className="px-3 py-2 text-xs align-top border-b min-w-[120px]">
                          {row.assessmentMethods}
                        </td>
                        <td className="px-3 py-2 text-xs align-top border-b min-w-[60px]">
                          {row.reflection || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer stats */}
            <div className="flex justify-between items-center pt-4 border-t text-sm text-muted-foreground">
              <div>
                Total: {rows.length} lessons across {Math.max(...rows.map((r: any) => r.week))} weeks
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>AI-Generated • CBC-Aligned</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
