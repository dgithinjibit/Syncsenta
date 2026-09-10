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
import { FeedbackWidget } from '@/components/teacher/feedback-widget';
import { getSupabaseClient } from '@/lib/supabase/client';
import { saveScheme } from '@/lib/teacher/scheme-v2-client';

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

function escapePrintHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
    savedSchemeId,
    setSaving,
    setSaveError,
    setSavedSchemeId,
  } = useSchemeWizardStore();

  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [printProfile, setPrintProfile] = useState({ teacherName: '', schoolName: '' });

  useEffect(() => {
    let active = true;
    const loadPrintProfile = async () => {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, school_name')
        .eq('id', user.id)
        .maybeSingle();
      if (active) {
        setPrintProfile({
          teacherName: data?.full_name || user.user_metadata?.full_name || user.email || '',
          schoolName: data?.school_name || user.user_metadata?.school_name || '',
        });
      }
    };
    void loadPrintProfile();
    return () => { active = false; };
  }, []);

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
      const teacherId = getLocalTeacherId();
      const payload = {
        teacher_id: teacherId,
        grade: selectedGrade,
        subject: selectedSubject,
        term: selectedTerm?.replace(/^Term([1-3])$/, 'Term $1'),
        strands: selectedStrands,
        teacherInputs,
        language: selectedSubject?.toLowerCase().includes('kiswahili') ? 'kiswahili' : 'english',
      };

      // Call backend API for scheme generation
      const response = await fetch('/api/generate/scheme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error.detail || error.error || 'Failed to generate scheme');
      }

      const data = await response.json();
      setGeneratedScheme({
        id: data.scheme_id,
        title: data.title,
        rows: data.rows || [],
      });
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

    // Show immediate feedback
    toast({
      title: 'Preparing Export',
      description: 'Generating your DOCX file...',
    });

    try {
      // Use setTimeout to make export non-blocking
      await new Promise<void>((resolve, reject) => {
        setTimeout(async () => {
          try {
            await exportSchemeToDocx(
              generatedScheme.rows as SchemeRow[],
              selectedGrade || 'Unknown Grade',
              selectedSubject || 'Unknown Subject',
              selectedTerm || 'Unknown Term',
              undefined,
              undefined
            );
            resolve();
          } catch (error) {
            reject(error);
          }
        }, 0);
      });

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
    if (!selectedGrade || !selectedSubject || !selectedTerm || !rows?.length) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Print preview blocked',
        description: 'Allow pop-ups for SyncSenta, then try Print / PDF again.',
        variant: 'destructive',
      });
      return;
    }

    const printRows = rows.map((row: any) => `
      <tr>
        <td>${escapePrintHtml(row.week)}</td>
        <td>${escapePrintHtml(row.lesson)}</td>
        <td>${escapePrintHtml(row.strand)}</td>
        <td>${escapePrintHtml(row.subStrand)}</td>
        <td>${escapePrintHtml(row.specificLearningOutcome)}</td>
        <td>${escapePrintHtml(row.learningExperiences)}</td>
        <td>${escapePrintHtml(row.keyInquiryQuestion)}</td>
        <td>${escapePrintHtml(row.learningResources)}</td>
        <td>${escapePrintHtml(row.assessmentMethods)}</td>
        <td class="reflection-cell">${escapePrintHtml(row.reflection) || '&nbsp;'}</td>
      </tr>`).join('');

    const title = isKiswahili ? 'Mpango wa Kazi' : 'Scheme of Work';
    const labels = isKiswahili
      ? ['Wiki', 'Somo', 'Mada', 'Mada Ndogo', 'Matokeo Maalum', 'Shughuli za Ujifunzaji', 'Swali Dadisi', 'Vifaa vya Kujifunzia', 'Tathmini', 'Tafakari']
      : ['Week', 'Lesson', 'Strand', 'Sub-Strand', 'Specific Learning Outcome', 'Learning Experiences', 'Key Inquiry Question', 'Learning Resources', 'Assessment Methods', 'Reflection'];

    printWindow.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>${escapePrintHtml(title)} - ${escapePrintHtml(selectedSubject)}</title>
