-- =============================================================================
-- Gamification ledger + school scope columns
--
-- STATUS: APPLIED to production (tumikgwhrbvirpjswlzh) on 2026-09-29, as one
-- transaction through the Supabase SQL editor, then re-read from the live catalog
-- and exercised with real calls. The evidence is in the VERIFICATION block at the
-- bottom of this file. Applying it was authorised on one condition — that the reason
-- and the after-the-fact verification be written down — so the three defects that
-- only executing it surfaced (defects 3, 4 and 5) are recorded here, not in a commit
-- message nobody will read against a live schema.
--
-- The applied version is not byte-identical to the first draft: the recompute
-- trigger gained DELETE coverage (defect 3), both RPCs lost anon EXECUTE (defect 4),
-- and get_leaderboard's requester branch was reworked (defect 5). Each fix is
-- described where it sits.
--
-- WHY IT EXISTS. `src/lib/gamification/points-system.ts` and `getSubjectXP()`
-- in `src/lib/chat/subject-session.ts` already wrote to a schema production did not
-- have, up to the apply recorded below:
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
-- What that leaves after this file is applied: the four reads above now resolve, so
-- `points: null` becomes `points: 0` — honest, because the ledger is empty and
-- nothing in the app calls `award_points()` yet. The zero does not become a number
-- until the writer is mounted behind a route handler; that is the follow-up code
-- task, not this file.
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
--    function. The owner picked the classroom board on 2026-09-29 ("class it is"),
--    so the call site will pass scope 'classroom'; 'school' stays available because
--    the directory already treats a school as a public entity and a teacher needs
--    it. Neither is widened to a national ranking — there is no product decision to
--    expose minors' names beyond their own school.
--
-- 4. `school_id` / `classroom_id` land here rather than in a later multi-tenancy
--    migration because both features need the same two columns, and points-system
--    already filters on them. The FK targets (`schools`, `school_classes`) exist
--    in the baseline with the directory's public-read posture.
--
-- 5. Only the server issues an award. An earlier draft of this file gave
--    `authenticated` an INSERT policy on the ledger and EXECUTE on award_points().
--    That contradicts decision 2 — it closes the column and leaves the ledger that
--    feeds it writable by anyone holding a token, with every amount taken from the
--    request body. Reading the file against itself is what caught it; see §5's
--    comment for the reasoning and what has to happen before gamification mounts.
--
-- VERIFICATION STATUS: applied and verified against production on 2026-09-29.
--
-- Before applying, the file was reviewed against `20260928000000_live_baseline.sql`
-- on 2026-09-29, which confirmed every object this file assumes: `schools.id` and
-- `school_classes.id` are uuid, `profiles` has full_name/role/updated_at and does
-- *not* have total_points, school_id or classroom_id, and `point_transactions` does
-- not exist in production. Two defects were caught in that read — the guard
-- reverting its own recompute (defect 1) and the client-callable award path
-- (defect 2).
--
-- Reading the rest of it was not enough. Applying it and then probing found three
-- more (defects 3-5), all of them invisible on the page: Supabase's default
-- privileges hand EXECUTE on a new function to `anon` whatever you revoke around it;
-- the leaderboard's own row could be reported for a learner outside the requested
-- scope; and a cache trigger that only fires on INSERT is not a cache. This machine
-- has no psql, docker or supabase CLI, so there is no scratch Postgres to have
-- found them in — the only way they surfaced was executing against the live project,
-- which is what the owner authorised, conditional on recording why. The recorded
-- output of each check is in the VERIFICATION block at the bottom of this file, and
-- the position against the plan is in docs/ROADMAP.md.
--
-- Defects are numbered within this file. They are not the roadmap's Stage 1 defect
-- numbers — the roadmap's Stage 1 defect 4 *is* this migration.
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

-- Owner can read their own ledger (the weekly breakdown panel). There is
-- deliberately NO insert policy for `authenticated`: see decision 5.
create policy point_transactions_owner_select
  on public.point_transactions as permissive for select
  to authenticated using (user_id = (select auth.uid()));

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
--
-- These two triggers are one mechanism and have to be read together.
--
-- `point_transactions_ties_to_total` recomputes profiles.total_points from the
-- ledger. `profiles_total_points_immutable` refuses any change to that same
-- column. Without a handshake between them the guard wins: the recompute's own
-- UPDATE is a change to total_points, gets reverted by the guard, and the ledger
-- silently never reaches the column the app reads — which is the zero-everywhere
-- symptom this migration exists to remove. (This was defect 1, found by re-reading
-- the file before applying it, not by Postgres telling anyone.)
--
-- The handshake is a transaction-local flag that only the recompute sets. A
-- browser cannot raise it: PostgREST lets a client influence `request.*` GUCs and
-- nothing else, and `set_config(..., is_local => true)` is dropped when the
-- transaction ends, so a pooled connection cannot carry it into someone else's
-- request.
--
-- It fires on DELETE as well as INSERT, and reads old.user_id when tg_op says so.
-- That is defect 3, found by running the cleanup step after the apply: with the
-- INSERT-only trigger the draft shipped with, removing a ledger row left
-- profiles.total_points at 10 over an empty ledger. A cache that only moves one way
-- is not derived from the ledger, it is a second claim that can drift — and unlike
-- defect 1 this one was invisible on the page, because the INSERT path looks
-- perfectly correct in a read-through.

