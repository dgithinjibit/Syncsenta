/**
 * Sign Up Page — split layout matching signin, scrollable form panel
 */

import { Suspense } from 'react';
import { SignUpForm } from '@/components/auth/sign-up-form';
import { GraduationCap, Users, BarChart3 } from 'lucide-react';

function SignupFormFallback() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-11 rounded-md bg-muted animate-pulse" />
      ))}
    </div>
  );
}

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex">
      {/* Left brand panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-400 p-12 text-white">
        <div>
          <span className="text-sm font-semibold uppercase tracking-widest opacity-80">
            Begin your learning path
          </span>
          <h1 className="mt-4 font-headline text-5xl font-bold leading-tight">
            syncsenta
          </h1>
          <p className="mt-3 text-lg text-teal-100 max-w-sm">
            Your personal AI tutor built for Kenya&apos;s CBC curriculum — free to start.
          </p>
        </div>

        <div className="space-y-6">
          <Feature icon={<GraduationCap className="h-5 w-5" />} title="For Students">
            Adaptive learning that meets you at your level, in your language.
          </Feature>
          <Feature icon={<Users className="h-5 w-5" />} title="For Teachers">
            Lesson plans, schemes of work, and real-time classroom monitoring.
          </Feature>
          <Feature icon={<BarChart3 className="h-5 w-5" />} title="For Parents">
            Track your child&apos;s progress and stay connected to their learning.
          </Feature>
        </div>

        <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
          <p className="text-sm font-medium">Free tier includes</p>
          <ul className="mt-2 space-y-1 text-sm text-teal-100">
            <li>✓ 50 AI messages per day</li>
            <li>✓ Access to 3 core subjects</li>
            <li>✓ Progress tracking</li>
          </ul>
        </div>

        <p className="text-xs text-teal-100/70">
          © 2026 Syncsenta. Built for Kenyan learners.
        </p>
      </div>

      {/* Right form panel — scrollable */}
      <div className="flex flex-1 flex-col items-center justify-start overflow-y-auto bg-background px-6 py-10 lg:px-16">
        {/* Mobile logo */}
        <div className="mb-6 text-center lg:hidden">
          <h1 className="font-headline text-3xl font-bold text-primary">syncsenta</h1>
          <p className="mt-1 text-sm text-muted-foreground">CBC learning companion</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Free to start — no credit card needed
            </p>
          </div>
          <Suspense fallback={<SignupFormFallback />}>
            <SignUpForm />
          </Suspense>
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
