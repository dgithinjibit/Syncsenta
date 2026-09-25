"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, FileText, Calendar, BookOpen, Sparkles, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { buildApiUrl, API_ENDPOINTS } from '@/lib/api-config'
import SchemePreview from '@/components/scheme-wizard/scheme-preview'
import LessonPlanDialog from '@/components/scheme-wizard/lesson-plan-dialog'
import { UnpackedOutcomeRenderer } from './unpacked-outcome-renderer'
import type { SchemeRow } from '@/types/curriculum'

interface SavedScheme {
  scheme_id: string
  title: string
  grade: string
  subject: string
  term: string
  total_weeks: number
  lessons_per_week: number
  rows: SchemeRow[]
  created_at: string
}

export function LessonPlanFromScheme() {
  const { toast } = useToast()
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [schemes, setSchemes] = useState<SavedScheme[]>([])
  const [selectedScheme, setSelectedScheme] = useState<SavedScheme | null>(null)
  const [selectedRow, setSelectedRow] = useState<SchemeRow | null>(null)
  const [lessonPlanDialogOpen, setLessonPlanDialogOpen] = useState(false)
  // Unpack-outcome modal state — same pattern as scheme-of-work-generator
  // so a teacher gets the same affordance whether they're authoring a new
  // scheme or pulling one up to plan a lesson.
  const [unpackDialogOpen, setUnpackDialogOpen] = useState(false)
  const [unpackedOutcome, setUnpackedOutcome] = useState<any>(null)
  const [originalOutcome, setOriginalOutcome] = useState('')
  const [unpacking, setUnpacking] = useState(false)

  useEffect(() => {
    loadSchemes()
  }, [])

  const loadSchemes = async () => {
    setLoading(true)
    try {
      // Guard against SSR
      if (typeof window === 'undefined') {
        setLoading(false)
        return
      }
      
      // Only fetch schemes if user is authenticated
      if (!user?.id) {
        console.warn('No authenticated user found')
        setSchemes([])
        setLoading(false)
        return
      }
      
      const teacherId = user.id
      const response = await fetch(
        `${buildApiUrl(API_ENDPOINTS.LESSON_ARCHITECT_SCHEMES)}?teacher_id=${teacherId}`
      )

      if (!response.ok) {
        throw new Error('Failed to load schemes')
      }

      const data = await response.json()
      setSchemes(data.schemes || [])
    } catch (error) {
      console.error('Failed to load schemes:', error)
      toast({
        title: 'Failed to Load Schemes',
        description: 'Could not load your saved schemes. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateLessonPlan = (row: SchemeRow) => {
    setSelectedRow(row)
    setLessonPlanDialogOpen(true)
  }

  const handleUnpackOutcome = async (row: SchemeRow) => {
    const outcome = row.specificLearningOutcome || row.subStrand || row.strand || ''

    if (!outcome.trim() || !selectedScheme) {
      toast({
        title: 'No outcome found',
        description: 'This row does not contain a specific learning outcome to unpack.',
        variant: 'destructive',
      })
      return
    }

    // Guard against SSR
    if (typeof window === 'undefined') return

    if (!user?.id) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to unpack outcomes.',
        variant: 'destructive',
      })
      return
    }

    setOriginalOutcome(outcome)
    setUnpacking(true)
    setUnpackedOutcome(null)
    setUnpackDialogOpen(true)

    try {
      const teacherId = user.id
      const response = await fetch(
        buildApiUrl(API_ENDPOINTS.LESSON_ARCHITECT_UNPACK_OUTCOME),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teacher_id: teacherId,
            outcome,
            grade: selectedScheme.grade,
            subject: selectedScheme.subject,
            language: 'english',
          }),
        }
      )

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your schemes...</p>
      </div>
    )
  }

  if (schemes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Lesson Plans from Schemes
          </CardTitle>
          <CardDescription>
            Create detailed lesson plans from your saved schemes of work
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
            <Calendar className="h-16 w-16 text-muted-foreground" />
            <div>
              <h3 className="font-semibold mb-2">No Schemes Found</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                You need to generate a scheme of work first before creating lesson plans.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Go to the <strong>Schemes of Work</strong> tab to create your first scheme.
              </p>
            </div>
            <Button onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload()
              }
            }} variant="outline">
              <Sparkles className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (selectedScheme) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => setSelectedScheme(null)}
              className="mb-2"
            >
              ← Back to Schemes
            </Button>
            <h2 className="text-2xl font-bold">{selectedScheme.title}</h2>
            <div className="flex gap-2 mt-2">
              <Badge>{selectedScheme.grade}</Badge>
              <Badge variant="secondary">{selectedScheme.subject}</Badge>
              <Badge variant="outline">{selectedScheme.term}</Badge>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select a Lesson to Generate Plan</CardTitle>
            <CardDescription>
              Click on any lesson below to generate a detailed lesson plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[600px] overflow-auto">
              <SchemePreview
                rows={selectedScheme.rows}
                subject={selectedScheme.subject}
                grade={selectedScheme.grade}
                term={selectedScheme.term}
                onGenerateLessonPlan={handleGenerateLessonPlan}
              />
            </div>
          </CardContent>
        </Card>

        {selectedRow && user && (
          <LessonPlanDialog
            open={lessonPlanDialogOpen}
            onOpenChange={setLessonPlanDialogOpen}
            row={selectedRow}
            grade={selectedScheme.grade}
            subject={selectedScheme.subject}
            term={selectedScheme.term}
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Your Schemes of Work
          </CardTitle>
          <CardDescription>
            Select a scheme to generate lesson plans from
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] overflow-auto">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {schemes.map((scheme) => (
                <Card
                  key={scheme.scheme_id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedScheme(scheme)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg flex items-start justify-between">
                      <span className="flex-1">{scheme.title}</span>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        <Badge>{scheme.grade}</Badge>
                        <Badge variant="secondary">{scheme.subject}</Badge>
                        <Badge variant="outline">{scheme.term}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {scheme.total_weeks} weeks
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <BookOpen className="h-4 w-4" />
                          {scheme.rows.length} lessons
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(scheme.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
