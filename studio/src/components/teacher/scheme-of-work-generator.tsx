"use client"

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, BookOpen, Download, Calendar } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getSubjectsForGrade } from '@/data/curriculum'
import { buildApiUrl, API_ENDPOINTS } from '@/lib/api-config'
import { fetchWithRetry } from '@/lib/network-utils'
import { debounce } from '@/lib/performance-utils'

// CBC level → grade map. Kept in sync with the student-side journey wizard
// (src/app/student/journey/page.tsx). Values are the display strings the
// backend (LessonArchitectAgent) expects, so no transformation is needed
// before posting.
const CBC_LEVELS: { id: string; label: string; grades: string[] }[] = [
  { id: 'lower-primary',    label: 'Lower Primary',    grades: ['Grade 1', 'Grade 2', 'Grade 3'] },
  { id: 'upper-primary',    label: 'Upper Primary',    grades: ['Grade 4', 'Grade 5', 'Grade 6'] },
  { id: 'junior-secondary', label: 'Junior Secondary', grades: ['Grade 7', 'Grade 8', 'Grade 9'] },
]
import SchemePreview from '@/components/scheme-wizard/scheme-preview'
import LessonPlanDialog from '@/components/scheme-wizard/lesson-plan-dialog'
import { UnpackedOutcomeRenderer } from './unpacked-outcome-renderer'
import { ExportTrainingDataButton } from './export-training-data-button'
import { FeedbackWidget } from '@/components/teacher/feedback-widget'
import type { SchemeRow } from '@/types/curriculum'

// Stopgap teacher identity. Until real auth lands, persist a single ID per
// browser so the generate (save) and list paths agree. Replace with the
// authenticated user's ID once auth context is wired in.
function getTeacherId(): string {
  // Guard against SSR - return placeholder that will be replaced on client
  if (typeof window === 'undefined') return ''
  
  const KEY = 'syncsenta:teacherId'
  let id = window.localStorage.getItem(KEY)
  if (!id) {
    id = `teacher_${Math.random().toString(36).slice(2, 10)}`
    window.localStorage.setItem(KEY, id)
  }
  return id
}

