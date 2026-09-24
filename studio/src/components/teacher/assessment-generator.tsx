"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, ClipboardList, Download, Copy, Check, Sparkles, FileQuestion, Award } from 'lucide-react'
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

export function AssessmentGenerator() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [generatedAssessment, setGeneratedAssessment] = useState('')
  const [copied, setCopied] = useState(false)
  const [assessmentType, setAssessmentType] = useState<'quiz' | 'test' | 'rubric' | 'formative'>('quiz')
  const [formalPaperType, setFormalPaperType] = useState<'midterm' | 'end_of_term'>('midterm')
  const [term, setTerm] = useState('Term 1')

  // Form states
  const [level, setLevel] = useState('')
  const [grade, setGrade] = useState('')
  const [subject, setSubject] = useState('')
  const [strand, setStrand] = useState('')
  const [subStrand, setSubStrand] = useState('')
  const [numQuestions, setNumQuestions] = useState('10')
  const [difficulty, setDifficulty] = useState('mixed')
  const [questionTypes, setQuestionTypes] = useState<string[]>(['multiple-choice'])
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true)
  const [includeRubric, setIncludeRubric] = useState(false)

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

  const generateAssessment = async () => {
    if (!level || !grade || !subject) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    setGeneratedAssessment('')

    try {
      const selectedStrand = strands?.find(s => s.name === strand)
      const selectedSubStrand = selectedStrand?.subStrands.find(ss => ss.name === subStrand)

      let prompt = ''

      if (assessmentType === 'quiz') {
        prompt = `Create a comprehensive quiz for a Kenyan CBC classroom.

**ASSESSMENT DETAILS:**
- Grade: ${grade.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
- Subject: ${subject.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
${strand ? `- Strand: ${strand}` : ''}
${subStrand ? `- Sub-Strand: ${subStrand}` : ''}
- Number of Questions: ${numQuestions}
- Difficulty: ${difficulty}
- Question Types: ${questionTypes.join(', ')}

${selectedSubStrand?.learningOutcomes ? `**Learning Outcomes to Assess:**\n${selectedSubStrand.learningOutcomes.join('\n')}` : ''}

Create a quiz with the following structure:

# QUIZ: ${subject} - ${strand || 'General Assessment'}

**Grade:** ${grade}
**Subject:** ${subject}
**Total Marks:** ${parseInt(numQuestions) * 2}
**Duration:** ${Math.ceil(parseInt(numQuestions) * 2)} minutes

## Instructions for Learners:
1. Read each question carefully
2. Answer all questions
3. Show your working where required
4. Use Kenyan context examples

---

## SECTION A: ${questionTypes.includes('multiple-choice') ? 'Multiple Choice Questions' : 'Questions'} (${Math.ceil(parseInt(numQuestions) * 0.5)} marks each)

${Array.from({length: Math.ceil(parseInt(numQuestions) * 0.5)}, (_, i) => `
${i + 1}. [Question using Kenyan context - matatu, shillings, ugali, etc.]
   a) [Option A]
   b) [Option B]
   c) [Option C]
   d) [Option D]
`).join('\n')}

${questionTypes.includes('short-answer') ? `
## SECTION B: Short Answer Questions (2 marks each)

${Array.from({length: Math.ceil(parseInt(numQuestions) * 0.3)}, (_, i) => `
${i + 1}. [Short answer question using Kenyan context]
   _____________________________________________
`).join('\n')}
` : ''}

${questionTypes.includes('problem-solving') ? `
## SECTION C: Problem Solving (3 marks each)

${Array.from({length: Math.ceil(parseInt(numQuestions) * 0.2)}, (_, i) => `
${i + 1}. [Problem-solving question with Kenyan context]
   
   Working:
   
   
   Answer: _____________
`).join('\n')}
` : ''}

---

${includeAnswerKey ? `
## ANSWER KEY (For Teacher Use Only)

**Section A:**
${Array.from({length: Math.ceil(parseInt(numQuestions) * 0.5)}, (_, i) => `${i + 1}. [Correct answer with brief explanation]`).join('\n')}

