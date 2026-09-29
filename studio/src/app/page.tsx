import { redirect } from 'next/navigation';
import LandingContent from '@/components/landing/landing-content';
import { getSignedInDestination } from '@/lib/auth/signed-in-destination';

/**
 * `/` routes a signed-in visitor straight to their workspace.
 *
 * This page used to be a client component with no auth awareness at all, so a
 * learner with a live session landed on the marketing page and had to press
 * "Sign In" (or worse, "Start the teacher workspace", which opens the anonymous
 * `/signup` role picker and signs a *demo* account in over theirs). The one
 * thing they were asked to do was the thing they had already done.
 *
 * Doing it on the server rather than in a `useEffect` means there is no frame
 * in which the marketing page is shown to someone who is already in — and no
 * flash of it before a client-side redirect.
 */
export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const destination = await getSignedInDestination(searchParams?.next);
  if (destination) redirect(destination);

  return <LandingContent />;
}
