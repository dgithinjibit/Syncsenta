/**
 * Scaffolding Outcome Telemetry
 *
 * Tracks whether students actually improve after the Omega engine places them
 * in Intensive / Guided / Independent mode. Without this data there is no way
 * to know if the scaffolding thresholds (40% / 80%) are calibrated correctly.
 *
 * Data model:
 *   Each chat turn writes a lightweight row to `omega_scaffolding_events`.
 *   A nightly aggregate job (or Supabase trigger) can compute:
 *     - Average mastery delta per scaffolding level
 *     - Time-to-promotion from Intensive → Guided → Independent
 *     - Scaffolding level vs correct_answers rate correlation
 *
 * Table schema (see migration below):
 *   omega_scaffolding_events (
 *     id            uuid primary key default gen_random_uuid(),
 *     user_id       uuid references auth.users not null,
 *     competency_code text not null,
 *     session_id    uuid,
 *     scaffolding   text not null,   -- 'Independent' | 'Guided' | 'Intensive'
 *     mastery_pct   int not null,    -- mastery at the START of this turn
 *     answer_quality text not null,  -- 'correct' | 'incorrect' | 'partial' | 'unanswered'
 *     hints_used    int not null,
 *     consecutive_wrong int not null,
 *     frustration_signal boolean not null,
 *     created_at    timestamptz default now()
 *   )
 *
 * The migration file is at:
 *   supabase/migrations/20260907000001_omega_scaffolding_events.sql
 */

import type { AnswerQuality } from './answer-quality';
import type { TutoringDecision } from './metta-core';
import { masteryPercent } from '@/lib/chat/subject-session';

export interface ScaffoldingEventPayload {
  userId: string;
  competencyCode: string;
  sessionId: string | undefined;
  scaffolding: TutoringDecision['scaffolding'];
  masteryPct: number;
  answerQuality: AnswerQuality;
  hintsUsed: number;
  consecutiveWrong: number;
  frustrationSignal: boolean;
}

/**
 * Build a payload ready to INSERT into omega_scaffolding_events.
 * Pure function — no I/O. The caller is responsible for the Supabase write.
 */
export function buildScaffoldingEventPayload(params: {
  userId: string;
  competencyCode: string;
  sessionId: string | undefined;
  decision: TutoringDecision;
  attempts: number;
  correctAttempts: number;
  hintsUsed: number;
  consecutiveWrong: number;
  frustrationSignal: boolean;
  answerQuality: AnswerQuality;
}): ScaffoldingEventPayload {
  return {
    userId: params.userId,
    competencyCode: params.competencyCode,
    sessionId: params.sessionId,
    scaffolding: params.decision.scaffolding,
    masteryPct: masteryPercent(params.attempts, params.correctAttempts),
    answerQuality: params.answerQuality,
    hintsUsed: params.hintsUsed,
    consecutiveWrong: params.consecutiveWrong,
    frustrationSignal: params.frustrationSignal,
  };
}

/**
 * Converts the payload to a Supabase-ready insert object (snake_case columns).
 */
export function payloadToDbRow(p: ScaffoldingEventPayload): Record<string, unknown> {
  return {
    user_id:           p.userId,
    competency_code:   p.competencyCode,
    session_id:        p.sessionId ?? null,
    scaffolding:       p.scaffolding,
    mastery_pct:       p.masteryPct,
    answer_quality:    p.answerQuality,
    hints_used:        p.hintsUsed,
    consecutive_wrong: p.consecutiveWrong,
    frustration_signal: p.frustrationSignal,
  };
}
