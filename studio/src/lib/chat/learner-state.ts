/**
 * Learner state for the tutor endpoints — read from the tables, not from a
 * process-local guess.
 *
 * This replaces `lib/personalized-learning.ts`, which held profiles, sessions
 * and progress in `Map`s and then tried to persist them with `localStorage`. A
 * Node route handler has no `localStorage`, so on Vercel every request started
 * from empty maps: the session id it minted matched nothing, the progress it
 * reported was always zero, and the learner's name was a random pick from a list
 * of Kenyan first names.
 *
 * Everything here is a query against data the app already writes:
 *
 *   `profiles`           name, grade, language preference, region
 *   `chat_sessions`      one row per tutor conversation, owned by `user_id`
 *   `chat_messages`      the transcript, and the source of the learning signals
 *   `learning_progress`  per-competency mastery, minutes and accuracy
 *   `daily_activity`     the streak counter and today's minutes
 *
 * Every function takes the caller's Supabase client. That is not ceremony: the
 * browser singleton has no cookie jar on the server, so a route handler using it
 * reaches PostgREST as `anon` and the owner policies (`auth.uid() = user_id`)
 * reject the read or write. See `src/lib/__tests__/server-route-supabase-client.test.ts`.
 *
 * Tests: `src/lib/__tests__/mwalimu-learner-state.test.ts`.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { addChatMessage } from './chat-history-supabase';

type TutorClient = SupabaseClient<Database>;

export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'reading' | 'mixed';
export type PreferredLanguage = 'english' | 'kiswahili' | 'mixed';

export interface TutorProfile {
  userId: string;
  /**
   * `profiles.full_name`. `null` means the row has no name — the tutor then says
   * "the student" rather than inventing one, which is what the old engine did.
   */
  name: string | null;
  grade: string;
  preferredLanguage: PreferredLanguage;
  region: string;
  learningStyle: LearningStyle;
  interests: string[];
  strengths: string[];
  challenges: string[];
  /** False when `profiles` had no row for this id, so callers can say so. */
  hasProfileRow: boolean;
}

export interface TutorProgress {
  /** Mean `progress_percentage` over this subject's competency rows, 0-100. */
  overallProgress: number;
  /** `daily_activity.daily_streak` from the learner's most recent active day. */
  streakDays: number;
  totalSessions: number;
  totalMessages: number;
  /** Recorded minutes per session, rounded to whole minutes. */
  averageSessionTime: number;
}

export interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LearnerState {
  profile: TutorProfile;
  progress: TutorProgress;
  /** The learner's recent turns, oldest first, across their sessions. */
  transcript: TranscriptMessage[];
}

export interface ReadLearnerStateParams {
  userId: string;
  subject: string;
  /** Used only when the profile row has no grade of its own. */
  gradeFallback: string;
}

/** How many transcript turns one read pulls back. */
const TRANSCRIPT_WINDOW = 30;
/** How many recent activity days one read sums for minutes-per-session. */
const ACTIVITY_WINDOW = 30;

const MASTERED: readonly string[] = ['proficient', 'mastered'];
const DEVELOPING: readonly string[] = ['not_started', 'emerging', 'developing'];

const STYLE_SIGNALS: Array<{ style: Exclude<LearningStyle, 'mixed'>; words: readonly string[] }> = [
  { style: 'visual', words: ['diagram', 'picture', 'draw', 'show me', 'see it', 'visual', 'chart', 'colour', 'color'] },
  { style: 'kinesthetic', words: ['counters', 'hands-on', 'hands on', 'build', 'measure', 'act out', 'move', 'cut', 'stick', 'try it', 'practise'] },
  { style: 'auditory', words: ['listen', 'hear', 'say it', 'repeat', 'rhyme', 'sing', 'aloud'] },
  { style: 'reading', words: ['read', 'notes', 'write', 'explain in words', 'text', 'book'] },
];

const INTEREST_SIGNALS: Array<{ interest: string; words: readonly string[] }> = [
  { interest: 'animals', words: ['animal', 'lion', 'elephant', 'goat', 'cow', 'bird'] },
  { interest: 'sports', words: ['sport', 'football', 'rugby', 'running', 'games'] },
  { interest: 'music', words: ['music', 'song', 'dance', 'guitar', 'drum'] },
  { interest: 'stories', words: ['story', 'stories', 'tale', 'book', 'read about'] },
  { interest: 'nature', words: ['plant', 'tree', 'river', 'rain', 'garden', 'soil'] },
];

/**
 * Derive learning style and interests from what the learner actually typed.
 *
 * The old engine wrote these onto a phantom profile record by keyword-sniffing
 * the current message, and the write went nowhere. Deriving them from the stored
 * transcript instead means the same message produces the same personalisation on
 * every request and on every cold start, because the input is a table row.
 */
export function deriveLearningSignals(userMessages: readonly string[]): {
  learningStyle: LearningStyle;
  interests: string[];
} {
  const text = userMessages.map((message) => message.toLowerCase()).join(' ');

  const learningStyle =
    STYLE_SIGNALS.find(({ words }) => words.some((word) => text.includes(word)))?.style ?? 'mixed';

  const interests = INTEREST_SIGNALS
    .filter(({ words }) => words.some((word) => text.includes(word)))
    .map(({ interest }) => interest);

  return { learningStyle, interests };
}

/**
 * The state to use when there is no session to read with — the Genkit dev flow
 * and any caller outside a request context.
 *
 * Deliberately barren: no name, no history, and the grade the caller supplied.
 * Personalisation degrades to nothing rather than to invented facts about a child.
 */
