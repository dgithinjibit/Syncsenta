/**
 * The account-free address for the scheme check, and the one the submission links to.
 *
 * `/omega` is not in `PROTECTED_WORKSPACE_PREFIXES` (`src/lib/auth/route-policy.ts`), so production serves
 * it without a session. That is the point: the demo asks a reviewer to open a link and watch an agent reach
 * a verdict about a real curriculum, and an account wall would make the first thing they see a Supabase
 * round-trip rather than the decision. Nothing the page decides travels through a server either way.
 *
 * `/teacher/omega` mounts the same component for a signed-in teacher.
 */

import SchemeCheck from '@/components/omega/scheme-check';

export default function OmegaCheckPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <h1 className="text-2xl font-bold">Omega · scheme check</h1>
          <p className="text-sm text-muted-foreground">
            One pass over a Grade 8 scheme of work, decided by the curriculum packs and cited line by line.
            No model, no key, no server-side decision.
          </p>
        </div>
      </header>
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <SchemeCheck />
      </main>
    </div>
  );
}
