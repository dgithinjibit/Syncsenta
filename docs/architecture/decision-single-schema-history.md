# Decision: one schema history, owned by the Rust backend

Status: proposed, 2026-09-28. Blocks the first Rust foundation layer.
Depends on: `decision-rust-primary-backend.md` (Rust is authoritative for logic, policy and persistence).

> **Update, later the same day.** The read-only export in `supabase/export_live_schema.sql`
> was run in the Supabase SQL editor and the seven CSVs came back, so the measurements below
> are now against production rather than against the repo's own claims — and two of them
> changed. Production held **26 public tables, all with RLS enabled**, not the 93 this file
> implies are live; `_sqlx_migrations` does not exist there at all, so the Rust backend's
> migration history has never been run against this project; and **11** migrations are
> recorded in `supabase_migrations.schema_migrations`, each with a file in
> `supabase/migrations/` under a *different* version stamp, so the repo's filenames do not
> match what the dashboard thinks it applied.
>
> The captured schema is committed as `supabase/migrations_live/20260928000000_live_baseline.sql`
> (built by `supabase/live_schema_export/build_baseline.js`; the CSVs themselves are scratch
> and stay out of the tree). `20260928000100_omega_memory_layer.sql` is the minimal DDL that
> was then applied to production so Omega's memory layer has tables to write to — it created
> `chat_sessions`, `chat_messages`, `learning_progress`, `daily_activity`, `daily_quotas`,
> `achievements`, `api_usage` and `omega_scaffolding_events` with forced RLS and owner-write
> policies. That makes 34 live tables and leaves **15** of the 21 code-queried-absent tables
> still missing, `point_transactions` and `teacher_students` among them.
>
> None of this changes the decision; it is the evidence the decision needed. The remaining
> step is to fold the live baseline into `supabase/migrations/` as the single history and
> re-baseline `studio/src/lib/__tests__/schema-coverage.test.ts`, which still asserts the
> pre-export 21-name allowlist and therefore reports 38 gaps.

## The question

`backend/syncsenta-backend` cannot be the primary backend until there is exactly one
answer to "what does the database look like, and which file makes it that way". Today
there are three answers, and none of them is complete.

## What is actually in the repo (measured 2026-09-28)

Two migration directories, applied by two different runners:

| directory | files | applied by | created tables |
| --- | --- | --- | --- |
| `supabase/migrations/` | 40, of which **5 are absolute symlinks to `/home/web4ke/codes/Ascendra/sql/studio_migrations/…` and dangle on every machine here** | Supabase CLI / dashboard | 93 union with the row below, minus what the symlinks hold |
| `backend/syncsenta-backend/migrations/` | 8 (`20260426000001` … `20260501000008`) | `sqlx` migrate | includes `chat_sessions`, its own RLS/seed pass, MeTTa atoms, IPFS columns |

Against those, code queries **21 tables that have no `CREATE TABLE` anywhere in the
readable repo SQL**:

```
achievements                  camera_frames              chat_messages
agent_keys                    omega_decisions            daily_activity
agent_traces                  omega_scaffolding_events   learning_progress
api_usage                     point_transactions         referrals
student_alerts                teacher_grade_assignments  teacher_interventions
teacher_students              teacher_subject_assignments user_profiles
vision_submissions            voice_conversations        voice_messages
```

Their columns are known only partially. `studio/src/lib/supabase/types.ts` says at the top
"Auto-generated types … Regenerate with `npx supabase gen types`", but 29 of its entries are
`LegacyTable` — a hand-written stub of `Record<string, any>`. So the file that every
type-safe query resolves through is not generated, and for twelve of these tables it types
`any` on purpose. `omega_scaffolding_events` has neither DDL nor a type entry at all.

Consequence for the foundation: `sqlx::query!` validates at compile time against a schema it
either sees in `backend/syncsenta-backend/migrations/` or in `sqlx prepare` output. Since that
directory does not contain `point_transactions`, `learning_progress`, `teacher_students` and the
rest, the first macro that touches them fails to compile, and the natural reaction under time
pressure is to drop to `sqlx::query_as::<_, Value>()` — which throws away exactly the guarantee
that made Rust the right choice.

## The decision

**`supabase/migrations/` becomes the single, authoritative migration history, applied by the
Rust backend.** Not the Rust directory, because three of the four things that mutate this
schema today (Supabase dashboard edits, the studio's service-role writes, the Python agents)
already speak to that folder, and the runner that owns the history must be the one whose
migrations the live project can be diffed against.

Concretely, in this order:

1. **Export the live schema** and commit it as a real baseline file, using
   `supabase/export_live_schema.sql` in the Supabase SQL editor. The live project is the only
   complete description of the schema; the repo is a partial copy of it.
2. **Delete the five symlinks** and replace them with whatever the export shows they actually
   contain. A symlink to another engineer's home directory is not a migration; it is a rumour.
3. **Fold the 8-file `sqlx` history into that folder** as ordinary timestamped migrations.
   Keep the filenames' sort order so both runners agree on sequence, and keep the Rust
   `migrations/` path as a symlink-free copy only if `sqlx` cannot be pointed at
   `../../supabase/migrations` — pointing it there is preferred, because a copy is a second
   history by another name.
4. **Mark the baseline as already applied.** The live database was reached by hand-edits and
   partial runs, so `create table` statements cannot simply replay. Either insert the baseline
   row into `_sqlx_migrations` with its checksum, or write the baseline as
   `CREATE TABLE IF NOT EXISTS` + `ADD COLUMN IF NOT EXISTS` and accept that it is a
   description, not a provenance record. Say which one in the PR.
5. **Regenerate `types.ts` for real** (`supabase gen types typescript`) and delete every
   `LegacyTable`. Twelve `Record<string, any>` entries is where a column rename becomes a
   runtime 400 instead of a compile error.

## How RLS survives the move

The studio's reads go through PostgREST with the learner's or teacher's own JWT, so
`profiles`/`students`/`learner_consents` policies do the authorisation. A Rust backend holding
a pooled connection is a different animal: if it connects with `service_role` and queries as
itself, every RLS policy is bypassed by construction, and the policy work already done in
`20260827000001_syncsenta_live_foundation.sql` stops meaning anything.

The foundation rule, then: **the Rust pool sets the JWT claims per request and queries as the
caller**, not as itself.

```sql
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"sub":"<user uuid>","role":"student"}';
```

inside the transaction that serves each request, with the claims taken from the verified
Supabase token and never from a request body. Where a job legitimately needs
`service_role` — telemetry writes, the head-teacher notification sweep — it says so in a
named role and a named migration, and no handler may borrow it.

## The local gate

The gap analysis above was a script, and it can stay one. A test in
`studio/src/lib/__tests__/` walks every `.from('…')` / `.from_('…')` under `studio/src` and
`ai-agents`, extracts every `CREATE TABLE` name from the authoritative folder, and fails on any
query whose table has no DDL. Cheap, local, and it catches the class of drift that produced
this document: code quietly querying a table that only exists in somebody's dashboard session.

Until the baseline lands, that test carries an explicit allowlist of the 21 known-missing
tables so it passes and shrinks as each one gains DDL. It must never gain entries.
