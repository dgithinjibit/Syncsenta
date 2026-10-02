# Owner SQL: make the demo teacher a real Grade 8 teacher in production

Prepared 2026-10-02 (spoon 12b). Read-only facts are Tier A from
`supabase/migrations_live/20260928000000_live_baseline.sql` (the `profiles` columns below exist in
production). **Executed in production 2026-10-02, ~21:45 EAT**, in the owner's logged-in Supabase
dashboard session (project `tumikgwhrbvirpjswlzh`, "SyncSenta" under dAN's projects, status Healthy) at
the owner's explicit instruction ("run the relevant code there"). Before: `teacher_student_assignments`
held five `Grade 4A` rows (Mathematics, English, AGI, Blockchain, Financial Literacy), all `active`. After:
two `Grade 8` rows — `Artificial Intelligence` and `Blockchain` — confirmed by re-running the SELECT, and
the sidebar on `sentastudio.vercel.app/teacher/omega` renders *Your Classes → Grade 8* with no Grade 4
anywhere. `profiles.full_name` reads *Mama Joy*. `auth.users` was not touched, by design.

Why the frontend looked wrong: `profiles` for `teacher01@syncsenta.dev` carries whatever the hand-seed put
there, and the header/teacher surfaces read `full_name`/`school_name`/`classes`/`subjects` from that row (the
localStorage identity was retired on 2026-09-28). The promise "she is a teacher for Grade 8" is therefore one
row, not a feature.

## Verify first (read-only)

```sql
select id, email, full_name, role, grade, school_name, subjects, classes
from public.profiles
where email = 'teacher01@syncsenta.dev';
```

Expect exactly one row. If it is missing, the demo login's user was re-seeded under a different email —
stop and re-check `studio/src/app/api/auth/demo-login/route.ts` before writing anything.

## Then set the identity the product claims

```sql
update public.profiles
set full_name   = 'Mama Joy',
    school_name = 'Kibera Girls'' Secondary',
    classes     = array['Grade 8'],
    subjects    = array['Artificial Intelligence']
where email = 'teacher01@syncsenta.dev';
```

`role` stays `teacher` (already so — the CHECK constraint on line 486 of the live baseline allows only
`student|teacher|parent|admin|head`). Do **not** touch `auth.users`: these accounts were hand-seeded, and a
NULL token column there makes GoTrue answer 500 at login (recorded in project memory, 2026-09-29).

## Confirm

Re-run the SELECT. Then sign in at `sentastudio.vercel.app/auth/signin` → Teacher demo button, and the
teacher header should read *Mama Joy · Kibera Girls' Secondary*, with `/teacher/omega` below it.

## What this deliberately does not do

`teacher_grade_assignments` and `teacher_subject_assignments` do not exist in production (both are on the
schema-coverage allowlist of 30 absent tables). The `classes`/`subjects` arrays on `profiles` are what the
profile surfaces read. The sidebar, however, reads a table that **does** exist — see the next section,
measured live on 2026-10-02 at 21:05 EAT.

## The "Grade 4" in the teacher sidebar — same doc, second owner action

`/api/teacher/assignments` falls back to `teacher_student_assignments` (the canonical table), and for
`teacher01` that table answers today with:

> `{ "grade": "Grade 4", "subjects": ["Mathematics", "English", "AGI", "Blockchain", "Financial Literacy"] }`

That is the row set the sidebar on every `/teacher/*` page — including `/teacher/omega` — expands. It is
data, not code: no push can change it. Run, in the Supabase SQL editor:

```sql
-- 0. Look first (Tier A expectation: one grade group, five subjects, all class_name matching Grade 4)
select id, class_name, subject, status
from public.teacher_student_assignments
where teacher_id = (select id from public.profiles where email = 'teacher01@syncsenta.dev');

-- 1. The typo'd subject becomes the one the Omega packs actually check.
update public.teacher_student_assignments
set subject = 'Artificial Intelligence'
where teacher_id = (select id from public.profiles where email = 'teacher01@syncsenta.dev')
  and subject = 'AGI';

-- 2. The demo school does not pretend to cover the rest.
delete from public.teacher_student_assignments
where teacher_id = (select id from public.profiles where email = 'teacher01@syncsenta.dev')
  and subject in ('Mathematics', 'English', 'Financial Literacy');

-- 3. Everything that remains is Grade 8. ('Grade 8' is what the sidebar's own regex parses.)
update public.teacher_student_assignments
set class_name = 'Grade 8'
where teacher_id = (select id from public.profiles where email = 'teacher01@syncsenta.dev');
```

Expected end state: one group, `Grade 8`, subjects `Artificial Intelligence` and `Blockchain` — which is
also the direct answer to "is the AI + Blockchain pair right?": the repo's own Grade 7–9 registry
(`studio/src/data/curriculum/index.ts:82-83`) lists **AI Literacy** and **Blockchain Literacy** for exactly
this band, so the pair matches the product's spine. (A known naming split — registry "AI Literacy" vs pack
"Artificial Intelligence" — is recorded in ROADMAP; the sidebar reads the DB strings verbatim, so the SQL
above uses what the packs and README use.)

