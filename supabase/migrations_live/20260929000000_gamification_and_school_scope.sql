-- =============================================================================
-- Gamification ledger + school scope columns
--
-- STATUS: PREPARED, NOT APPLIED. Nothing in this file has run against the
-- production project (tumikgwhrbvirpjswlzh). It is written so the decision to
-- apply it is reviewable as SQL rather than inferred from TypeScript.
--
-- WHY IT EXISTS. `src/lib/gamification/points-system.ts` and `getSubjectXP()`
-- in `src/lib/chat/subject-session.ts` already write to a schema that production
-- does not have:
--
--   profiles.total_points        select/update   -> 400 "column does not exist"
--   profiles.classroom_id        filter          -> same
--   profiles.school_id           filter          -> same
--   point_transactions (entire table)            -> 404
--
-- The generated client types (`src/lib/supabase/types.ts:39,67,505`) declare all
-- four, which is why the feature compiles, lints, and builds. Every call site
-- swallows its error with `console.error`, so the visible symptom is a reward
-- surface that shows zero rather than an obvious break. `getStudentHomeData()`
-- reads `profiles.total_points` on every learner-home load and reports
-- `points: null` when it fails (see lib/student/home-data.ts).
--
-- DESIGN DECISIONS, in the order they matter:
--
-- 1. The ledger is the source of truth; `profiles.total_points` is a denormalized
--    cache maintained by a trigger. The application code does
--    read-total -> add -> write-total, which is two races away from being wrong
--    (two correct answers in one second, or a retry). With `award_points()` the
--    insert and the recompute happen in one statement, and the cache can always
--    be rebuilt from `point_transactions`.
--
-- 2. `profiles.total_points` is not writable by a learner. The existing
--    `profiles_update_own` policy (baseline:802) is permissive over the whole
--    row, so simply adding the column would let a learner SET total_points =
--    999999 from the browser and appear top of their class. The
--    `profiles_total_points_immutable` trigger makes client attempts a no-op
--    instead of an error, so the reward surface keeps working while the value
--    stops being a claim the learner controls.
--
-- 3. Leaderboard reads go through one security-definer function that returns
--    display name + points, scoped to a classroom or a school. The baseline
--    profiles policies are owner-only SELECT (baseline:801,803), and that is the
--    right privacy posture for children's data under the Data Protection Act:
--    a class ranking needs names and points, not other learners' profiles. This
--    is also why `getStudentRank()` in points-system.ts (a bare
--    `.gt('total_points', ...)` count across `profiles`) cannot work as written —
--    RLS returns zero rows to it. Follow-up code task: switch that call to this
--    function with scope 'school'. It is not silently widened to a national
--    ranking because there is no product decision yet to expose minors' names
--    nationally.
--
-- 4. `school_id` / `classroom_id` land here rather than in a later multi-tenancy
--    migration because both features need the same two columns, and points-system
--    already filters on them. The FK targets (`schools`, `school_classes`) exist
--    in the baseline with the directory's public-read posture.
--
-- VERIFICATION STATUS: implemented (this file). Not tested against a scratch
-- Postgres, not applied, not deployed, not browser-verified. Do not describe any
-- of it as live until the apply + verify steps run.
-- =============================================================================

-- ── 1. The ledger ────────────────────────────────────────────────────────────
-- Columns are exactly what points-system.ts inserts:
--   awardPointsForCorrectAnswer -> base_points, difficulty_bonus, streak_bonus
--   awardMasteryBonus           -> mastery_bonus, transaction_type 'competency_mastered'
--   awardSubjectMasteryBonus    -> transaction_type 'subject_mastered',
--                                  competency_code '<subject>_subject_mastery'
-- getSubjectXP() filters competency_code LIKE '<PREFIX>%' and sums total_points,
-- and getWeeklyPointsBreakdown() groups by transaction_type since created_at, so
-- both need an index on (user_id, created_at) as well as the competency prefix.

create table if not exists public.point_transactions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  competency_code   text not null,
  -- The three types the application writes today. Keeping the check narrow means
  -- a new bonus kind has to be added here deliberately rather than silently
  -- becoming a group in the weekly breakdown nobody recognises.
  transaction_type  text not null
                    check (transaction_type in (
                      'correct_answer',
                      'competency_mastered',
                      'subject_mastered',
                      'weekly_engagement'
                    )),
  base_points       integer not null default 0 check (base_points >= 0),
  difficulty_bonus  integer not null default 0 check (difficulty_bonus >= 0),
  streak_bonus      integer not null default 0 check (streak_bonus >= 0),
  mastery_bonus     integer not null default 0 check (mastery_bonus >= 0),
  total_points      integer not null check (total_points >= 0),
  created_at        timestamp with time zone not null default now(),
  -- Audit columns the Omega boundary has been asking for: which rule pack awarded
  -- this, and which turn it belonged to.
  policy_version    text,
  correlation_id    uuid
);