<style>
  @page { size: landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 8pt; }
  .print-sheet { width: 100%; }
  .brand { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 7px; margin-bottom: 8px; }
  h1 { font-size: 16pt; margin: 0 0 3px; }
  .subtitle { font-size: 8pt; color: #444; }
  .meta { width: 100%; border-collapse: collapse; margin: 6px 0 9px; table-layout: fixed; }
  .meta td { border: 1px solid #777; padding: 4px 5px; vertical-align: top; }
  .meta .label { width: 11%; font-weight: 700; background: #f0f0f0; }
  .meta .value { width: 22%; }
  .scheme { width: 100%; border-collapse: collapse; table-layout: fixed; page-break-inside: auto; }
  .scheme th, .scheme td { border: 1px solid #555; padding: 3px 4px; vertical-align: top; overflow-wrap: anywhere; }
  .scheme th { background: #e6e6e6; font-size: 7pt; line-height: 1.12; }
  .scheme td { font-size: 7pt; line-height: 1.15; }
  .scheme tr { page-break-inside: avoid; page-break-after: auto; }
  .scheme th:nth-child(1), .scheme td:nth-child(1) { width: 3%; text-align: center; }
  .scheme th:nth-child(2), .scheme td:nth-child(2) { width: 4%; text-align: center; }
  .scheme th:nth-child(3), .scheme td:nth-child(3) { width: 9%; }
  .scheme th:nth-child(4), .scheme td:nth-child(4) { width: 10%; }
  .scheme th:nth-child(5), .scheme td:nth-child(5) { width: 15%; }
  .scheme th:nth-child(6), .scheme td:nth-child(6) { width: 15%; }
  .scheme th:nth-child(7), .scheme td:nth-child(7) { width: 12%; }
  .scheme th:nth-child(8), .scheme td:nth-child(8) { width: 11%; }
  .scheme th:nth-child(9), .scheme td:nth-child(9) { width: 9%; }
  .scheme th:nth-child(10), .scheme td:nth-child(10) { width: 12%; }
  .reflection-cell { min-height: 28px; }
  .footer { margin-top: 8px; display: flex; justify-content: space-between; font-size: 7pt; color: #555; }
</style></head><body><main class="print-sheet">
  <header class="brand"><div><h1>${escapePrintHtml(title)}</h1><div class="subtitle">CBC Curriculum — KICD Kenya</div></div><div class="subtitle">Generated ${escapePrintHtml(new Date().toLocaleDateString('en-KE'))}</div></header>
  <table class="meta"><tr><td class="label">Teacher</td><td class="value">${escapePrintHtml(printProfile.teacherName) || '&nbsp;'}</td><td class="label">School</td><td class="value">${escapePrintHtml(printProfile.schoolName) || '&nbsp;'}</td><td class="label">Grade</td><td class="value">${escapePrintHtml(selectedGrade)}</td></tr><tr><td class="label">Subject</td><td class="value">${escapePrintHtml(selectedSubject)}</td><td class="label">Term</td><td class="value">${escapePrintHtml(selectedTerm)}</td><td class="label">Lessons</td><td class="value">${escapePrintHtml(rows.length)}</td></tr></table>
  <table class="scheme"><thead><tr>${labels.map((label) => `<th>${escapePrintHtml(label)}</th>`).join('')}</tr></thead><tbody>${printRows}</tbody></table>
  <div class="footer"><span>Teacher signature: ______________________________</span><span>Head of school: ______________________________</span><span>Page <span class="pageNumber"></span></span></div>
</main></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 350);
  };

  const handleSave = async () => {
    if (!generatedScheme?.rows?.length || !selectedGrade || !selectedSubject || !selectedTerm) return;

    setSaving(true);
    setSaveError(null);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please sign in before saving a scheme to your library.');
      }

      const response = await saveScheme({
        teacher_id: session.user.id,
        grade: selectedGrade,
        subject: selectedSubject,
        term: selectedTerm,
        scheme_rows: generatedScheme.rows as SchemeRow[],
        teacher_inputs: {
          keyInquiryQuestions: teacherInputs.keyInquiryQuestions ? [teacherInputs.keyInquiryQuestions] : [],
          learningOutcomes: teacherInputs.learningOutcomes ? [teacherInputs.learningOutcomes] : [],
          learningExperiences: teacherInputs.learningExperiences ? [teacherInputs.learningExperiences] : [],
          learningResources: teacherInputs.learningResources ? [teacherInputs.learningResources] : [],
          assessmentMethods: teacherInputs.assessmentMethods ? [teacherInputs.assessmentMethods] : [],
        },
        curriculum_ref: `${selectedGrade}-${selectedSubject}-${selectedTerm}`,
        version: 1,
      }, session.access_token);

      setSavedSchemeId(response.id);
      toast({
        title: 'Scheme saved to library',
        description: `Saved with library ID ${response.id}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save scheme.';
      setSaveError(message);
      toast({ title: 'Save failed', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
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
          <span>Powered by SyncSenta</span>
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
        <Button onClick={handleSave} size="lg" disabled={!!savedSchemeId}>
          <FileText className="mr-2 h-4 w-4" />
          {savedSchemeId ? 'Saved to Library' : 'Save to Library'}
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
      </div>

      {/* Feedback Widget */}
      {generatedScheme?.id && (
        <FeedbackWidget
          contentType="scheme"
          contentId={generatedScheme.id}
          context={{
            grade: selectedGrade,
            subject: selectedSubject,
            term: selectedTerm,
            strands: selectedStrands,
          }}
          className="border-t pt-4"
        />
      )}

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
            <div className="w-full rounded-lg border overflow-hidden">
              <div className="overflow-x-auto overflow-y-visible">
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

function getLocalTeacherId(): string {
  if (typeof window === 'undefined') return 'teacher_local';
  const key = 'syncsenta:teacherId';
  let teacherId = window.localStorage.getItem(key);
  if (!teacherId) {
    teacherId = `teacher_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    window.localStorage.setItem(key, teacherId);
  }
  return teacherId;
}
