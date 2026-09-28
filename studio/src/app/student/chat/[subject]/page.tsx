'use client';

import { useParams } from 'next/navigation';
import { StudentChatView } from '@/components/student/student-chat-view';

/**
 * `/student/chat/<subject>` — reached from the "continue with this subject"
 * action on the student home page.
 *
 * This route used to render `chat-interface.tsx`, a 546-line legacy twin that
 * talked to `/api/v1/mvp/messages` and a WebSocket nothing answers in
 * production, so the subject path reproduced the exact "Connecting forever"
 * failure the tutor had been fixed for. The twin is deleted; the URL only
 * supplies the subject label now, and the grade comes from the signed-in
 * profile rather than the `learningJourney.grade` localStorage key nothing
 * writes.
 */
export default function StudentSubjectChatPage() {
  const params = useParams();
  const subject = decodeURIComponent((params.subject as string) || '');

  return <StudentChatView subject={subject || undefined} />;
}