${questionTypes.includes('short-answer') ? `
**Section B:**
${Array.from({length: Math.ceil(parseInt(numQuestions) * 0.3)}, (_, i) => `${i + 1}. [Expected answer with marking scheme]`).join('\n')}
` : ''}

${questionTypes.includes('problem-solving') ? `
**Section C:**
${Array.from({length: Math.ceil(parseInt(numQuestions) * 0.2)}, (_, i) => `${i + 1}. [Step-by-step solution with marking allocation]`).join('\n')}
` : ''}
` : ''}

**REQUIREMENTS:**
- Use Kenyan context (matatu, shillings, ugali, chapati, sukuma wiki, etc.)
- Align with CBC learning outcomes
- Use age-appropriate language
- Include clear instructions
- Provide marking scheme if answer key included
- Make questions practical and relevant to Kenyan students`

      } else if (assessmentType === 'test') {
        const paperTitle = formalPaperType === 'midterm' ? 'MIDTERM EXAMINATION' : 'END OF TERM EXAMINATION'
        const paperPeriod = formalPaperType === 'midterm' ? 'midterm' : 'end of term'
        prompt = `Create a comprehensive ${paperPeriod} formal paper for a Kenyan CBC classroom.

**PAPER PERIOD:** ${paperTitle}
**TERM:** ${term}

**TEST DETAILS:**
- Grade: ${grade.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
- Subject: ${subject.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
${strand ? `- Strand: ${strand}` : '- Coverage: Full term content'}
- Number of Questions: ${numQuestions}
- Difficulty: ${difficulty}

Create a formal test with:

# ${paperTitle}
## ${subject.toUpperCase()} - ${grade.toUpperCase()}
**Term:** ${term}

**Name:** _________________________  **Adm No:** __________
**Class:** _________________________  **Date:** ____________
**Time Allowed:** ${Math.ceil(parseInt(numQuestions) * 3)} minutes
**Total Marks:** ${parseInt(numQuestions) * 3}

### INSTRUCTIONS:
1. Answer ALL questions in the spaces provided
2. Show all your working clearly
3. Marks will be awarded for correct working
4. Use Kenyan context examples where applicable

---

[Create comprehensive test with multiple sections covering different cognitive levels: Knowledge, Comprehension, Application, Analysis]

${includeAnswerKey ? `
---

## MARKING SCHEME (For Teacher Use Only)

[Detailed marking scheme with mark allocation for each step]

### GRADE BOUNDARIES:
- A: 80-100%
- B: 70-79%
- C: 60-69%
- D: 50-59%
- E: Below 50%
` : ''}

**REQUIREMENTS:**
- Cover multiple CBC competencies
- Include Bloom's taxonomy levels
- Use Kenyan context throughout
- Provide clear marking scheme
- Include grade boundaries`

      } else if (assessmentType === 'rubric') {
        prompt = `Create a comprehensive assessment rubric for a Kenyan CBC classroom.

**RUBRIC DETAILS:**
- Grade: ${grade.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
- Subject: ${subject.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
${strand ? `- Strand: ${strand}` : ''}
${subStrand ? `- Sub-Strand: ${subStrand}` : ''}

Create a detailed rubric with:

# ASSESSMENT RUBRIC
## ${subject} - ${grade}
### ${strand || 'General Assessment'}

**Purpose:** [What this rubric assesses]

## PERFORMANCE LEVELS

| Criteria | Exceeds Expectations (4) | Meets Expectations (3) | Approaching Expectations (2) | Below Expectations (1) |
|----------|-------------------------|----------------------|----------------------------|----------------------|
| **Understanding of Concepts** | [Detailed descriptor] | [Detailed descriptor] | [Detailed descriptor] | [Detailed descriptor] |
| **Application of Skills** | [Detailed descriptor] | [Detailed descriptor] | [Detailed descriptor] | [Detailed descriptor] |
| **Problem Solving** | [Detailed descriptor] | [Detailed descriptor] | [Detailed descriptor] | [Detailed descriptor] |
| **Communication** | [Detailed descriptor] | [Detailed descriptor] | [Detailed descriptor] | [Detailed descriptor] |
| **CBC Competencies** | [Detailed descriptor] | [Detailed descriptor] | [Detailed descriptor] | [Detailed descriptor] |

## SCORING GUIDE:
- **Total Points Possible:** 20
- **Exceeds (16-20 points):** Student demonstrates exceptional understanding
- **Meets (12-15 points):** Student demonstrates solid understanding
- **Approaching (8-11 points):** Student demonstrates partial understanding
- **Below (0-7 points):** Student needs significant support

## FEEDBACK PROMPTS:
**Strengths:**
- [What the student does well]

**Areas for Growth:**
- [What the student needs to work on]

**Next Steps:**
- [Specific actions for improvement]

**REQUIREMENTS:**
- Align with CBC competencies
- Include clear, observable descriptors
- Provide actionable feedback prompts
- Make it practical for Kenyan teachers`

      } else { // formative
        prompt = `Create formative assessment strategies for ongoing classroom assessment.

**FORMATIVE ASSESSMENT TOOLKIT:**
- Grade: ${grade.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
- Subject: ${subject.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
${strand ? `- Strand: ${strand}` : ''}

Create a comprehensive formative assessment toolkit with:

# FORMATIVE ASSESSMENT TOOLKIT
## ${subject} - ${grade}

## 1. EXIT TICKETS (Quick Checks)
[5 different exit ticket templates with 2-3 questions each]

## 2. OBSERVATION CHECKLISTS
[Checklist for observing student understanding during lessons]

## 3. THINK-PAIR-SHARE PROMPTS
[10 prompts for collaborative assessment]

## 4. SELF-ASSESSMENT TOOLS
[Student self-reflection templates]

## 5. PEER ASSESSMENT GUIDELINES
[How students can assess each other's work]

## 6. QUICK QUIZZES (5 minutes)
[3 quick quiz templates]

## 7. MISCONCEPTION CHECKS
[Common misconceptions and how to identify them]

## 8. DIFFERENTIATED QUESTIONS
- For struggling learners: [Questions]
- For on-level learners: [Questions]
- For advanced learners: [Questions]

## 9. DIGITAL ASSESSMENT IDEAS
[Ideas for using available technology]

## 10. PRACTICAL DEMONSTRATIONS
[Hands-on assessment activities]

**REQUIREMENTS:**
- Practical for Kenyan classrooms
- Use locally available resources
- Align with CBC assessment principles
- Include Kenyan context examples`
      }

      const response = await fetch('/api/generate/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          user_id: 'teacher_001',
          session_id: `assessment_${Date.now()}`,
          grade: grade,
          subject: subject,
          language: subject.toLowerCase().includes('kiswahili') ? 'kiswahili' : 'english',
          role: 'teacher',
          assessment_type: assessmentType,
          assessment_period: assessmentType === 'test' ? formalPaperType : undefined,
          term: assessmentType === 'test' ? term : undefined
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate assessment')
      }

      const data = await response.json()
      
      if (data.success && data.response) {
        setGeneratedAssessment(data.response)
        toast({
          title: 'Assessment Generated!',
          description: `${assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)} ready for use`,
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
    navigator.clipboard.writeText(generatedAssessment)
    setCopied(true)
    toast({
      title: 'Copied!',
      description: 'Assessment copied to clipboard'
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadAsDoc = () => {
    const blob = new Blob([generatedAssessment], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${assessmentType}-${grade}-${subject}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: 'Downloaded!',
      description: 'Assessment saved to downloads'
    })
  }

  const toggleQuestionType = (type: string) => {
    setQuestionTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  return (
    <div className="space-y-6">
      {/* Assessment Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Type</CardTitle>
          <CardDescription>Choose the type of assessment to generate</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={assessmentType} onValueChange={(v) => setAssessmentType(v as any)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="quiz">Quick Quiz</TabsTrigger>
              <TabsTrigger value="test">Formal Test</TabsTrigger>
              <TabsTrigger value="rubric">Rubric</TabsTrigger>
              <TabsTrigger value="formative">Formative Tools</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Assessment Details
            </CardTitle>
            <CardDescription>Configure your assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
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

                {assessmentType !== 'formative' && (
                  <>
                    {assessmentType === 'test' && (
                  <>
                    <div className="space-y-2">
                      <Label>Formal Paper Type *</Label>
                      <Select value={formalPaperType} onValueChange={(value) => setFormalPaperType(value as 'midterm' | 'end_of_term')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="midterm">Midterm Examination</SelectItem>
                          <SelectItem value="end_of_term">End-of-Term Examination</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Term *</Label>
                      <Select value={term} onValueChange={setTerm}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Term 1">Term 1</SelectItem>
                          <SelectItem value="Term 2">Term 2</SelectItem>
                          <SelectItem value="Term 3">Term 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Strand */}
                    <div className="space-y-2">
                      <Label>Strand (Optional)</Label>
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
                      <Label>Sub-Strand (Optional)</Label>
                      <Select value={subStrand} onValueChange={setSubStrand} disabled={!strand || !subStrands.length}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sub-strand" />
                        </SelectTrigger>
                        <SelectContent>
                          {subStrands.map(ss => (
                            <SelectItem key={ss.name} value={ss.name}>
                              {ss.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {(assessmentType === 'quiz' || assessmentType === 'test') && (
                  <>
                    {/* Number of Questions */}
                    <div className="space-y-2">
                      <Label>Number of Questions</Label>
                      <Input
                        type="number"
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(e.target.value)}
                        min="5"
                        max="50"
                        placeholder="10"
                      />
                    </div>

                    {/* Difficulty */}
                    <div className="space-y-2">
                      <Label>Difficulty Level</Label>
                      <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                          <SelectItem value="mixed">Mixed (Recommended)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Question Types */}
                    <div className="space-y-2">
                      <Label>Question Types</Label>
                      <div className="space-y-2">
                        {['multiple-choice', 'short-answer', 'problem-solving', 'true-false'].map((type) => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox
                              id={type}
                              checked={questionTypes.includes(type)}
                              onCheckedChange={() => toggleQuestionType(type)}
                            />
                            <label
                              htmlFor={type}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="answer-key"
                          checked={includeAnswerKey}
                          onCheckedChange={(checked) => setIncludeAnswerKey(checked as boolean)}
                        />
                        <label htmlFor="answer-key" className="text-sm font-medium">
                          Include Answer Key
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="rubric"
                          checked={includeRubric}
                          onCheckedChange={(checked) => setIncludeRubric(checked as boolean)}
                        />
                        <label htmlFor="rubric" className="text-sm font-medium">
                          Include Marking Rubric
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {/* Generate Button */}
                <div className="pt-4">
                  <Button
                    onClick={generateAssessment}
                    disabled={loading || !level || !grade || !subject}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate {assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Generated Assessment */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Generated Assessment</CardTitle>
                <CardDescription>
                  {generatedAssessment ? 'CBC-aligned assessment ready!' : 'Your assessment will appear here'}
                </CardDescription>
              </div>
              {generatedAssessment && (
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
                <p className="text-muted-foreground">Generating your assessment...</p>
                <p className="text-sm text-muted-foreground">This may take 30-60 seconds</p>
              </div>
            ) : generatedAssessment ? (
              <ScrollArea className="h-[600px]">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {generatedAssessment}
                  </pre>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                <ClipboardList className="h-16 w-16 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold mb-2">Ready to Generate</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Select assessment type and fill in details to generate CBC-aligned assessments
                  </p>
                  <div className="mt-4 text-xs text-muted-foreground space-y-1">
                    <p>✓ Quizzes with multiple question types</p>
                    <p>✓ Formal tests with marking schemes</p>
                    <p>✓ Detailed assessment rubrics</p>
                    <p>✓ Formative assessment toolkits</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