export function learnerStateWithoutHistory(
  userId: string,
  grade: string,
  subject: string,
): LearnerState {
  return {
    profile: {
      userId,
      name: null,
      grade,
      preferredLanguage: 'mixed',
      region: 'Kenya',
      learningStyle: 'mixed',
      interests: [],
      strengths: [],
      challenges: [],
      hasProfileRow: false,
    },
    progress: {
      overallProgress: 0,
      streakDays: 0,
      totalSessions: 0,
      totalMessages: 0,
      averageSessionTime: 0,
    },
    transcript: [],
  };
}

/**
 * Read one learner's whole tutor state in five indexed queries.
 *
 * Each read is independent: failures are tolerated per table so a missing
 * `learning_progress` row (a learner who has not practised yet) does not turn a
 * tutor request into a 500.
 */
export async function readLearnerState(
  client: TutorClient,
  params: ReadLearnerStateParams,
): Promise<LearnerState> {
  const { userId, subject, gradeFallback } = params;

  const [profileRow, sessions, progressRows, latestActivity, messages] = await Promise.all([
    client
      .from('profiles')
      .select('full_name, grade, language_preference, region')
      .eq('id', userId)
      .maybeSingle(),
    client
      .from('chat_sessions')
      .select('id, subject, status, message_count, started_at, last_message_at')
      .eq('user_id', userId)
      .eq('subject', subject)
      .eq('status', 'active'),
    client
      .from('learning_progress')
      .select('competency_name, progress_percentage, mastery_level, questions_asked, time_spent_minutes')
      .eq('user_id', userId)
      .eq('subject', subject),
    client
      .from('daily_activity')
      .select('activity_date, daily_streak, time_spent_minutes')
      .eq('user_id', userId)
      .order('activity_date', { ascending: false })
      .limit(ACTIVITY_WINDOW),
    client
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(TRANSCRIPT_WINDOW),
  ]);

  const profile = profileRow.data ?? null;

  const userMessages = (messages.data ?? [])
    .filter((message) => message.role === 'user')
    .map((message) => message.content);
  const signals = deriveLearningSignals(userMessages);

  const rows = progressRows.data ?? [];
  const progressPercentages = rows.map((row) => row.progress_percentage ?? 0);
  const overallProgress =
    progressPercentages.length === 0
      ? 0
      : Math.round(progressPercentages.reduce((sum, value) => sum + value, 0) / progressPercentages.length);

  const learnerSessions = sessions.data ?? [];
  const totalMessages = learnerSessions.reduce((sum, session) => sum + (session.message_count ?? 0), 0);
  const totalMinutes = (latestActivity.data ?? []).reduce(
    (sum, day) => sum + (day.time_spent_minutes ?? 0),
    0,
  );

  const subjectSessions = learnerSessions.length;

  return {
    profile: {
      userId,
      name: profile?.full_name ?? null,
      grade: profile?.grade ?? gradeFallback,
      preferredLanguage: profile?.language_preference ?? 'mixed',
      region: profile?.region ?? 'Kenya',
      learningStyle: signals.learningStyle,
      interests: signals.interests,
      strengths: rows
        .filter((row) => MASTERED.includes(row.mastery_level))
        .map((row) => row.competency_name),
      challenges: rows
        .filter((row) => DEVELOPING.includes(row.mastery_level) && (row.questions_asked ?? 0) > 0)
        .map((row) => row.competency_name),
      hasProfileRow: profile !== null,
    },
    progress: {
      overallProgress,
      // A learner with no recorded activity day has no streak. The old engine
      // could not tell the difference between "zero" and "never stored".
      streakDays: latestActivity.data?.[0]?.daily_streak ?? 0,
      totalSessions: subjectSessions,
      totalMessages,
      averageSessionTime:
        subjectSessions > 0 ? Math.round(totalMinutes / subjectSessions) : 0,
    },
    // Read newest-first so the window holds the recent turns, then put them back
    // in the order the conversation happened. System turns are scaffolding text,
    // not a conversation, so they stay out of the prompt.
    transcript: [...(messages.data ?? [])]
      .reverse()
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => ({
        role: message.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: message.content,
      })),
  };
}

export interface RecordTutorTurnParams {
  userId: string;
  sessionId: string;
  userMessage: string;
  aiResponse: string;
  provider?: string;
  model?: string;
  tokensUsed?: number;
  latencyMs?: number;
}

/**
 * Persist one tutor exchange to `chat_messages`.
 *
 * Both halves go through `addChatMessage()`, which also keeps the session's
 * `message_count` and `last_message_at` in step — the columns the student home,
 * the teacher report and the progress read here all depend on.
 *
 * Throws when the insert fails. A turn that was never stored cannot be reported
 * as stored; the caller decides whether to surface it to the learner.
 */
export async function recordTutorTurn(
  client: TutorClient,
  params: RecordTutorTurnParams,
): Promise<void> {
  await addChatMessage(params.sessionId, params.userId, 'user', params.userMessage, undefined, client);

  // `chat_messages` has a `model` column and no provider column, so when the
  // route knows only which provider answered, that is what the row records.
  await addChatMessage(
    params.sessionId,
    params.userId,
    'assistant',
    params.aiResponse,
    {
      model: params.model ?? params.provider,
      tokensUsed: params.tokensUsed,
      latencyMs: params.latencyMs,
    },
    client,
  );
}