comment on table public.point_transactions is
  'Append-only award ledger. Source of truth for profiles.total_points via trigger.';

create index if not exists idx_point_transactions_user_created
  on public.point_transactions (user_id, created_at desc);

-- getSubjectXP(): competency_code LIKE 'MATH.%'
create index if not exists idx_point_transactions_user_competency
  on public.point_transactions (user_id, competency_code text_pattern_ops);

alter table public.point_transactions enable row level security;
alter table public.point_transactions force row level security;

-- Owner can read their own ledger (the weekly breakdown panel) and append award
-- rows. There is deliberately no UPDATE or DELETE policy for `authenticated`:
-- a ledger a learner can edit is not a ledger.
create policy point_transactions_owner_select
  on public.point_transactions as permissive for select
  to authenticated using (user_id = (select auth.uid()));

create policy point_transactions_owner_insert
  on public.point_transactions as permissive for insert
  to authenticated with check (user_id = (select auth.uid()));

create policy point_transactions_service_all
  on public.point_transactions as permissive for all
  to service_role using (true) with check (true);

-- ── 2. profiles: points cache + school scope ─────────────────────────────────

alter table public.profiles
  add column if not exists total_points integer not null default 0
    check (total_points >= 0);

-- uuid, not text: the directory tables key on uuid and points-system passes
-- whatever id the classroom page already holds.
alter table public.profiles
  add column if not exists school_id uuid
    references public.schools(id) on delete set null;

alter table public.profiles
  add column if not exists classroom_id uuid
    references public.school_classes(id) on delete set null;

create index if not exists idx_profiles_school_points
  on public.profiles (school_id, total_points desc)
  where school_id is not null;

create index if not exists idx_profiles_classroom_points
  on public.profiles (classroom_id, total_points desc)
  where classroom_id is not null;

-- The leaderboard counts within one class, and `getClassLeaderboard()` filters
-- classroom_id then orders by total_points.
create index if not exists idx_profiles_classroom
  on public.profiles (classroom_id) where classroom_id is not null;

create index if not exists idx_profiles_school
  on public.profiles (school_id) where school_id is not null;

-- ── 3. The cache is derived, never claimed ───────────────────────────────────

create or replace function public.point_transactions_recompute_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set total_points = (
           select coalesce(sum(total_points), 0)::integer
             from public.point_transactions
            where user_id = new.user_id
         ),
         updated_at = now()
   where id = new.user_id;
  return new;
end;
$$;

comment on function public.point_transactions_recompute_total() is
  'Maintains profiles.total_points from the ledger, so application-side read-modify-write races cannot lose or double a bonus.';

drop trigger if exists point_transactions_ties_to_total on public.point_transactions;
create trigger point_transactions_ties_to_total
  after insert on public.point_transactions
  for each row execute function public.point_transactions_recompute_total();

-- profiles_update_own (baseline:802) lets a learner update their own row. Neutralise
-- that for this one column: keep whatever the ledger says, and let every other
-- column through unchanged. Silent rather than an error, because the learner-home
-- and profile-edit paths must not break over a field they never meant to touch.
create or replace function public.profiles_keep_points_authoritative()
returns trigger
language plpgsql
as $$
begin
  if new.total_points is distinct from old.total_points then
    new.total_points := old.total_points;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_total_points_immutable on public.profiles;
create trigger profiles_total_points_immutable
  before update on public.profiles
  for each row execute function public.profiles_keep_points_authoritative();

-- ── 4. Leaderboards, mediated ────────────────────────────────────────────────

