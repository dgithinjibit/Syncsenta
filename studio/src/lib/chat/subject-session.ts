/**
 * Subject Session Library
 *
 * Provides helpers for the subject-page flow:
 *   - SUBJECT_REGISTRY  — slug → display metadata
 *   - getSubjectXP      — XP + level for a subject from point_transactions
 *   - getOrCreateChatSession — find or open a chat session for a subject
 *   - buildLearningState     — construct LearningState from learning_progress
 *   - buildDynamicSystemPrompt — Omega-aware replacement for buildSocraticSystemPrompt
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { TutoringDecision } from '../omega-agent/metta-core';
import type { LearnerLearningContext } from './socratic-prompts';

// ─────────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────────

export interface SubjectMeta {
  label: string;
  /** 'chat'    → renders SubjectChat (blockchain, finlit, AI)
   *  'sandbox' → renders sandbox activity list (core CBC subjects) */
  layout: 'chat' | 'sandbox';
  xpPrefix: string;
}

export const SUBJECT_REGISTRY: Record<string, SubjectMeta> = {
  // Core CBC subjects (sandbox-first)
  mathematics:          { label: 'Mathematics',             layout: 'sandbox', xpPrefix: 'MATH.' },
  english:              { label: 'English',                 layout: 'sandbox', xpPrefix: 'ENG.' },
  kiswahili:            { label: 'Kiswahili',               layout: 'sandbox', xpPrefix: 'KSW.' },
  environmental:        { label: 'Environmental',           layout: 'sandbox', xpPrefix: 'ENV.' },
  creative:             { label: 'Creative Arts',           layout: 'sandbox', xpPrefix: 'CRE.' },
  cre:                  { label: 'Religious Education',     layout: 'sandbox', xpPrefix: 'CRE2.' },
  indigenous:           { label: 'Indigenous Language',     layout: 'sandbox', xpPrefix: 'IND.' },
  // Extended courses (chat-first)
  blockchain:           { label: 'Blockchain',              layout: 'chat', xpPrefix: 'blockchain.' },
  superintelligence:    { label: 'Superintelligence & AI',  layout: 'chat', xpPrefix: 'si.' },
  'financial-literacy': { label: 'Financial Literacy',      layout: 'chat', xpPrefix: 'finlit.' },
  ai:                   { label: 'Artificial Intelligence', layout: 'chat', xpPrefix: 'ai.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Default competency code per subject
//
// Used by SubjectChat when no specific competency is selected by the student.
// Gives the Omega engine a real learning_progress row to read/write from the
// very first message, instead of receiving null and defaulting all inputs to 0.
//
// Pattern: <SUBJECT_PREFIX>general  (e.g. "MATH.general", "blockchain.general")
// The route will upsert this row the first time the student chats.
// ─────────────────────────────────────────────────────────────────────────────

export function defaultCompetencyForSubject(slug: string): {
  competencyCode: string;
  competencyName: string;
} {
  const meta = SUBJECT_REGISTRY[slug];
  if (!meta) return { competencyCode: `${slug}.general`, competencyName: slug };
  const prefix = meta.xpPrefix.endsWith('.') ? meta.xpPrefix : `${meta.xpPrefix}.`;
  return {
    competencyCode: `${prefix}general`,
    competencyName: `${meta.label} — General`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// XP & Level
// ─────────────────────────────────────────────────────────────────────────────

const XP_THRESHOLDS: readonly number[] = [0, 200, 500, 1000, 2000];

export async function getSubjectXP(
  userId: string,
  subjectSlug: string,
): Promise<{ totalXP: number; level: number; nextLevelXP: number }> {
  // Import lazily so this module is safe to import in both server and browser.
  const { supabase } = await import('@/lib/supabase/client');

  const prefix = SUBJECT_REGISTRY[subjectSlug]?.xpPrefix ?? `${subjectSlug}.`;

  const { data } = await supabase
    .from('point_transactions')
    .select('total_points')
    .eq('user_id', userId)
    .like('competency_code', `${prefix}%`);

  const totalXP = (data ?? []).reduce(
    (sum: number, row: { total_points: number | null }) => sum + (row.total_points ?? 0),
    0,
  );

  const level =
    totalXP >= 2000 ? 5 :
    totalXP >= 1000 ? 4 :
    totalXP >= 500  ? 3 :
    totalXP >= 200  ? 2 : 1;

  const nextThreshold = level >= XP_THRESHOLDS.length ? Infinity : XP_THRESHOLDS[level];
  const nextLevelXP = Math.max(0, nextThreshold - totalXP);

  return { totalXP, level, nextLevelXP };
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat session
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrCreateChatSession(
  supabase: SupabaseClient,
  userId: string,
  subjectSlug: string,
  grade: string,
): Promise<{ sessionId: string; isNew: boolean }> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: existing } = await supabase
    .from('chat_sessions')
    .select('id, last_message_at')
    .eq('user_id', userId)
    .eq('subject', subjectSlug)
    .eq('status', 'active')
    .order('last_message_at', { ascending: false })
    .limit(1)
    .single();

  if (existing && existing.last_message_at > thirtyDaysAgo) {
    return { sessionId: existing.id, isNew: false };
  }

  const { data: created, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: userId,
      subject: subjectSlug,
      grade,
      mode: 'socratic',
      status: 'active',
    })
    .select('id')
    .single();

  if (error || !created) {
    throw new Error(`Failed to create chat session: ${error?.message ?? 'unknown error'}`);
  }

  return { sessionId: created.id, isNew: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Learning state
// ─────────────────────────────────────────────────────────────────────────────

export interface LearningState {
  attempts: number;
  correctAttempts: number;
  hintsUsed: number;
  frustrationSignal: boolean;
}

export function buildLearningState(masteryRow?: {
  questions_answered: number | null;
  correct_answers: number | null;
  mastery_level: string | null;
  hints_used?: number | null;
  consecutive_wrong?: number | null;
} | null): LearningState {
  const attempts = masteryRow?.questions_answered ?? 0;
  const correctAttempts = masteryRow?.correct_answers ?? 0;

  // hints_used — now read from DB (was hardcoded 0 before the migration).
  const hintsUsed = masteryRow?.hints_used ?? 0;

  // frustrationSignal — real signal: consecutive wrong turns >= 3, OR the
  // legacy heuristic (mastery stuck at not_started with attempts > 3).
  const consecutiveWrong = masteryRow?.consecutive_wrong ?? 0;
  const frustrationSignal =
    consecutiveWrong >= 3 ||
    (masteryRow?.mastery_level === 'not_started' && attempts > 3);

  return { attempts, correctAttempts, hintsUsed, frustrationSignal };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mastery percent — mirrors Rust integer truncation in agent_runtime.rs.
//
// Rust:       (correct_attempts * 100) / attempts   (integer division, floors)
// Old TS:     Math.round((correct / attempts) * 100) (rounds 39.5 → 40)
//
// The divergence matters at exact boundary values e.g. 79/100 = 79.0% and
// 80/100 = 80.0% are fine, but 3/8 = 37.5 → Rust floors to 37 (Intensive),
// old TS rounded to 38 (still Intensive, same branch).  The only dangerous
// case is Math.round(39.5) = 40 (TS → Guided) vs floor 39 (Rust → Intensive).
// Using Math.floor eliminates the divergence and keeps the TS and Rust engines
// producing identical decisions for every possible integer input.
// ─────────────────────────────────────────────────────────────────────────────
export function masteryPercent(attempts: number, correctAttempts: number): number {
  if (attempts === 0) return 0;
  return Math.floor((Math.min(correctAttempts, attempts) * 100) / attempts);
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic system prompt
// ─────────────────────────────────────────────────────────────────────────────

const SCAFFOLDING_INSTRUCTIONS: Record<TutoringDecision['scaffolding'], string> = {
  Independent:
    'The student is performing well. Ask open-ended questions. ' +
    'Do NOT give the answer. Let them reason through it independently.',
  Guided:
    'Ask ONE guiding question per turn. ' +
    'Acknowledge what is correct before redirecting. ' +
    'Do not give the complete answer.',
  Intensive:
    'Break the concept into the smallest possible step. ' +
    'Present one step, check understanding, then move to the next. ' +
    'Use concrete Kenyan examples (matatus, shillings, everyday life).',
};

export function buildDynamicSystemPrompt(params: {
  decision: TutoringDecision;
  subject: string;
  grade: string;
  language: 'english' | 'kiswahili' | 'mixed';
  studentName?: string;
  learnerContext: LearnerLearningContext;
}): string {
  const { decision, subject, grade, language, studentName, learnerContext } = params;

  const lines = [
    `You are syncsenta, a patient Kenyan tutor for ${grade} students.`,
    `Subject: ${subject}. Language: ${language}.`,
    `Student: ${studentName ?? 'the student'}.`,
    `Scaffolding level: ${decision.scaffolding}.`,
    SCAFFOLDING_INSTRUCTIONS[decision.scaffolding],
    decision.hint,
    learnerContext.currentCompetency
      ? `Current competency: ${learnerContext.currentCompetency} ` +
        `(mastery: ${learnerContext.masteryLevel}, ` +
        `${learnerContext.progressPercentage}% correct).`
      : '',
    "Always respond in the student's language. " +
    'Mix Kiswahili and English naturally if language is "mixed".',
  ];

  return lines.filter(Boolean).join('\n');
}
