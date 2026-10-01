/**
 * The scheme check inside the teacher workspace.
 *
 * `/teacher/*` is an auth-protected segment in production (`src/middleware.ts` reads
 * `isProtectedWorkspace`), which is right for a teacher's own schemes and wrong for a judge who has been
 * handed a link. So the surface lives in `src/components/omega/scheme-check.tsx` and this file is only its
 * mount point here; the account-free address is `/omega/check`.
 */

import SchemeCheck from '@/components/omega/scheme-check';

export default function TeacherOmegaPage() {
  return <SchemeCheck />;
}