create or replace function public.point_transactions_recompute_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  if tg_op = 'DELETE' then
    v_user := old.user_id;
  else
    v_user := new.user_id;
  end if;

  perform set_config('syncsenta.points_recompute', 'on', true);
  update public.profiles
     set total_points = (
           select coalesce(sum(total_points), 0)::integer
             from public.point_transactions
            where user_id = v_user
         ),
         updated_at = now()
   where id = v_user;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

comment on function public.point_transactions_recompute_total() is
  'Maintains profiles.total_points from the ledger on award and on removal, so application-side read-modify-write races cannot lose or double a bonus. Sets syncsenta.points_recompute so profiles_total_points_immutable lets its own write through.';

drop trigger if exists point_transactions_ties_to_total on public.point_transactions;
create trigger point_transactions_ties_to_total
  after insert or delete on public.point_transactions
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
  if new.total_points is distinct from old.total_points
     and coalesce(current_setting('syncsenta.points_recompute', true), 'off') <> 'on' then
    new.total_points := old.total_points;
  end if;
  return new;
end;
$$;

comment on function public.profiles_keep_points_authoritative() is
  'profiles.total_points is a cache of point_transactions. Any UPDATE that is not the ledger recompute keeps the stored value, so the column stops being a claim a learner controls.';

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
  ),
  -- Defect 5, found by calling this function and reading what came back.
  -- The first draft built the requester's own row by scanning `profiles` for
  -- p_student_id, which ignores p_scope entirely: ask for the classroom board and
  -- get a school-wide rank, or hand a scope id you have no claim on and still get a
  -- named row for someone else. It also did not check that p_student_id belongs to
  -- the caller, so any authenticated learner could pass another learner's uuid and
  -- be shown that learner's points — the one field this migration makes unreadable
  -- through `profiles` by direct select. RLS cannot help here because the function
  -- is security definer; the scope and the identity check are the whole boundary.
  --
  -- So: the requester row now comes from `scoped` (the same set the board ranks),
  -- and only for the caller. A service-role or non-JWT caller keeps the wider
  -- behaviour because there `auth.uid()` is null and the server is trusted to have
  -- chosen the id; a browser caller gets their own row or nothing. Verified in two
  -- ways below — the real call returns the requester row, and the arbitrary-scope
  -- probes return zero rows.
  requester as (
    select s.id, s.display_name, s.total_points,
           row_number() over (order by s.total_points desc, s.id) as rank
      from scoped s
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
  select q.rank, q.id, q.display_name, q.total_points, true
    from requester q
   where p_student_id is not null
     and q.id = p_student_id
     and (auth.uid() is null or p_student_id = auth.uid())
     and not exists (select 1 from ranked r where r.id = p_student_id)
  -- Ordinal, not `order by rank`: `rank` is also a window-function keyword, and
  -- the ordinal keeps the intent unambiguous.
  order by 1
$$;

comment on function public.get_leaderboard(text, uuid, integer, uuid) is
  'Single mediated read path for class/school rankings: returns display name and points only, never a profile row. Replaces the owner-only-SELECT-bounded counts in points-system.ts. The own-row branch is scoped and caller-checked.';

-- Defect 4, found by reading pg_proc after the apply rather than before it.
-- Supabase's ALTER DEFAULT PRIVILEGES grants EXECUTE on every new function in the
-- public schema to anon, authenticated and service_role at creation time. `revoke
-- all … from public` does not touch those three, because a default privilege is an
-- explicit grant to each role, not the pseudo-role PUBLIC. So the first draft of
-- this section shipped `get_leaderboard` to unauthenticated callers and
-- `award_points` to anonymous token minters, whichever way the argument checks
-- leaned. The explicit `from anon` lines are what actually closes it; the `from
-- public` line alone would have looked correct on the page and been inert.
revoke all on function public.get_leaderboard(text, uuid, integer, uuid) from public;
revoke execute on function public.get_leaderboard(text, uuid, integer, uuid) from anon;
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

  -- Decision 5. A caller carrying a learner's JWT may only ever award to that
  -- learner; the service role (no JWT, auth.uid() is null) is the only path that
  -- may write anyone else's ledger, and that is what an API route or the Rust
  -- backend uses. Without this the function is a way to move points to any uuid.
  if auth.uid() is not null and p_user_id <> auth.uid() then
    raise exception 'award_points cannot award to another user';
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
revoke all on function public.award_points(uuid, text, text, integer, integer, integer, integer, text, uuid) from anon;
revoke all on function public.award_points(uuid, text, text, integer, integer, integer, integer, text, uuid) from authenticated;
grant execute on function public.award_points(uuid, text, text, integer, integer, integer, integer, text, uuid) to service_role;

-- The `from anon` line is defect 4's other half, and the one that mattered most:
-- Supabase's ALTER DEFAULT PRIVILEGES had already handed EXECUTE to anon at create
-- time, and revoking from PUBLIC and from authenticated left it in place. An
-- anonymous caller with the publishable key could have reached a security-definer
-- function that inserts into a child's points ledger. Read back from pg_proc after
-- the fix, the only grantees are postgres and service_role (see V6 below).
--
-- Why `authenticated` is not in that grant. Every amount above arrives as an
-- argument, so a browser-callable award function is a point printer: POST
-- award_points(1000, 'correct_answer', 1000) as often as the network allows. The
-- learner-home guard on the column is worth nothing if the ledger feeding it can
-- be written by whoever is holding a token. An award has to be issued by code that
-- verified the thing being rewarded, which means a Next route handler or the Rust
-- backend using the service client.
--
-- Nothing breaks by this being narrow. As of 2026-09-29 `lib/gamification/points-system.ts`
-- — the only writer — has no importer anywhere in src/, so it is dead code, and its
-- direct client-side `.insert()` into point_transactions is exactly the write the
-- policy now refuses. Task: when gamification is mounted for real, its awards move
-- behind a route that calls this function, and the ledger keeps one author.

-- ── 6. Backfill ──────────────────────────────────────────────────────────────
-- Learners onboarded before school/class ids existed keep `school_name` (free
-- text) and NULL school_id. Matching on the name is exactly the weakness already
-- recorded for `school_learning_aggregates` (impersonation by copying a school
-- name), so this file deliberately does not guess the mapping. A backfill belongs
-- with the multi-tenancy work, driven by an import the school directory owns.

-- Rollback. This is now the documented reversal of an applied migration rather than
-- a review note, so it is written to be run only with the owner's go-ahead, and only
-- knowing that dropping three `profiles` columns is not reversible without a restore.
-- Order matters: the functions depend on the table's trigger, and the trigger
-- functions must go before the columns they read. As of 2026-09-29 nothing holds
-- data in these columns except this file's own objects (the ledger verified empty
-- after cleanup), so the window in which rollback is cheap is now.
--   drop function public.award_points(uuid, text, text, integer, integer, integer, integer, text, uuid);
--   drop function public.get_leaderboard(text, uuid, integer, uuid);
--   drop trigger profiles_total_points_immutable on public.profiles;
--   drop function public.profiles_keep_points_authoritative();
--   drop trigger point_transactions_ties_to_total on public.point_transactions;
--   drop function public.point_transactions_recompute_total();
--   alter table public.profiles drop column classroom_id, drop column school_id, drop column total_points;
--   drop table public.point_transactions;

