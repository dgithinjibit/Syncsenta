"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, FileText, Download, Copy, Check, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { buildApiUrl, API_ENDPOINTS } from '@/lib/api-config'
import { getHardcodedStrands, getSubjectsForGrade } from '@/data/curriculum'

// CBC level → grade map. See scheme-of-work-generator.tsx for rationale —
// we drive dropdowns from this static map instead of Object.keys(curriculumData),
// which returns [] because curriculumData is a Proxy with an empty target.
const CBC_LEVELS: { id: string; label: string; grades: string[] }[] = [
  { id: 'lower-primary',    label: 'Lower Primary',    grades: ['Grade 1', 'Grade 2', 'Grade 3'] },
  { id: 'upper-primary',    label: 'Upper Primary',    grades: ['Grade 4', 'Grade 5', 'Grade 6'] },
  { id: 'junior-secondary', label: 'Junior Secondary', grades: ['Grade 7', 'Grade 8', 'Grade 9'] },
]

export function LessonPlanGenerator() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState('')
  const [copied, setCopied] = useState(false)

  // Form states
  const [level, setLevel] = useState('')
  const [grade, setGrade] = useState('')
  const [subject, setSubject] = useState('')
  const [strand, setStrand] = useState('')
  const [subStrand, setSubStrand] = useState('')
  const [lessonNumber, setLessonNumber] = useState('1')
  const [duration, setDuration] = useState('40')
  const [classSize, setClassSize] = useState('35')
  const [specificFocus, setSpecificFocus] = useState('')
  const [differentiation, setDifferentiation] = useState<string[]>([])

  // Dropdown options (see CBC_LEVELS rationale above).
  const levels = CBC_LEVELS
  const grades = level ? (CBC_LEVELS.find(l => l.id === level)?.grades ?? []) : []
  const subjects = grade ? getSubjectsForGrade(grade) : []

  // Strands come straight from the curated curriculum — grade/subject are
  // already display strings now, so no transformation needed.
  const strands = level && grade && subject
    ? getHardcodedStrands(grade, subject)
    : null

  const strandNames = strands?.map(s => s.name) || []
  
  // Get sub-strands for selected strand
  const subStrands = strand && strands
    ? strands.find(s => s.name === strand)?.subStrands || []
    : []

  const generateLessonPlan = async () => {
    if (!level || !grade || !subject || !strand || !subStrand) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    setGeneratedPlan('')

    try {
      const selectedStrand = strands?.find(s => s.name === strand)
      const selectedSubStrand = selectedStrand?.subStrands.find(ss => ss.name === subStrand)

      const prompt = `Create a simple, practical lesson plan for a Kenyan CBC classroom.

**LESSON DETAILS:**
- Grade: ${grade.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
- Subject: ${subject.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
- Strand: ${strand}
- Sub-Strand: ${subStrand}
- Lesson Number: ${lessonNumber}
- Duration: ${duration} minutes
- Class Size: ${classSize} students
${specificFocus ? `- Specific Focus: ${specificFocus}` : ''}

**CURRICULUM DATA:**
${selectedSubStrand?.learningOutcomes ? `Learning Outcomes: ${selectedSubStrand.learningOutcomes.join(', ')}` : ''}
${selectedSubStrand?.keyInquiryQuestion ? `Key Inquiry Question: ${selectedSubStrand.keyInquiryQuestion}` : ''}
${selectedSubStrand?.suggestedExperiences ? `Suggested Experiences: ${selectedSubStrand.suggestedExperiences.join(', ')}` : ''}

**DIFFERENTIATION NEEDS:**
${differentiation.length > 0 ? differentiation.join(', ') : 'Mixed ability class'}

Create a SIMPLE, PRACTICAL lesson plan following this EXACT structure:

# LESSON PLAN: [Catchy Title]

## LESSON INFORMATION
- **Grade:** ${grade}
- **Subject:** ${subject}
- **Strand:** ${strand}
- **Sub-Strand:** ${subStrand}
- **Duration:** ${duration} minutes
- **Class Size:** ${classSize} students

## LEARNING OUTCOMES
By the end of this lesson, learners should be able to:
1. [Specific, measurable outcome 1]
2. [Specific, measurable outcome 2]
3. [Specific, measurable outcome 3]

## LEARNING RESOURCES
**Materials:**
- [List all materials needed - use locally available items]

## LESSON PROCEDURE

### INTRODUCTION (${Math.round(parseInt(duration) * 0.15)} minutes)
[Engaging activity to capture attention and activate prior knowledge - use Kenyan context like matatu, shillings, ugali, etc.]

### STEP 1 (${Math.round(parseInt(duration) * 0.20)} minutes)
**What the teacher does:**
[Clear, specific actions the teacher takes]

**What learners do:**
[Clear, specific actions learners take]

**Assessment:**
[How you check understanding]

### STEP 2 (${Math.round(parseInt(duration) * 0.20)} minutes)
**What the teacher does:**
[Clear, specific actions the teacher takes]

**What learners do:**
[Clear, specific actions learners take]

**Assessment:**
[How you check understanding]

### STEP 3 (${Math.round(parseInt(duration) * 0.20)} minutes)
**What the teacher does:**
[Clear, specific actions the teacher takes]

**What learners do:**
[Clear, specific actions learners take]

**Assessment:**
[How you check understanding]

### CONCLUSION (${Math.round(parseInt(duration) * 0.10)} minutes)
[How students summarize what they learned - quick recap and assessment]

### EXTENDED ACTIVITY
**For homework or extra practice:**
[Meaningful activity that reinforces the lesson - can be done at home or in class]

**For advanced learners:**
[Challenge activity for those who finish early or need extension]

---

**REQUIREMENTS:**
- Use Kenyan context throughout (matatu, shillings, ugali, chapati, sukuma wiki, etc.)
- Include specific, actionable steps
- Make it practical for a real Kenyan classroom
- Use simple, clear language
- Make it ready to print and use immediately`

      const response = await fetch(buildApiUrl(API_ENDPOINTS.AGENTS_CHAT), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          user_id: 'teacher_001',
          session_id: `lesson_${Date.now()}`,
          grade: grade,
          subject: subject,
          language: 'english',
          role: 'teacher'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate lesson plan')
      }

      const data = await response.json()
      
      if (data.success && data.response) {
        setGeneratedPlan(data.response)
        toast({
          title: 'Lesson Plan Generated!',
          description: 'Comprehensive CBC-aligned lesson plan ready',
        })
      } else {
        throw new Error(data.error || 'Generation failed')
      }

    } catch (error) {
      console.error('Generation error:', error)
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPlan)
    setCopied(true)
    toast({
      title: 'Copied!',
      description: 'Lesson plan copied to clipboard'
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadAsDoc = () => {
    const blob = new Blob([generatedPlan], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lesson-plan-${grade}-${subject}-${strand.replace(/\s+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: 'Downloaded!',
      description: 'Lesson plan saved to downloads'
    })
  }

  const toggleDifferentiation = (value: string) => {
    setDifferentiation(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Input Form */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lesson Details
          </CardTitle>
          <CardDescription>Configure your lesson plan</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[700px] pr-4">
            <div className="space-y-4">
              {/* Level */}
              <div className="space-y-2">
                <Label>Level *</Label>
                <Select value={level} onValueChange={(val) => {
                  setLevel(val)
                  setGrade('')
                  setSubject('')
                  setStrand('')
                  setSubStrand('')
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

              {/* Grade */}
              <div className="space-y-2">
                <Label>Grade *</Label>
                <Select value={grade} onValueChange={(val) => {
                  setGrade(val)
                  setSubject('')
                  setStrand('')
                  setSubStrand('')
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

              {/* Subject */}
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select value={subject} onValueChange={(val) => {
                  setSubject(val)
                  setStrand('')
                  setSubStrand('')
                }} disabled={!grade}>
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

              {/* Strand */}
              <div className="space-y-2">
                <Label>Strand *</Label>
                <Select value={strand} onValueChange={(val) => {
                  setStrand(val)
                  setSubStrand('')
                }} disabled={!subject || !strandNames.length}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select strand" />
                  </SelectTrigger>
                  <SelectContent>
                    {strandNames.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sub-Strand */}
              <div className="space-y-2">
                <Label>Sub-Strand *</Label>
                <Select value={subStrand} onValueChange={setSubStrand} disabled={!strand || !subStrands.length}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub-strand" />
                  </SelectTrigger>
                  <SelectContent>
                    {subStrands.map(ss => (
                      <SelectItem key={ss.name} value={ss.name}>
                        {ss.name} ({ss.lessons} lessons)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lesson Number */}
              <div className="space-y-2">
                <Label>Lesson Number</Label>
                <Input
                  type="number"
                  value={lessonNumber}
                  onChange={(e) => setLessonNumber(e.target.value)}
                  min="1"
                  placeholder="1"
                />
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="30"
                  max="120"
                  placeholder="40"
                />
              </div>

              {/* Class Size */}
              <div className="space-y-2">
                <Label>Class Size</Label>
                <Input
                  type="number"
                  value={classSize}
                  onChange={(e) => setClassSize(e.target.value)}
                  min="1"
                  placeholder="35"
                />
              </div>

              {/* Specific Focus */}
              <div className="space-y-2">
                <Label>Specific Focus (Optional)</Label>
                <Textarea
                  value={specificFocus}
                  onChange={(e) => setSpecificFocus(e.target.value)}
                  placeholder="e.g., Focus on visual representations of fractions"
                  rows={3}
                />
              </div>

              {/* Differentiation Needs */}
              <div className="space-y-2">
                <Label>Differentiation Needs</Label>
                <div className="space-y-2">
                  {['Struggling learners', 'Advanced learners', 'EAL learners', 'Special needs'].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={option}
                        checked={differentiation.includes(option)}
                        onCheckedChange={() => toggleDifferentiation(option)}
                      />
                      <label
                        htmlFor={option}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <div className="pt-4">
                <Button
                  onClick={generateLessonPlan}
                  disabled={loading || !level || !grade || !subject || !strand || !subStrand}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Lesson Plan...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Lesson Plan
                    </>
                  )}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Generated Plan */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Generated Lesson Plan</CardTitle>
              <CardDescription>
                {generatedPlan ? 'CBC-aligned lesson plan ready!' : 'Your lesson plan will appear here'}
              </CardDescription>
            </div>
            {generatedPlan && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={downloadAsDoc}>
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
              <p className="text-muted-foreground">Generating your comprehensive lesson plan...</p>
              <p className="text-sm text-muted-foreground">This may take 30-60 seconds</p>
            </div>
          ) : generatedPlan ? (
            <ScrollArea className="h-[700px]">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {generatedPlan}
                </pre>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <div>
                <h3 className="font-semibold mb-2">Ready to Generate</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Fill in the lesson details to generate a comprehensive, CBC-aligned lesson plan with:
                </p>
                <div className="mt-4 text-xs text-muted-foreground space-y-1">
                  <p>✓ Learning outcomes & inquiry questions</p>
                  <p>✓ Step-by-step lesson procedure with timings</p>
                  <p>✓ Kenyan context & locally available materials</p>
                  <p>✓ Assessment strategies & differentiation</p>
                  <p>✓ CBC competencies & values integration</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
