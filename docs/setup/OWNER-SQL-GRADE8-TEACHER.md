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

## Vercel env, not SQL: why the 18 Co-Pilot tools 500 today

Measured in the browser on 2026-10-02: `sentastudio.vercel.app/dashboard/tools` → Tongue Twisters →
Generate → the server action POST returns **500**. Root cause, Tier A from code: every one of those flows
runs through `studio/src/ai/genkit.ts`, which builds `googleAI({ apiKey: process.env.GEMINI_API_KEY })`.
With no (or dead) `GEMINI_API_KEY` on the Vercel project, all 18 GenKit tools — the 12 generic ones and
the six dialog generators — fail identically. This does **not** affect the Omega path: the lesson-plan
handoff on `/teacher/omega` POSTs to `/api/generate/lesson-plan` (Ascendra-1 proxy with the prescribed
fallback), which is verified working in production.

Owner fix (no git push needed): Vercel project → Settings → Environment Variables → add `GEMINI_API_KEY`
with a **fresh** key (the one that leaked into commit history must not be reused; rotation itself is a
separate item in ROADMAP §7), then redeploy. After that, spot-check one generic tool and the Lesson Plan
Generator dialog from `/dashboard/tools`.

**Alternative the owner raised, awaiting go/no-go:** put the BASIX gateway behind the tools instead —
`llm.c.singularitynet.io/v1` is OpenAI-compatible, GenKit 1.28 has an OpenAI plugin that accepts a custom
`baseUrl`, and the flows would default to `asi1-mini` with `ASI_CLOUD_KEY` as the only env var. That makes
the hackathon key the demo's LLM, keeps the auditable-decision claim intact (prose only; the reconciler
still takes no model call), and costs one small code change plus one deploy.

## Still post-submission

Real rosters, the assignment tables' RLS pass, and moving the session ledger out of localStorage all stay
deferred; this doc covers only what makes the demo's claims true tonight.