-- =============================================================================
-- VERIFICATION — executed against production on 2026-09-29, output recorded.
--
-- These were written as prescriptions ("run these after applying") and then run.
-- They are now the record of what production was observed to do, because "pasted
-- into the editor" is not evidence. The owner's condition on touching production
-- was that the change be verifiable afterwards; this block is that verification.
--
-- How it was run: the Supabase dashboard SQL editor, which connects as `postgres`
-- (confirmed BYPASSRLS: `pg_roles.rolbypassrls` = true for that role). That is
-- stronger than the app's path, so the checks that needed a browser identity
-- emulated one — `begin; set local role authenticated; select
-- set_config('request.jwt.claims','{"sub":"…","role":"authenticated"}',true); …
-- rollback;` — which makes `auth.uid()` resolve the way PostgREST sets it.
--
-- Test learner: 4c047d3a-bb02-4c00-9340-51ceaddb0f8b ("Caleb Test Learner").
-- Directory state at the time: 51 schools, 0 school_classes, 4 student profiles,
-- 0 profiles carrying a classroom_id. So the classroom board had no rows to show
-- and V4 exercises the school scope; the classroom path is code-reviewed only, and
-- that gap is recorded rather than glossed.
-- =============================================================================
--
-- V1. The catalog agrees. Expected and returned:
--     ledger_table=1  ledger_cols=12  new_cols=3  triggers=2  policies=2
--     funcs=4  new_indexes=6  rls_flags=2 (enabled and forced)  new_fks=2
--   Queried from information_schema.tables/columns, pg_trigger (not tgisinternal),
--   pg_policy, pg_class.reloptions for the RLS flags, pg_proc joined to pg_namespace,
--   pg_constraint for the two new profiles foreign keys.
--   Confirmed again at the end of the session from pg_trigger:
--     CREATE TRIGGER point_transactions_ties_to_total
--       AFTER INSERT OR DELETE ON public.point_transactions FOR EACH ROW
--       EXECUTE FUNCTION point_transactions_recompute_total()
--     CREATE TRIGGER profiles_total_points_immutable BEFORE UPDATE ON public.profiles
--       FOR EACH ROW EXECUTE FUNCTION profiles_keep_points_authoritative()
--
-- V2. The cache moves. Insert one ledger row of 10 for the test learner, then read
--   the profile: `cache_after_award_10 = 10`. Run twice — once with the original
--   function, once after the defect-3 replacement, so the fix is proven to keep the
--   behaviour it was not meant to change.
--
-- V3. A client cannot claim points. `update public.profiles set total_points = 999999`
--   on the same row, with no recompute flag set: `points_after_direct_claim = 10`.
--   The guard reverted the write silently, which is decision 2 working.
--
-- V4. The leaderboard answers, and only answers in scope.
--   Real call: get_leaderboard('school',
--            0264b448-bdef-49fe-865a-6b42e77324bb, 5,
--            4c047d3a-bb02-4c00-9340-51ceaddb0f8b)
--     -> rank 1 | total_points 10 | is_requester true
--   Leak probe (defect 5, before the fix): a caller inside one scope asking for a
--   learner outside it got that learner's named row and points. After the fix the
--   same probes return 0 | 0 | 0 — no row, because the requester branch now reads
--   from `scoped` and refuses an id that is not the caller's. Re-checked against the
--   live definition under an emulated JWT: it contains `requester as`, `from scoped
--   s`, and `p_student_id = auth.uid()`.
--   Returns display name, points and rank; never a profile row.
--
-- V5. The award path is closed to a browser role. As `authenticated` with real
--   JWT claims: `ERROR: 42501: permission denied for function award_points`. The
--   ledger's own policies leave the same conclusion to RLS; this is the RPC.
--
-- V6. The grants actually landed (defect 4). From pg_proc.proacl:
--     award_points     = {postgres=X/postgres, service_role=X/postgres}
--     get_leaderboard  = {postgres=X/postgres, authenticated=X/postgres,
--                         service_role=X/postgres}
--   Neither carries anon. They did before this line was added, which is what
--   `revoke all … from public` fails to prevent.
--   Note, not a defect: the two trigger functions still carry Supabase's default
--   grants including anon. Inert, because they return `trigger` and so are neither
--   reachable as PostgREST RPCs nor callable directly (Postgres refuses a trigger
--   function outside trigger context) — but the next person to read these ACLs
--   should not have to work that out from scratch. If a belt-and-braces revoke is
--   ever wanted, make it a separate migration and re-read proacl after it.
--
-- V7. The record and the database agree. Read from pg_description, the two
--   `comment on function` strings production held were still the pre-fix wording —
--   the fixes had replaced the bodies without re-issuing the comments. Two
--   `comment on function` statements were run to close that, and read back:
--     point_transactions_recompute_total  -> contains 'on award and on removal'
--     get_leaderboard                     -> contains 'scoped and caller-checked'
--   With that, this file's executable text (comments stripped, whitespace
--   normalised) diffs against the statement list actually submitted as exactly the
--   three fixes above and nothing else: the tg_op branch and the trigger's
--   INSERT OR DELETE, the requester CTE with its scope and caller checks, and the
--   two anon revokes. That diff is the check that this file is a record rather than
--   an intention; a transcription that had drifted anywhere else would have shown
--   up in it.
--
-- Cleanup, and the check that came out of it:
--   delete the test ledger row, then
--   select (profile cache), (ledger row count), (profiles whose cache disagrees with
--   the ledger sum), (profiles carrying a school_id or classroom_id set by a probe):
--     cache_after_delete = 0
--     ledger_rows_total = 0
--     profiles_with_stale_cache = 0
--     profiles_with_scope = 0
--   The first column is the one that found defect 3: with the INSERT-only trigger it
--   read 10 over an empty ledger. No verification artifacts remain in production.
-- =============================================================================