export function SchemeOfWorkGenerator() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [schemeRows, setSchemeRows] = useState<SchemeRow[]>([])
  const [lessonPlanRow, setLessonPlanRow] = useState<SchemeRow | null>(null)
  const [unpackDialogOpen, setUnpackDialogOpen] = useState(false)
  const [unpackedOutcome, setUnpackedOutcome] = useState<any>(null)
  const [unpacking, setUnpacking] = useState(false)
  const [originalOutcome, setOriginalOutcome] = useState('')
  const [currentSchemeId, setCurrentSchemeId] = useState<string | null>(null)

  // Form states
  const [level, setLevel] = useState('')
  const [grade, setGrade] = useState('')
  const [subject, setSubject] = useState('')
  const [term, setTerm] = useState('Term 1')

  // Dropdown options. Drive these from the static CBC_LEVELS map and the
  // Drive dropdowns from the static CBC_LEVELS map and getSubjectsForGrade().
  // Do NOT use Object.keys(curriculumData) — curriculumData is a lazy Proxy
  // whose target is an empty object, so Object.keys() always returns [].
  const levels = CBC_LEVELS
  const grades = level ? (CBC_LEVELS.find(l => l.id === level)?.grades ?? []) : []
  const subjects = grade ? getSubjectsForGrade(grade) : []

  const generateScheme = useCallback(async () => {
    if (!level || !grade || !subject || !term) {
      toast({
        title: 'Missing Information',
        description: 'Please select level, grade, subject, and term',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    setSchemeRows([])
    setCurrentSchemeId(null)

    try {
      const teacherId = getTeacherId()

      const language = subject.toLowerCase().includes('kiswahili') ? 'kiswahili' : 'english'

      // Use fetchWithRetry to handle network errors
      const response = await fetchWithRetry(
        buildApiUrl(API_ENDPOINTS.LESSON_ARCHITECT_GENERATE_SCHEME),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teacher_id: teacherId,
            grade,
            subject,
            term,
            mode: 'standard',
            language,
          }),
          maxRetries: 3,
          retryDelay: 2000,
          timeout: 60000, // 60 second timeout for generation
          onRetry: (attempt, error) => {
            toast({
              title: `Retrying... (Attempt ${attempt}/3)`,
              description: 'Network issue detected. Retrying request...',
            })
          }
        }
      )

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || err.error || 'Failed to generate scheme of work')
      }

      const data = await response.json()
      const rows: SchemeRow[] = Array.isArray(data?.rows) ? data.rows : []

      if (!rows.length) {
        throw new Error('Generation returned no rows')
      }

      setSchemeRows(rows)
      setCurrentSchemeId(data.scheme_id || null)

      toast({
        title: 'Scheme of Work Generated & Saved!',
        description: `${rows.length}-lesson CBC scheme saved to your dashboard. Switch to "Lesson Plans from Scheme" tab to create lesson plans.`,
      })

      // Log success for debugging
      console.log('Scheme saved successfully:', {
        scheme_id: data.scheme_id,
        rows: rows.length,
        grade,
        subject,
        term
      })
    } catch (error) {
      console.error('Generation error:', error)
      
      // Extract error message
      let errorMessage = 'Please try again'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      // Check if it's a rate limit error
      const isRateLimit = errorMessage.toLowerCase().includes('rate limit') || 
                          errorMessage.includes('429')
      
      toast({
        title: isRateLimit ? 'Rate Limit Reached' : 'Generation Failed',
        description: isRateLimit 
          ? 'The AI service is temporarily at capacity. Please wait 2-3 minutes and try again. The system will automatically use backup models.'
          : errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [level, grade, subject, term, toast])

  // Debounced version to prevent double-clicks
  const debouncedGenerateScheme = useCallback(
    debounce(generateScheme, 500),
    [generateScheme]
  )

  const downloadAsJson = () => {
    const blob = new Blob([JSON.stringify(schemeRows, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scheme-of-work-${grade}-${subject}-${term}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: 'Downloaded!',
      description: 'Scheme of work saved as JSON',
    })
  }

  const handleUnpackOutcome = async (row: SchemeRow) => {
    const outcome =
      row.specificLearningOutcome ||
      row.subStrand ||
      row.strand ||
      ''

    if (!outcome.trim()) {
      toast({
        title: 'No outcome found',
        description: 'This row does not contain a specific learning outcome to unpack.',
        variant: 'destructive',
      })
      return
    }

    setOriginalOutcome(outcome)
    setUnpacking(true)
    setUnpackedOutcome(null)
    setUnpackDialogOpen(true)

    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.LESSON_ARCHITECT_UNPACK_OUTCOME), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: getTeacherId(),
          outcome,
          grade,
          subject,
          language: subject.toLowerCase().includes('kiswahili') ? 'kiswahili' : 'english',
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || err.error || 'Failed to unpack outcome')
      }

      const data = await response.json()
      setUnpackedOutcome(data.unpacked)
    } catch (error) {
      console.error('Unpack error:', error)
      toast({
        title: 'Unpack Failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      })
      setUnpackDialogOpen(false)
    } finally {
      setUnpacking(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Input Form */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheme Details
          </CardTitle>
          <CardDescription>Select grade, subject, and term</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Level *</Label>
            <Select value={level} onValueChange={(val) => {
              setLevel(val)
              setGrade('')
              setSubject('')
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {levels.map(l => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Grade *</Label>
            <Select value={grade} onValueChange={(val) => {
              setGrade(val)
              setSubject('')
            }} disabled={!level}>
              <SelectTrigger>
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {grades.map(g => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subject *</Label>
            <Select value={subject} onValueChange={setSubject} disabled={!grade}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(s => (
                  <SelectItem key={s.name} value={s.name}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Term *</Label>
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Term 1">Term 1</SelectItem>
                <SelectItem value="Term 2">Term 2</SelectItem>
                <SelectItem value="Term 3">Term 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 space-y-3">
            <Button
              onClick={debouncedGenerateScheme}
              disabled={loading || !level || !grade || !subject}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating 13-Week Scheme...
                </>
              ) : (
                <>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Generate Scheme of Work
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              This will create a comprehensive 13-week scheme aligned with CBC curriculum
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Generated Scheme */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Generated Scheme of Work</CardTitle>
              <CardDescription>
                {schemeRows.length
                  ? `${schemeRows.length}-lesson scheme ready!`
                  : 'Your scheme will appear here'}
              </CardDescription>
            </div>
            {schemeRows.length > 0 && (
              <div className="flex gap-2">
                <ExportTrainingDataButton
                  schemeId={currentSchemeId || undefined}
                  teacherId={getTeacherId()}
                  variant="outline"
                  size="sm"
                />
                <Button variant="outline" size="sm" onClick={downloadAsJson}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Generating your scheme...</p>
              <p className="text-sm text-muted-foreground">This may take 30-60 seconds</p>
            </div>
          ) : schemeRows.length > 0 ? (
            <div className="h-[600px] overflow-auto">
              <SchemePreview
                rows={schemeRows}
                subject={subject}
                grade={grade}
                term={term}
                onGenerateLessonPlan={(row) => setLessonPlanRow(row)}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <Calendar className="h-16 w-16 text-muted-foreground" />
              <div>
                <h3 className="font-semibold mb-2">Ready to Generate</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Select your grade, subject, and term to generate a comprehensive 13-week Scheme of Work aligned with CBC curriculum
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  📚 Using comprehensive KICD curriculum data
                </p>
              </div>
            </div>
          )}
          {currentSchemeId && schemeRows.length > 0 && (
            <FeedbackWidget
              contentType="scheme"
              contentId={currentSchemeId}
              context={{ grade, subject, term, language: subject.toLowerCase().includes('kiswahili') ? 'kiswahili' : 'english' }}
              className="mt-4 border-t pt-4"
            />
          )}
        </CardContent>
      </Card>

      {lessonPlanRow && (
        <LessonPlanDialog
          open={!!lessonPlanRow}
          onOpenChange={(v) => {
            if (!v) setLessonPlanRow(null)
          }}
          row={lessonPlanRow}
          grade={grade}
          subject={subject}
          term={term}
        />
      )}

      <Dialog open={unpackDialogOpen} onOpenChange={setUnpackDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Unpacked Learning Outcome</DialogTitle>
            <DialogDescription>
              {unpackedOutcome
                ? 'Review the I-Can statements and success criteria derived from this outcome.'
                : unpacking
                ? 'Generating measurable learning statements...'
                : 'No outcome selected.'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] py-4">
            {unpacking ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Unpacking outcome…</span>
              </div>
            ) : unpackedOutcome ? (
              <UnpackedOutcomeRenderer
                unpackedOutcome={unpackedOutcome}
                originalOutcome={originalOutcome}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a specific learning outcome from the scheme to unpack it into measurable statements.
              </p>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setUnpackDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
