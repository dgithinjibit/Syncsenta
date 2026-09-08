/**
 * Sign In Page — split layout: brand panel left, form right
 */

import { SignInForm } from '@/components/auth/sign-in-form';
import { BookOpen, Brain, Zap } from 'lucide-react';

export default function SignInPage() {
  return (
    <main className="min-h-screen flex">
      {/* Left brand panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-400 p-12 text-white">
        <div>
          <span className="text-sm font-semibold uppercase tracking-widest opacity-80">
            CBC Learning Companion
          </span>
          <h1 className="mt-4 font-headline text-5xl font-bold leading-tight">
            syncsenta
          </h1>
          <p className="mt-3 text-lg text-teal-100 max-w-sm">
            AI-powered tutoring built for Kenya&apos;s Competency-Based Curriculum.
          </p>
        </div>

        <div className="space-y-6">
          <Feature icon={<Brain className="h-5 w-5" />} title="Socratic AI Tutor">
            Asks the right questions so you find answers yourself — in English or Kiswahili.
          </Feature>
          <Feature icon={<BookOpen className="h-5 w-5" />} title="CBC-Aligned Content">
            Every strand, every grade, every subject mapped to the KICD curriculum.
          </Feature>
          <Feature icon={<Zap className="h-5 w-5" />} title="Works Offline">
            Study anywhere — even when connectivity is limited.
          </Feature>
        </div>

        <p className="text-xs text-teal-100/70">
          © 2026 Syncsenta. Built for Kenyan learners.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12 lg:px-16">
        {/* Mobile logo */}
        <div className="mb-8 text-center lg:hidden">
          <h1 className="font-headline text-3xl font-bold text-primary">syncsenta</h1>
          <p className="mt-1 text-sm text-muted-foreground">CBC learning companion</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Continue your learning journey
            </p>
          </div>
          <SignInForm />
        </div>
      </div>
    </main>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
        {icon}
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-teal-100">{children}</p>
      </div>
    </div>
  );
}
