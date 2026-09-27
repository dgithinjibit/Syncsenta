'use client';

import { StudentChatView } from '@/components/student/student-chat-view';

/**
 * `/student/chat` with no subject: the view picks the learner's own first
 * subject from their profile. The subject deep-link route below renders the
 * same component so a subject clicked on the home page cannot land on a
 * different, older chat implementation.
 */
export default function StudentChatPage() {
  return <StudentChatView />;
}
