# Syncsenta demo role access

Syncsenta currently exposes four administrator-provisioned demo roles from `/login`; public signup is intentionally disabled. Each role uses Supabase Auth and redirects to its protected workspace:

| Role | Destination | Supabase data boundary |
| --- | --- | --- |
| Demo Student | `/student` | Own profile, student record, learning sessions, MeTTa/Omega tutoring |
| Demo Teacher | `/teacher` | Assigned learners, evidence, feedback, interventions, and classroom tools |
| Demo Parent | `/parent` | Consent-gated linked learner progress and teacher reports |
| Demo Head of School | `/head` | School-level aggregate progress and notifications |

The seed migration [`20260908000001_syncsenta_demo_school.sql`](../supabase/migrations/20260908000001_syncsenta_demo_school.sql) creates the `Syncsenta International School` tenant and links the existing four Auth identities to a Grade 4A learner, a teacher assignment, a parent consent/report, and a head-of-school progress notification. It is idempotent and safe to rerun after the Auth users exist.

The migration must be applied to the production Supabase project before the parent and head dashboards can display linked school data. The current live browser verification confirms that the Student, Teacher, and Parent buttons authenticate through Supabase and reach their protected routes. The Parent route correctly remains empty until the seed migration is applied. The Head button still requires its existing Auth password to be reconciled with the documented demo credential before it can be marked green.

This is deliberately different from mock dashboard content: the role buttons are real Supabase sign-ins, but some teacher/head visual statistics still contain legacy presentation fixtures and will be replaced with school-scoped queries in the next implementation pass.
