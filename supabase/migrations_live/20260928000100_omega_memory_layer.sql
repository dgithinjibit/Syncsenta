-- ─────────────────────────────────────────────────────────────────────────────
-- Omega memory layer: the tables the tutor path writes to.
--
-- Applied to the live project (ref tumikgwhrbvirpjswlzh) on 2026-09-28, the same
-- day `20260928000000_live_baseline.sql` captured it. Before this file, the
-- learner-facing tutor at `/api/chat` ran its reasoning engine and then failed,
-- silently, on every persistence call: 9 writes and 5 reads aimed at tables that
-- production did not have. The measured failure list, with the call sites:
--
--   learning_progress        select  app/api/chat/route.ts:301   (mastery → scaffolding)
--   learning_progress        update  app/api/chat/route.ts:634   (hints_used, consecutive_wrong)
--   learning_progress        select+insert+update lib/progress/progress-tracking.ts:61,86,118
--   chat_sessions            insert  app/api/chat/route.ts:355, lib/chat/chat-history-supabase.ts:48
--   chat_messages            insert  lib/chat/chat-history-supabase.ts:186
--   api_usage                insert  app/api/chat/route.ts:534, :689
--   rpc increment_daily_quota        app/api/chat/route.ts:693
--   omega_scaffolding_events insert  app/api/chat/route.ts:660
--
-- Column-for-column, this file comes from `studio/src/lib/supabase/types.ts`, the
-- generated client that shipped with the app. That file describes profiles,
-- chat_sessions, chat_messages, learning_progress, daily_activity, achievements,
-- api_usage and daily_quotas plus two quota functions — a schema that was real
-- somewhere once, because nothing hand-writes a contract this consistent with the
-- call sites. Production had none of it except `profiles`. So this is a
-- reconstruction from the app's own type contract, not an invention, and every
-- column below is read or written by code that exists today.
--
-- `omega_scaffolding_events` and its summary view come verbatim from
-- `studio/supabase/migrations/20260907000001_omega_scaffolding_events.sql`, which
-- was committed on 2026-09-07 and never applied anywhere.
--
-- Two things this file does NOT fix, deliberately:
--
--   1. `lib/progress/progress-tracking.ts` imports the browser singleton
--      (`createBrowserClient` from lib/supabase/client). On the server that
--      degrades to memory storage with no session token, so its writes arrive at
--      PostgREST as `anon` and RLS will refuse them. That is a code defect and it
--      needs a code fix, verified by watching a real turn fail — not a schema
--      workaround. See the note at the bottom of this file.
--   2. `increment_daily_quota` is defined here because the app calls it, but
--      `check_daily_quota` — the function that would enforce it — is called by
--      nobody. Chat rate limiting is Upstash (lib/session/rate-limit-upstash.ts),
--      keyed on `UPSTASH_REDIS_REST_URL`. So the quota columns below are
--      bookkeeping, not a limit. Do not describe them to a school as enforcement.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══ chat_sessions ═══════════════════════════════════════════════════════════
-- One row per tutor conversation. `grade` is stored as the dashboard writes it
-- ("Grade 8"), which is what `verifiedGrade = profile.grade || body.grade` at
-- app/api/chat/route.ts:253 compares against.

create table if not exists public.chat_sessions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  subject             text not null,
  grade               text not null,
  mode                text not null default 'socratic'
                      check (mode in ('socratic', 'compass', 'homework_help')),
  teacher_context     text,
  learning_objective  text,
  title               text,
  message_count       integer not null default 0,
  started_at          timestamptz not null default now(),
  last_message_at     timestamptz default now(),
  ended_at            timestamptz,
  status              text not null default 'active'
                      check (status in ('active', 'archived', 'deleted'))
);

comment on table public.chat_sessions is
  'Tutor conversations. Written by /api/chat and lib/chat/chat-history-supabase.ts.';

create index if not exists idx_chat_sessions_user_status_recent
  on public.chat_sessions (user_id, status, last_message_at desc);

alter table public.chat_sessions enable row level security;
alter table public.chat_sessions force row level security;

