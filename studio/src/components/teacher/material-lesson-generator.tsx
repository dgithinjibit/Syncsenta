"use client"

import { useState } from 'react'
import { FileText, FileUp, Loader2, Sparkles, WandSparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

type LessonPlan = Record<string, unknown>

const TEXT_FILE_TYPES = '.txt,.md,.csv,.json,.rtf'

function asText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join('\n')
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}: ${asText(item)}`)
      .filter(Boolean)
      .join('\n')
  }
  return value == null ? '' : String(value)
}

function createPrescribedLessonPlan({
  grade,
  subject,
  term,
  topic,
  sessionTitle,
  duration,
  learningGoal,
}: {
  grade: string
  subject: string
  term: string
  topic: string
  sessionTitle: string
  duration: string
  learningGoal: string
}): LessonPlan {
  const minutes = Math.max(15, Number(duration) || 40)
  const introductionMinutes = Math.max(5, Math.round(minutes * 0.15))
  const conclusionMinutes = Math.max(5, Math.round(minutes * 0.15))
  const developmentMinutes = Math.max(10, minutes - introductionMinutes - conclusionMinutes)
  const focus = topic || `${subject} foundational skills`

  return {
    title: sessionTitle || `${focus} — prescribed session`,
    grade,
    subject,
    term,
    strand: focus,
    subStrand: sessionTitle || focus,
    duration: `${minutes} minutes`,
    objectives: [
      learningGoal || `Identify the key ideas and vocabulary connected to ${focus}.`,
      `Demonstrate the target skill for ${focus} using guided practice.`,
      `Show confidence, collaboration, and respect while applying the skill.`,
    ],
    keyInquiryQuestion: `How can we use what we learn about ${focus} in everyday life?`,
    introduction: {
      duration: `${introductionMinutes} minutes`,
      activities: [
        `Activate prior knowledge by asking learners what they already know about ${focus}.`,
        `Introduce the session goal and key vocabulary using a familiar local example.`,
      ],
    },
    development: {
      duration: `${developmentMinutes} minutes`,
      activities: [
        `Model the target concept or skill for ${focus} using clear, step-by-step examples.`,
        `Guide learners through paired or small-group practice using available classroom materials.`,
        `Invite learners to apply the skill to a new example and explain their reasoning.`,
      ],
    },
    conclusion: {
      duration: `${conclusionMinutes} minutes`,
      activities: [
        `Review the key idea and ask learners to share one thing they can now do.`,
        `Use a short exit question or demonstration to close the session.`,
      ],
    },
    assessment: [
      'Observe participation and correct use of the target skill.',
      'Ask oral questions during guided practice.',
      'Use a short individual exit task to check understanding.',
    ],
    differentiation: {
      advanced: `Extend learners with a new ${focus} example and ask them to justify their solution.`,
      struggling: 'Provide worked examples, concrete materials, peer support, and extra guided practice.',
    },
    resources: ['Teacher notes or prescribed curriculum guide', 'Locally available concrete materials', 'Board, markers, and learner exercise books'],
    teacherReflection: `Which learners achieved the session goal for ${focus}? What evidence showed understanding, and what needs reteaching?`,
  }
}

function PlanSection({ title, value }: { title: string; value: unknown }) {
  const content = asText(value)
  if (!content) return null

  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{content}</p>
    </div>
  )
}

export function MaterialLessonGenerator() {
  const { toast } = useToast()
  const [material, setMaterial] = useState('')
  const [fileName, setFileName] = useState('')
  const [topic, setTopic] = useState('')
  const [grade, setGrade] = useState('Grade 8')
  const [subject, setSubject] = useState('')
  const [term, setTerm] = useState('Term 1')
  const [sessionTitle, setSessionTitle] = useState('')
  const [sessionNumber, setSessionNumber] = useState('1')
  const [duration, setDuration] = useState('40')
  const [learningGoal, setLearningGoal] = useState('')
  const [plan, setPlan] = useState<LessonPlan | null>(null)
  const [planSource, setPlanSource] = useState<'ai' | 'prescribed' | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File is too large', description: 'Please upload a file smaller than 5 MB.', variant: 'destructive' })
      return
    }

    try {
      setMaterial((await file.text()).slice(0, 30000))
      setFileName(file.name)
      toast({ title: 'Material loaded', description: `${file.name} is ready for lesson generation.` })
    } catch {
      toast({ title: 'Could not read file', description: 'Try a TXT, Markdown, CSV, JSON, or RTF file.', variant: 'destructive' })
    }
  }

  const generateLesson = async () => {
    if (!subject.trim()) {
      toast({ title: 'Choose a subject', description: 'Add the subject so SyncSenta can align the session.', variant: 'destructive' })
      return
    }

    setLoading(true)
    setPlan(null)
    setPlanSource(null)

    if (!material.trim()) {
      setPlan(createPrescribedLessonPlan({ grade, subject, term, topic, sessionTitle, duration, learningGoal }))
      setPlanSource('prescribed')
      setLoading(false)
      toast({ title: 'Prescribed schedule generated', description: 'No material was provided, so the local CBC session template was used.' })
      return
    }

    try {
      const source = material.trim().slice(0, 24000)
      const response = await fetch('/api/generate/lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: 'teacher_demo',
          week: 1,
          lesson: Number(sessionNumber) || 1,
          grade,
          subject,
          term,
          row: {
            week: 1,
            lesson: Number(sessionNumber) || 1,
            strand: topic || `${subject} session`,
            subStrand: sessionTitle || topic || 'Teacher-provided material',
            specificLearningOutcome: learningGoal || `Explain the key ideas from ${topic || 'the provided material'}.`,
            learningExperiences: `Use the teacher-provided material to explore ${topic || 'the session concept'}.`,
            keyInquiryQuestion: `How can learners apply the ideas in ${topic || 'this material'}?`,
            learningResources: fileName || 'Teacher-provided material',
          },
          additional_notes: [
            `Create a complete lesson plan for one teaching session.`,
            `Session title: ${sessionTitle || topic || 'Teacher material lesson'}`,
            `Duration: ${duration} minutes.`,
            `Teacher focus: ${learningGoal || 'Use the material to build understanding and application.'}`,
            `SOURCE MATERIAL:\n${source}`,
          ].join('\n\n'),
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.detail || data.error || 'Lesson generation failed')

      setPlan(data.lesson_plan ?? data.plan ?? null)
      setPlanSource('ai')
      toast({ title: 'Session lesson plan generated', description: 'Review the AI-created lesson below.' })
    } catch (error) {
      setPlan(createPrescribedLessonPlan({ grade, subject, term, topic, sessionTitle, duration, learningGoal }))
      setPlanSource('prescribed')
      toast({
        title: 'Prescribed schedule generated',
        description: `AI was unavailable, so a local CBC schedule was used. ${error instanceof Error ? error.message : ''}`.trim(),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card className="overflow-hidden border-primary/15 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-primary/[0.04]">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <WandSparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Material to Lesson</CardTitle>
            <CardDescription>Use your material when available, or create a prescribed CBC session offline.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/[0.03] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileUp className="h-4 w-4 text-primary" />
              Upload teaching material
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Optional: TXT, Markdown, CSV, JSON, or RTF up to 5 MB.</p>
            <Input className="mt-3 cursor-pointer bg-background" type="file" accept={TEXT_FILE_TYPES} onChange={handleFile} />
            {fileName && <p className="mt-2 truncate text-xs text-primary">Loaded: {fileName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="material-text">Or paste the material</Label>
            <Textarea id="material-text" value={material} onChange={(event) => setMaterial(event.target.value)} placeholder="Paste notes, textbook content, a topic outline, or an activity description..." className="min-h-36" />
            <p className="text-right text-xs text-muted-foreground">{material.length.toLocaleString()} / 30,000 characters</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="material-grade">Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger id="material-grade"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="material-subject">Subject</Label>
              <Input id="material-subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Mathematics" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="material-term">Term</Label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger id="material-term"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Term 1', 'Term 2', 'Term 3'].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="material-duration">Duration</Label>
              <Input id="material-duration" type="number" min="15" max="180" value={duration} onChange={(event) => setDuration(event.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="session-title">Session title</Label>
              <Input id="session-title" value={sessionTitle} onChange={(event) => setSessionTitle(event.target.value)} placeholder="e.g. Identifying fractions" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-number">Session number</Label>
              <Input id="session-number" type="number" min="1" value={sessionNumber} onChange={(event) => setSessionNumber(event.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-topic">Topic or strand</Label>
            <Input id="session-topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Number concepts / Living things" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="learning-goal">Teacher focus or learning goal <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="learning-goal" value={learningGoal} onChange={(event) => setLearningGoal(event.target.value)} placeholder="What should learners be able to do by the end of this session?" />
          </div>

          <Button className="w-full" size="lg" onClick={generateLesson} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating session lesson...</> : <><Sparkles className="mr-2 h-4 w-4" /> Create lesson from material</>}
          </Button>
        </CardContent>
      </Card>

      <Card className="min-h-[620px] border-primary/15 shadow-sm">
        <CardHeader className="border-b border-border/60">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Session lesson plan</CardTitle>
              <CardDescription>{plan ? (planSource === 'ai' ? 'AI-generated from your teaching material' : 'Prescribed CBC schedule generated locally') : 'Your generated lesson will appear here'}</CardDescription>
            </div>
            {plan && <Badge variant={planSource === 'ai' ? 'secondary' : 'outline'} className="gap-1"><Sparkles className="h-3 w-3" /> {planSource === 'ai' ? 'SyncSenta' : 'Prescribed CBC'}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {!plan && !loading && (
            <div className="flex min-h-[500px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 p-8 text-center">
              <FileText className="mb-4 h-10 w-10 text-muted-foreground/60" />
              <h3 className="text-lg font-semibold">A focused lesson, built from your material</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Upload your notes, choose the session context, and SyncSenta will organize the objectives, activities, assessment, and differentiation.</p>
            </div>
          )}
          {loading && (
            <div className="flex min-h-[500px] flex-col items-center justify-center rounded-2xl bg-primary/[0.04] p-8 text-center">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
              <h3 className="text-lg font-semibold">SyncSenta is shaping your session</h3>
              <p className="mt-2 text-sm text-muted-foreground">Reading the material and aligning the lesson with CBC outcomes.</p>
            </div>
          )}
          {plan && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-primary/[0.06] p-4">
                <h2 className="text-xl font-semibold">{asText(plan.title) || sessionTitle || 'Generated lesson session'}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{grade} · {subject} · {term} · {duration} minutes</p>
              </div>
              <PlanSection title="Learning objectives" value={plan.objectives} />
              <PlanSection title="Introduction" value={plan.introduction} />
              <PlanSection title="Development" value={plan.development} />
              <PlanSection title="Conclusion" value={plan.conclusion} />
              <PlanSection title="Assessment" value={plan.assessment} />
              <PlanSection title="Differentiation" value={plan.differentiation} />
              <PlanSection title="Resources" value={plan.resources} />
              <PlanSection title="Teacher reflection" value={plan.teacherReflection} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
