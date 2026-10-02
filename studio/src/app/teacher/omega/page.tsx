/**
 * The scheme check inside the teacher workspace.
 *
 * `/teacher/*` is an auth-protected segment in production (`src/middleware.ts` reads
 * `isProtectedWorkspace`), which is right for a teacher's own schemes and wrong for a judge who has been
 * handed a link. So the surface lives in `src/components/omega/scheme-check.tsx` and this file is only its
 * mount point here; the account-free address is `/omega/check`.
 *
 * This mount passes `mode="teacher"`: a signed-in teacher gets the accept/waive buttons, the in-browser
 * ledger, and the lesson-plan handoff (spoon 12). `/omega/check` passes nothing and renders the read-only
 * transcript, byte for byte the page the README guard has been pinning since spoon 5b.
 */

import SchemeCheck from '@/components/omega/scheme-check';

export default function TeacherOmegaPage() {
  return <SchemeCheck mode="teacher" />;
}
