/**
 * SchemePreview Component
 * 
 * Renders a complete scheme of work in a formatted table with CBC column headers
 * in both English and Kiswahili. Supports read-only mode for students.
 * 
 * Requirements: 5.1
 */

import React from 'react';
import { SchemeRow, SCHEME_COLUMN_HEADERS } from '@/types/curriculum';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';

interface SchemePreviewProps {
  rows: SchemeRow[];
  subject: string;
  grade: string;
  term: string;
  readOnly?: boolean;
  onGenerateLessonPlan?: (row: SchemeRow, index: number) => void;
}

/**
 * Kiswahili subjects that should use Kiswahili column headers
 */
const KISWAHILI_SUBJECTS = [
  'Kiswahili',
  'Kiswahili Language Activities',
  'Lugha ya Kiswahili',
];

/**
 * Check if a subject should use Kiswahili headers
 */
function isKiswahiliSubject(subject: string): boolean {
  return KISWAHILI_SUBJECTS.some(
    (kswSubject) => subject.toLowerCase().includes(kswSubject.toLowerCase())
  );
}

export default function SchemePreview({
  rows,
  subject,
  grade,
  term,
  readOnly = false,
  onGenerateLessonPlan,
}: SchemePreviewProps) {
  const useKiswahili = isKiswahiliSubject(subject);
  const lang = useKiswahili ? 'sw' : 'en';

  // Build column headers array
  const headers = [
    SCHEME_COLUMN_HEADERS.week[lang],
    SCHEME_COLUMN_HEADERS.lesson[lang],
    SCHEME_COLUMN_HEADERS.strand[lang],
    SCHEME_COLUMN_HEADERS.subStrand[lang],
    SCHEME_COLUMN_HEADERS.specificLearningOutcome[lang],
    SCHEME_COLUMN_HEADERS.learningExperiences[lang],
    SCHEME_COLUMN_HEADERS.keyInquiryQuestion[lang],
    SCHEME_COLUMN_HEADERS.learningResources[lang],
    SCHEME_COLUMN_HEADERS.assessmentMethods[lang],
    SCHEME_COLUMN_HEADERS.reflection[lang],
  ];

  // Add lesson plan column if not read-only
  if (!readOnly && onGenerateLessonPlan) {
    headers.push(useKiswahili ? 'Mpango wa Somo' : 'Lesson Plan');
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h3 className="font-serif text-lg font-bold text-foreground">
          {useKiswahili ? 'Mpango wa Kazi' : 'Scheme of Work'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {grade} — {subject} — {term}
        </p>
        <p className="text-xs text-muted-foreground">
          {useKiswahili ? 'Mtaala wa CBC - KICD Kenya' : 'CBC Curriculum — KICD Kenya'}
        </p>
      </div>

      {/* Table */}
      <div className="w-full rounded-lg border border-border">
        <div className="overflow-x-auto overflow-y-hidden pb-2">
          <table className="min-w-[1400px] w-full text-sm">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th
                    key={index}
                    className="bg-primary text-primary-foreground px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={index}
                  className={index % 2 === 0 ? 'bg-card' : 'bg-muted/50'}
                >
                  <td className="px-3 py-2 text-xs align-top border-b border-border min-w-[40px] font-medium">
                    {row.week}
                  </td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border min-w-[40px]">
                    {row.lesson}
                  </td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border min-w-[120px] font-medium">
                    {row.strand}
                  </td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border min-w-[130px]">
                    {row.subStrand}
                  </td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border whitespace-pre-line min-w-[220px]">
                    {row.specificLearningOutcome}
                  </td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border whitespace-pre-line min-w-[220px]">
                    {row.learningExperiences}
                  </td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border whitespace-pre-line min-w-[150px]">
                    {row.keyInquiryQuestion}
                  </td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border min-w-[150px]">
                    {row.learningResources}
                  </td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border min-w-[120px]">
                    {row.assessmentMethods}
                  </td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border min-w-[60px]">
                    {row.reflection || '—'}
                  </td>
                  {!readOnly && onGenerateLessonPlan && (
                    <td className="px-3 py-2 text-xs align-top border-b border-border min-w-[100px]">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onGenerateLessonPlan(row, index)}
                        className="h-7 gap-1"
                      >
                        <BookOpen className="h-3 w-3" />
                        {useKiswahili ? 'Tengeneza' : 'Generate'}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="text-xs text-muted-foreground text-center">
        {useKiswahili
          ? `Jumla ya masomo: ${rows.length} | Wiki: ${Math.max(...rows.map((r) => r.week))}`
          : `Total lessons: ${rows.length} | Weeks: ${Math.max(...rows.map((r) => r.week))}`}
      </div>
    </div>
  );
}
