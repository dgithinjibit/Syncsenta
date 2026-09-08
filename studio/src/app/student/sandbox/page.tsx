'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, Sparkles } from 'lucide-react'
import { StudentHeader } from '@/components/layout/student-header'
import { FloatingConceptChat } from '@/components/student/floating-concept-chat'
import type { SubjectId, ExtendedSubjectId } from '@/lib/sandbox-types'

type SubjectCard = {
  label: string
  image: string
  subject?: SubjectId
  slug?: ExtendedSubjectId
}

const CORE_SUBJECTS: SubjectCard[] = [
  { label: 'English', subject: 'english', image: '/images/learning-catalog/english.png' },
  { label: 'Kiswahili', subject: 'kiswahili', image: '/images/learning-catalog/kiswahili.png' },
  { label: 'Mathematics', subject: 'mathematics', image: '/images/learning-catalog/mathematics.png' },
  { label: 'Social Studies', image: '/images/learning-catalog/social-studies.png' },
  { label: 'Creative Arts', subject: 'creative', image: '/images/learning-catalog/creative-arts.png' },
  { label: 'Religious Education', subject: 'cre', image: '/images/learning-catalog/religious-education.png' },
  { label: 'Environmental Activities', subject: 'environmental', image: '/images/learning-catalog/environmental-activities.png' },
  { label: 'Indigenous Language', subject: 'indigenous', image: '/images/learning-catalog/indigenous-language.png' },
  { label: 'Kenyan Sign Language', image: '/images/learning-catalog/kenyan-sign-language.png' },
]

const RECOMMENDED_COURSES: SubjectCard[] = [
  { label: 'AI',                    image: '/images/learning-catalog/ai.png',                    slug: 'ai' },
  { label: 'Blockchain',            image: '/images/learning-catalog/blockchain.png',            slug: 'blockchain' },
  { label: 'Superintelligence & AI', image: '/images/learning-catalog/superintelligence.png',   slug: 'superintelligence' },
  { label: 'Financial Literacy',    image: '/images/learning-catalog/financial-literacy.png',    slug: 'financial-literacy' },
]

function LearningProgress() {
  const steps = ['Level', 'Sub-Level', 'Grade', 'Subject']

  return (
    <ol className="mb-8 grid grid-cols-2 gap-y-5 sm:mb-10 sm:grid-cols-4 sm:gap-0" aria-label="Learning journey progress">
      {steps.map((step, index) => {
        const isCurrent = index === steps.length - 1
        return (
          <li key={step} className="relative flex min-w-0 items-center sm:block">
            {index > 0 && (
              <span className="absolute left-0 top-5 hidden h-1 w-full -translate-x-1/2 bg-emerald-500 sm:block" aria-hidden />
            )}
            <span
              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 text-sm font-bold shadow-sm ${
                isCurrent
                  ? 'border-orange-200 bg-orange-500 text-white'
                  : 'border-white bg-emerald-500 text-white'
              }`}
            >
              {isCurrent ? '4' : <Check className="h-5 w-5" strokeWidth={3} />}
            </span>
            <span className="ml-3 text-sm font-semibold text-teal-700 sm:ml-0 sm:mt-2 sm:block">
              {step}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function ImageCard({
  label,
  image,
  onClick,
}: {
  label: string
  image: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative isolate h-40 overflow-hidden rounded-2xl border border-teal-100 bg-slate-950 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-teal-300 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 sm:h-44"
    >
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      <span className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" aria-hidden />
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
        <span className="text-xl font-extrabold leading-tight tracking-tight text-white drop-shadow-md sm:text-2xl">
          {label}
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-white/80 transition group-hover:translate-x-1 group-hover:text-white" />
      </span>
    </button>
  )
}

export default function SandboxPage() {
  const router = useRouter()
  const [notice, setNotice] = useState<string | null>(null)
  const [grade, setGrade] = useState('Grade 2')
  const [studentName, setStudentName] = useState('Student')

  useEffect(() => {
    const storedGrade = window.sessionStorage.getItem('learningJourney.grade') || window.localStorage.getItem('learningJourney.grade')
    const storedName = window.localStorage.getItem('studentName') || window.localStorage.getItem('userName')
    if (storedGrade) setGrade(storedGrade)
    if (storedName) setStudentName(storedName)
  }, [])

  const openSubject = (card: SubjectCard) => {
    const slug = card.subject ?? card.slug
    if (!slug) {
      setNotice(`${card.label} is coming soon.`)
      return
    }
    router.push(`/student/subject/${slug}`)
  }

  return (
    <div className="min-h-screen bg-teal-400 p-1 sm:p-2">
      <div className="min-h-[calc(100vh-0.5rem)] overflow-hidden rounded-[1.6rem] bg-[#fffaf0] shadow-2xl sm:rounded-[2rem]">
        <StudentHeader showBackButton onBack={() => router.push('/student')} variant="catalog" />

        <main className="px-5 pb-16 pt-2 sm:px-8 lg:px-14">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col justify-between gap-4 border-b border-teal-100 pb-6 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-600">Interactive learning</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-teal-950 sm:text-5xl">Learn by making</h1>
                <p className="mt-2 max-w-2xl text-base leading-7 text-teal-900/70">Choose a subject to open an interactive canvas for <strong>{grade}</strong>. Your attempts, hints, and progress stay connected to this learning context.</p>
              </div>
              <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-900">
                Current pathway<br /><span className="text-lg">{grade}</span>
              </div>
            </div>

            <LearningProgress />

            <section aria-labelledby="core-subjects-heading">
              <div className="mb-5 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-teal-600" />
                <h2 id="core-subjects-heading" className="text-2xl font-extrabold text-teal-700 sm:text-3xl">
                  Core Subjects
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 min-[430px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {CORE_SUBJECTS.map((card) => (
                  <ImageCard key={card.label} {...card} onClick={() => openSubject(card)} />
                ))}
              </div>
            </section>

            <section aria-labelledby="recommended-courses-heading" className="mt-12">
              <h2 id="recommended-courses-heading" className="mb-5 text-2xl font-extrabold text-teal-700 sm:text-3xl">
                Recommended Courses for You
              </h2>
              <div className="grid gap-5 md:grid-cols-3">
                {RECOMMENDED_COURSES.map((course) => (
                  <ImageCard
                    key={course.label}
                    {...course}
                    onClick={() => openSubject(course)}
                  />
                ))}
              </div>
            </section>

            {notice && (
              <div role="status" className="mt-8 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
                {notice}
              </div>
            )}
          </div>
        </main>

        <FloatingConceptChat studentName={studentName} grade={grade} />
      </div>
    </div>
  )
}