drop policy if exists "chat_sessions_owner_rw" on public.chat_sessions;
create policy "chat_sessions_owner_rw" on public.chat_sessions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ═══ chat_messages ═══════════════════════════════════════════════════════════
-- The transcript. `choices`/`selected_choice` are the Socratic multiple-choice
-- turns; `helpful`/`feedback_comment` are the thumbs-up path that teachers read.

create table if not exists public.chat_messages (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.chat_sessions(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  role              text not null check (role in ('user', 'assistant', 'system')),
  content           text not null,
  tokens_used       integer,
  model             text,
  latency_ms        integer,
  choices           text[],
  selected_choice   text,
  helpful           boolean,
  feedback_comment  text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_chat_messages_session_time
  on public.chat_messages (session_id, created_at);

create index if not exists idx_chat_messages_user_time
  on public.chat_messages (user_id, created_at desc);

alter table public.chat_messages enable row level security;
alter table public.chat_messages force row level security;

drop policy if exists "chat_messages_owner_rw" on public.chat_messages;
create policy "chat_messages_owner_rw" on public.chat_messages
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ═══ learning_progress ═══════════════════════════════════════════════════════
-- THE table Omega reads to decide scaffolding. Without it every learner is a
-- blank slate on every turn, which is why the 40%/80% thresholds in
-- lib/omega-agent/metta-core.ts could not be evaluated.
--
-- `hints_used` and `consecutive_wrong` are written directly by /api/chat:634;
-- the counter columns are written by updateLearningProgress(). Note there is no
-- created_at/updated_at here — types.ts never had them, and adding columns the
-- generated client does not know about would make the two drift.

create table if not exists public.learning_progress (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  subject              text not null,
  grade                text not null,
  competency_code      text not null,
  competency_name      text not null,
  strand               text,
  mastery_level        text not null default 'not_started'
                       check (mastery_level in ('not_started', 'emerging', 'developing', 'proficient', 'mastered')),
  progress_percentage  integer not null default 0 check (progress_percentage between 0 and 100),
  questions_asked      integer not null default 0,
  questions_answered   integer not null default 0,
  practice_count       integer not null default 0,
  correct_answers      integer not null default 0,
  time_spent_minutes   integer not null default 0,
  first_attempted_at   timestamptz not null default now(),
  last_practiced_at    timestamptz not null default now(),
  mastered_at          timestamptz,
  hints_used           integer not null default 0,
  consecutive_wrong    integer not null default 0,
  -- updateLearningProgress() does select-then-insert keyed on exactly this pair
  -- (lib/progress/progress-tracking.ts:63-64), so a second row per competency
  -- would make the counters race.
  constraint learning_progress_user_competency_key unique (user_id, competency_code)
);

create index if not exists idx_learning_progress_user_recent
  on public.learning_progress (user_id, last_practiced_at desc);

-- /api/chat:301-311 filters user_id + subject + grade and orders by
-- last_practiced_at, limit 5.
create index if not exists idx_learning_progress_user_subject_grade
  on public.learning_progress (user_id, subject, grade, last_practiced_at desc);

alter table public.learning_progress enable row level security;
alter table public.learning_progress force row level security;

drop policy if exists "learning_progress_owner_rw" on public.learning_progress;
create policy "learning_progress_owner_rw" on public.learning_progress
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ═══ daily_activity ══════════════════════════════════════════════════════════
-- Streaks and "days practised", read by getStudentStats()/calculateStreak().

create table if not exists public.daily_activity (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  activity_date      date not null,
  messages_sent      integer not null default 0,
  sessions_started   integer not null default 0,
  time_spent_minutes integer not null default 0,
  subjects_practiced text[],
  daily_streak       integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint daily_activity_user_date_key unique (user_id, activity_date)
);

alter table public.daily_activity enable row level security;
alter table public.daily_activity force row level security;

drop policy if exists "daily_activity_owner_rw" on public.daily_activity;
create policy "daily_activity_owner_rw" on public.daily_activity
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ═══ achievements ════════════════════════════════════════════════════════════
-- awardAchievement() fires the moment a competency reaches 'mastered'
-- (lib/progress/progress-tracking.ts:105). A test learner who answers 20+
-- questions correctly hits this, so it has to exist or the write throws.

create table if not exists public.achievements (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  achievement_type       text not null,
  achievement_name       text not null,
  achievement_description text,
  badge_icon             text,
  earned_at              timestamptz not null default now()
);

create index if not exists idx_achievements_user_time
  on public.achievements (user_id, earned_at desc);

alter table public.achievements enable row level security;
alter table public.achievements force row level security;

drop policy if exists "achievements_owner_read" on public.achievements;
create policy "achievements_owner_read" on public.achievements
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ═══ api_usage ═══════════════════════════════════════════════════════════════
-- Metering, written twice per turn by the service-role client
-- (/api/chat:534 on upstream failure, :689 on success). Service role bypasses RLS;
-- no `authenticated` policy on purpose — a learner has no reason to read billing
-- rows, and the anon key must not be able to enumerate other users' usage.

create table if not exists public.api_usage (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  endpoint     text not null,
  method       text not null,
  tokens_used  integer,
  cost_usd     numeric(12,6),
  status_code  integer,
  latency_ms   integer,
  ip_address   text,
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_api_usage_user_time
  on public.api_usage (user_id, created_at desc);

create index if not exists idx_api_usage_endpoint_time
  on public.api_usage (endpoint, created_at desc);

alter table public.api_usage enable row level security;
alter table public.api_usage force row level security;

-- ═══ daily_quotas ════════════════════════════════════════════════════════════
-- Backing store for increment_daily_quota() / check_daily_quota(). Bookkeeping
-- only until something calls check_daily_quota — see the header note.

create table if not exists public.daily_quotas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  quota_date      date not null default (now() at time zone 'utc')::date,
  messages_used   integer not null default 0,
  messages_limit  integer not null default 25,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint daily_quotas_user_date_key unique (user_id, quota_date)
);

alter table public.daily_quotas enable row level security;
alter table public.daily_quotas force row level security;

-- ═══ omega_scaffolding_events ════════════════════════════════════════════════
-- The data the user asked for: one row per turn, carrying the scaffolding level
-- Omega chose and the outcome. From studio/supabase/migrations/
-- 20260907000001_omega_scaffolding_events.sql, committed and never applied.

create table if not exists public.omega_scaffolding_events (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  competency_code    text not null,
  session_id         uuid,
  scaffolding        text not null check (scaffolding in ('Independent', 'Guided', 'Intensive')),
  mastery_pct        smallint not null check (mastery_pct between 0 and 100),
  answer_quality     text not null check (answer_quality in ('correct', 'incorrect', 'partial', 'unanswered')),
  hints_used         smallint not null default 0,
  consecutive_wrong  smallint not null default 0,
  frustration_signal boolean not null default false,
  created_at         timestamptz not null default now()
);

comment on table public.omega_scaffolding_events is
  'One row per chat turn: the scaffolding level Omega chose and the outcome. '
  'Append-only; this is the table that answers whether 40%/80% are the right thresholds.';

create index if not exists idx_omega_events_user_competency_time
  on public.omega_scaffolding_events (user_id, competency_code, created_at desc);

create index if not exists idx_omega_events_scaffolding_quality
  on public.omega_scaffolding_events (scaffolding, answer_quality, created_at desc);

alter table public.omega_scaffolding_events enable row level security;
alter table public.omega_scaffolding_events force row level security;

drop policy if exists "omega_events_student_select" on public.omega_scaffolding_events;
create policy "omega_events_student_select" on public.omega_scaffolding_events
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Only the service role inserts. RLS with no insert policy denies every client
-- role, and service_role bypasses RLS entirely, which is what /api/chat:660 uses.

-- ═══ omega_scaffolding_summary ═══════════════════════════════════════════════
-- security_invoker = on: a plain view would run as its owner and hand every
-- signed-in learner the aggregate across the whole school. Production has zero
-- views today, so this is the first one — it must not become the first leak.

create or replace view public.omega_scaffolding_summary
  with (security_invoker = on) as
select
  competency_code,
  scaffolding,
  answer_quality,
  count(*)                                        as turn_count,
  round(avg(mastery_pct), 1)                      as avg_mastery_pct,
  round(avg(hints_used), 2)                       as avg_hints_used,
  round(avg(consecutive_wrong), 2)                as avg_consecutive_wrong,
  sum(case when frustration_signal then 1 else 0 end) as frustrated_count
from public.omega_scaffolding_events
group by competency_code, scaffolding, answer_quality;

comment on view public.omega_scaffolding_summary is
  'Aggregated scaffolding outcomes per competency, used to check the 40%/80% '
  'threshold calibration. security_invoker: RLS applies, so a learner sees only their own.';

-- ═══ quota functions ══════════════════════════════════════════════════════════
-- Signatures exactly as studio/src/lib/supabase/types.ts declares them:
--   increment_daily_quota(p_user_id text) -> void
--   check_daily_quota(p_user_id text)     -> boolean
-- types.ts says `text` for these uuids, and the app passes `user.id`, so the
-- parameter is text and cast on use rather than a uuid the client cannot bind.

create or replace function public.increment_daily_quota(p_user_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.daily_quotas (user_id, quota_date, messages_used)
  values (p_user_id::uuid, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, quota_date)
    do update set messages_used = public.daily_quotas.messages_used + 1,
                  updated_at    = now();
end;
$$;

comment on function public.increment_daily_quota(p_user_id text) is
  'Called by /api/chat once per successful turn. Maintains daily_quotas; does not '
  'enforce anything — nothing calls check_daily_quota yet.';

create or replace function public.check_daily_quota(p_user_id text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_limit   integer;
  v_used    integer;
  v_tier    text;
begin
  select subscription_tier into v_tier from public.profiles where id = p_user_id::uuid;
  -- Unprofiled caller gets the free allowance rather than a free pass.
  v_limit := case v_tier when 'premium' then 200 when 'school' then 200 else 25 end;

  select messages_used into v_used
    from public.daily_quotas
   where user_id = p_user_id::uuid
     and quota_date = (now() at time zone 'utc')::date;

  return coalesce(v_used, 0) < v_limit;
end;
$$;

comment on function public.check_daily_quota(p_user_id text) is
  'Defined to complete the contract types.ts describes. No caller in the app today: '
  'chat limiting goes through Upstash. The 25/200 numbers are a placeholder, not a '
  'decision anyone has made.';

-- ═══ grants ══════════════════════════════════════════════════════════════════
-- Production's `alter default privileges` already gives postgres/anon/
-- authenticated/service_role everything on new public tables, so these statements
-- should be no-ops. They are here because a default-privilege entry belongs to the
-- role that created it, and this script may be run by a role that never set one.
-- `anon` gets nothing explicitly and has no policy, so it can read zero rows from
-- any table above; the RLS policies, not the grants, are the boundary.

grant select, insert, update, delete on
  public.chat_sessions, public.chat_messages, public.learning_progress,
  public.daily_activity, public.achievements, public.api_usage,
  public.daily_quotas, public.omega_scaffolding_events
  to authenticated, service_role;

grant select on public.omega_scaffolding_summary to authenticated, service_role;

grant execute on function public.increment_daily_quota(text) to authenticated, service_role;
grant execute on function public.check_daily_quota(text) to authenticated, service_role;

-- The event trigger `rls_auto_enable` already present in production enables RLS
-- on any new public table; the explicit statements above are not redundant, they
-- are the record of intent for whoever reads this file after the trigger.

-- ─────────────────────────────────────────────────────────────────────────────
-- Post-application checklist, in order:
--
--   1. Confirm 8 tables + 1 view + 2 functions exist (query at the bottom).
--   2. Run one real tutor turn as a signed-in student. Then:
--        select count(*) from chat_sessions;        -- expect 1
--        select count(*) from chat_messages;        -- expect >= 1
--        select count(*) from api_usage;            -- expect 1
--        select count(*) from omega_scaffolding_events;  -- expect 1
--   3. Then learning_progress. If chat_sessions fills and learning_progress does
--      not, the progress-tracking.ts browser-client defect described at the top
--      is confirmed, and the fix is to pass the route's authenticated client in.
-- ─────────────────────────────────────────────────────────────────────────────
-- select table_name from information_schema.tables
--   where table_schema = 'public' and table_name in
--     ('chat_sessions','chat_messages','learning_progress','daily_activity',
--      'achievements','api_usage','daily_quotas','omega_scaffolding_events')
--   order by table_name;
