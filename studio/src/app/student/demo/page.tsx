import { redirect } from 'next/navigation';

/**
 * `/student/demo` is a compatibility redirect.
 *
 * It used to be an unauthenticated mock student workflow, which drifted from the
 * real LMS behaviour, the privacy rules, and the grade-first onboarding contract,
 * so it was pointed at the real `student01` sign-in card at `/login/student`.
 * That card was a second copy of the demo entry — with its own hardcoded
 * password — so on 2026-09-29 the entry collapsed to one place: `/signup`, the
 * four role workspaces. This URL still resolves so an old bookmark lands there
 * instead of 404ing.
 */
export default function StudentDemoRedirect() {
  redirect('/signup');
}
