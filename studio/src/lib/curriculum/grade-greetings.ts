/**
 * Grade-aware greeting + tutor-label helpers.
 *
 * The word "Socratic" is meaningless to a Grade 2 learner (and most of
 * Grade 3-6, frankly). These helpers tier the language so young
 * learners get warm, action-oriented copy while older learners still
 * see the pedagogical framing that signals what the tutor actually
 * does. The tutor is the same component end-to-end — only the
 * student-facing surface text shifts.
 *
 * Grade format accepted:
 *   - "Grade 2", "grade 2", "g2", "GRADE 2", "G2" — all map to 2.
 *   - Unknown input falls through to the older-learner copy (safe
 *     default; we'd rather under-simplify than talk down to a Grade 6).
 */

type GradeBand = 'lower-primary' | 'upper-primary' | 'older'

function parseGradeNumber(grade: string | undefined | null): number | null {
  if (!grade) return null
  const match = grade.match(/(\d+)/)
  if (!match) return null
  const n = parseInt(match[1], 10)
  return Number.isFinite(n) ? n : null
}

export function gradeBandFor(grade: string | undefined | null): GradeBand {
  const n = parseGradeNumber(grade)
  if (n === null) return 'older'
  if (n <= 3) return 'lower-primary'
  if (n <= 6) return 'upper-primary'
  return 'older'
}

/**
 * Returns a short label for the chat header subtitle. Grade 2 sees
 * "Your friendly learning buddy" instead of "Socratic Mentor".
 */
export function tutorLabelFor(grade: string | undefined | null): string {
  switch (gradeBandFor(grade)) {
    case 'lower-primary':
      return 'Your friendly learning buddy'
    case 'upper-primary':
      return 'Learning coach · CBC-aligned'
    default:
      return 'Socratic Mentor · grounded in Kenyan CBC'
  }
}

/**
 * Short, marketing-style description used on the student dashboard
 * card. Same tiering principle — young learners get a verb, older
 * learners get the pedagogical name.
 */
export function tutorTaglineFor(grade: string | undefined | null): string {
  switch (gradeBandFor(grade)) {
    case 'lower-primary':
      return 'Your fun helper for stories, numbers, and questions'
    case 'upper-primary':
      return 'Your CBC-aligned learning coach'
    default:
      return 'Live Socratic tutor grounded in CBC curriculum'
  }
}

/**
 * The first message the tutor sends when a chat opens. Grade 2 gets a
 * "Welcome to Grade 2 {Subject}! What should we learn today?"-style
 * opener; older learners keep the existing Karibu / Socratic framing.
 *
 * `teacherContext` (when present) means the student is following a
 * teacher-charted plan — we use a slightly different opener there,
 * still grade-tiered.
 */
export function tutorIntroMessage(opts: {
  studentName: string
  subject: string
  grade?: string | null
  teacherContext?: string
}): string {
  const { studentName, subject, grade, teacherContext } = opts
  const band = gradeBandFor(grade)
  const normalisedGrade = grade?.trim() || ''

  if (teacherContext) {
    if (band === 'lower-primary') {
      return `Hi ${studentName}! Your teacher picked something fun for us. Ready to start?`
    }
    if (band === 'upper-primary') {
      return `Hi ${studentName}! Your teacher set up today's lesson. Shall we begin?`
    }
    return 'Welcome, Explorer! Your teacher has charted a learning journey just for your class. What expedition shall we embark on today?'
  }

  if (band === 'lower-primary') {
    const gradeBit = normalisedGrade ? `${normalisedGrade} ` : ''
    return `Karibu ${studentName}! Welcome to ${gradeBit}${subject}. What should we learn today?`
  }
  if (band === 'upper-primary') {
    return `Karibu, ${studentName}! I'm syncsenta. What part of ${subject} would you like to work on today?`
  }
  return `Karibu, ${studentName}! I'm syncsenta, your Socratic mentor for ${subject}. What part of ${subject} would you like to explore today?`
}
