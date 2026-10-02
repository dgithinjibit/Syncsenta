# Owner SQL: make the demo teacher a real Grade 8 teacher in production

Prepared 2026-10-02 (spoon 12b). This is an **owner action**, run in the Supabase dashboard's SQL editor —
the agent has no session against the production database and none was taken. Read-only facts are Tier A from
`supabase/migrations_live/20260928000000_live_baseline.sql` (the `profiles` columns below exist in
production); the UPDATE has **not** been executed anywhere.

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
schema-coverage allowlist of 30 absent tables), so there is no assignment *table* to populate yet. The
`classes`/`subjects` arrays on `profiles` are what the deployed UI actually reads; a real roster is
post-submission work with its own migration and RLS pass.