## Vercel env, not SQL: the ASI swap is in the code — one env var still owed

Superseded 2026-10-02 ~22:3x EAT (spoon 13). The owner approved "go ahead with asi build": every GenKit
flow now defaults to the **ASI gateway** — `openAICompatible({name:'asi', apiKey: process.env.ASI_CLOUD_KEY,
baseURL:'https://llm.c.singularitynet.io/v1'})`, model `asi/asi1-mini` (`studio/src/ai/genkit.ts`, pinned by
`src/ai/__tests__/genkit-asi.test.ts`). **`GEMINI_API_KEY` is no longer required for the 18 Co-Pilot tools.**
(The old root cause stands as history: all 18 flows ran through `googleAI({apiKey: process.env.GEMINI_API_KEY})`
and 500'd identically with no key on Vercel; `/teacher/omega`'s lesson-plan handoff was never on that path.)

Owner action after this pushes and the build goes Ready: Vercel project → Settings → Environment Variables →
add **`ASI_CLOUD_KEY`** (the bearer key from the organizers' email — never paste it into git or chat) →
redeploy. Then spot-check one generic tool (e.g. Tongue Twisters on `/dashboard/tools`) and the Lesson Plan
Generator dialog. The leaked Gemini key still needs rotation (ROADMAP §7) and is not reused here. One caveat:
ASI serves prose only — Mwalimu's TTS still asks Gemini and silently drops the audio track without a
`GEMINI_API_KEY`, exactly as before.

## Roster connect, executed 2026-10-02 ~22:0x EAT (same session, third owner action — logged, nothing left to run)

The "phantom student_id" reading in the 12c notes was a **wrong-join artifact**: the FK is
`teacher_student_assignments.student_id -> students.id` (and `teacher_id -> auth.users.id`), not
`profiles.id`. `students` row `22222222-…` is Demo Student (`user_id = ada8a968-…`); Amina has row
`111dd6e6-…`. A corrective UPDATE aimed at profile ids died on `23503` and surfaced that graph; the failed
batch rolled back atomically. What ran after, verified by a SELECT returning 4 active rows — 2 real learners
× (Artificial Intelligence, Blockchain), all Grade 8:

```sql
update public.profiles set grade = 'Grade 8', school_name = 'Kibera Girls'' Secondary'
where id = 'ada8a968-6a7d-458f-b507-606cbffc1927';              -- Demo Student: last student-side Grade-4 leftover

update public.students set grade = 'Grade 8', class_name = 'Grade 8', school_name = 'Kibera Girls'' Secondary'
where id = '22222222-2222-4222-8222-222222222222';

update public.students set grade = 'Grade 8', school_name = 'Kibera Girls'' Secondary'
where id = '111dd6e6-91cc-446d-a875-bb9d9d690b4d';

insert into public.teacher_student_assignments (teacher_id, student_id, subject, class_name, status)
select t.id, s.id, sub.subject, 'Grade 8', 'active'
from (select id from public.profiles where email = 'teacher01@syncsenta.dev') t
cross join (select id from public.students where user_id = 'dca0efd0-922e-47d3-9801-f75b6bde2a5b') s
cross join (select unnest(array['Artificial Intelligence','Blockchain']) as subject) sub
on conflict (teacher_id, student_id, class_name, subject) do nothing;   -- Amina joins the class
```

`/teacher` renders those names through the new `/api/teacher/roster` once this deploys — no owner SQL
remains for that view. `auth.users` untouched throughout.

## Still post-submission

Real rosters, the assignment tables' RLS pass, and moving the session ledger out of localStorage all stay
deferred; this doc covers only what makes the demo's claims true tonight.