create or replace function public.get_leaderboard(
  p_scope        text,
  p_scope_id     uuid,
  p_limit        integer default 20,
  p_student_id   uuid default null
)
returns table (
  rank            bigint,
  student_id      uuid,
  display_name    text,
  total_points    integer,
  is_requester    boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with scoped as (
    select p.id,
           coalesce(nullif(p.full_name, ''), 'Learner') as display_name,
           p.total_points
      from public.profiles p
     where p.role = 'student'
       and (
             (p_scope = 'classroom' and p.classroom_id = p_scope_id)
          or (p_scope = 'school'    and p.school_id    = p_scope_id)
           )
  ),
  ranked as (
    select id, display_name, total_points,
           row_number() over (order by total_points desc, id) as rank
      from scoped
     order by total_points desc, id
     limit greatest(1, least(coalesce(p_limit, 20), 100))
  )
  select r.rank,
         r.id as student_id,
         r.display_name,
         r.total_points,
         (p_student_id is not null and r.id = p_student_id) as is_requester
    from ranked r
  union all
  -- The learner's own row, so "you are #37" still renders when they are outside
  -- the displayed window.
  select s.rank, s.id, s.display_name, s.total_points, true
    from (
      select p.id,
             coalesce(nullif(p.full_name, ''), 'Learner') as display_name,
             p.total_points,
             row_number() over (order by p.total_points desc, p.id) as rank
        from public.profiles p
       where p.id = p_student_id
         and p.role = 'student'
    ) s
   where p_student_id is not null
     and not exists (select 1 from ranked r where r.id = p_student_id)
  -- Ordinal, not `order by rank`: `rank` is also a window-function keyword, and
  -- the ordinal keeps the intent unambiguous.
  order by 1
$$;

comment on function public.get_leaderboard(text, uuid, integer, uuid) is
  'Single mediated read path for class/school rankings: returns display name and points only, never a profile row. Replaces the owner-only-SELECT-bounded counts in points-system.ts.';

revoke all on function public.get_leaderboard(text, uuid, integer, uuid) from public;
grant execute on function public.get_leaderboard(text, uuid, integer, uuid) to authenticated;

-- ── 5. Atomic award ──────────────────────────────────────────────────────────

create or replace function public.award_points(
  p_user_id            uuid,
  p_competency_code    text,
  p_transaction_type   text,
  p_base_points        integer,
  p_difficulty_bonus   integer default 0,
  p_streak_bonus       integer default 0,
  p_mastery_bonus      integer default 0,
  p_policy_version     text    default null,
  p_correlation_id     uuid    default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
begin
  if p_user_id is null or p_competency_code is null or p_transaction_type is null then
    raise exception 'award_points requires user, competency and transaction type';
  end if;

  v_total := coalesce(p_base_points, 0)
           + coalesce(p_difficulty_bonus, 0)
           + coalesce(p_streak_bonus, 0)
           + coalesce(p_mastery_bonus, 0);

  if v_total < 0 then
    raise exception 'award_points cannot award a negative total';
  end if;

  insert into public.point_transactions (
    user_id, competency_code, transaction_type,
    base_points, difficulty_bonus, streak_bonus, mastery_bonus, total_points,
    policy_version, correlation_id
  ) values (
    p_user_id, p_competency_code, p_transaction_type,
    coalesce(p_base_points, 0), coalesce(p_difficulty_bonus, 0),
    coalesce(p_streak_bonus, 0), coalesce(p_mastery_bonus, 0), v_total,
    p_policy_version, p_correlation_id
  );

  return v_total;
end;
$$;

comment on function public.award_points(uuid, text, text, integer, integer, integer, integer, text, uuid) is
  'Append + recompute in one statement; the alternative is the current client-side read-modify-write in points-system.ts.';

revoke all on function public.award_points(uuid, text, text, integer, integer, integer, integer, text, uuid) from public;
grant execute on function public.award_points(uuid, text, text, integer, integer, integer, integer, text, uuid) to authenticated, service_role;

-- ── 6. Backfill ──────────────────────────────────────────────────────────────
-- Learners onboarded before school/class ids existed keep `school_name` (free
-- text) and NULL school_id. Matching on the name is exactly the weakness already
-- recorded for `school_learning_aggregates` (impersonation by copying a school
-- name), so this file deliberately does not guess the mapping. A backfill belongs
-- with the multi-tenancy work, driven by an import the school directory owns.

-- Rollback, for review only — do not run it against production:
--   drop function public.award_points(uuid, text, text, integer, integer, integer, integer, text, uuid);
--   drop function public.get_leaderboard(text, uuid, integer, uuid);
--   drop trigger profiles_total_points_immutable on public.profiles;
--   drop function public.profiles_keep_points_authoritative();
--   drop trigger point_transactions_ties_to_total on public.point_transactions;
--   drop function public.point_transactions_recompute_total();
--   alter table public.profiles drop column classroom_id, drop column school_id, drop column total_points;
--   drop table public.point_transactions;
