# SyncSenta

<p align="center">
  <a href="https://sentastudio.vercel.app">
    <img src="studio/public/syncsenta-logo.svg" width="380" alt="SyncSenta logo" />
  </a>
</p>

## Adaptive education for Kenya's Competency-Based Curriculum

**[SyncSenta](https://sentastudio.vercel.app) is an AI-powered education platform
built for Kenyan students (PP1–Grade 9) and their teachers.** Students get a
Socratic tutor that adapts in real time to their mastery level. Teachers get
live analytics, misconception detection, and CBC-aligned content generators —
scheme-of-work, lesson plans, and assessments — without leaving the browser.

The platform is live at **[sentastudio.vercel.app](https://sentastudio.vercel.app)**.

## How it works

At the heart of SyncSenta is the **Omega tutoring decision engine**. Before
every chat response, Omega reads the student's mastery data and computes a
scaffolding level — *Independent*, *Guided*, or *Intensive* — then builds a
dynamic system prompt that instructs the LLM exactly how to respond. A student
who has just started gets gentle guided questions. One who is frustrated gets
the concept broken into the smallest possible step, with concrete Kenyan
examples. One who has mastered the material gets open-ended challenges. Teachers
can see each student's live scaffolding level in the dashboard.

Ten subjects are supported across two layouts. Core CBC subjects (Mathematics,
English, Kiswahili, Environmental Activities, Creative Arts, CRE, Indigenous
Languages) route students into interactive canvas activities — fraction bars,
counting tokens, pattern recognition — with XP progression and cross-device
resume. Extended courses (Blockchain, Financial Literacy, AI) open directly
into the full Socratic chat.

## Monorepo structure

The repository is a monorepo of related components. Most active development
happens in `studio/`.

```
studio/          Next.js 16 — the primary web application (students + teachers)
ai-agents/       FastAPI — LangGraph orchestrator, CBC content generators
rust-core/       Rust — adaptive tutoring decision engine (source of truth)
rust-service/    Rust HTTP wrapper around rust-core (built, not yet wired to prod)
scheme-scribe/   Vite/React standalone — separate Supabase project
supabase/        Database migrations
docs/            Architecture, development, and reference documentation
```

## Documentation

The [Architecture guide](docs/ARCHITECTURE.md) covers the full component map,
Omega decision flow, subject session routing, and deployment topology.

The [Development guide](docs/DEVELOPMENT.md) covers local setup, environment
variables, test commands, database migrations, and known traps.

The [Socratic Mentor Spec](studio/docs/SOCRATIC_MENTOR_SPEC.md) is the source
of truth for the Omega-aware chat system prompt — scaffolding instructions,
request shape, SSE wire format, and test gaps.

The [domain context](docs/CONTEXT.md) explains the CBC model, Kenyan
education terminology, and key architectural decisions. Read it before making
any code change.

The [Hyperon dependent-project review](docs/HYPERON_DEPENDENT_PROJECTS.md)
records patterns from representative MeTTa projects and the guardrails required
before expanding Omega beyond its current policy and tutoring boundaries.

[Coding standards](docs/CODING_STANDARDS.md) covers Studio coding conventions —
TypeScript patterns, component structure, Supabase client selection, test seams,
and the safe-change workflow.

The deployed architecture is split across **Vercel** and **Render**:

- **Vercel** hosts the Next.js SyncSenta web application and its `/api/*` routes.
- **Render** hosts the Python FastAPI AI service from `ai-agents/`, including the
  Hyperon policy adapter, agent workflows, telemetry, and `/healthz` readiness
  endpoint. The deployment is defined in [`render.yaml`](render.yaml).
- **Supabase** provides authentication, PostgreSQL, RLS, and storage.
- **Upstash Redis** provides rate limits and short-lived learning-session state.

The [architecture guide](docs/ARCHITECTURE.md) documents the request flows,
service boundaries, Render deployment, MeTTa/Omega student path, and known gaps.

## Contributing

This is a solo-developed project. The [Development guide](docs/DEVELOPMENT.md)
is the place to start. Run `npx vitest run` and `npm run build` from `studio/`
before committing any change to the Next.js app.

The [TDD analysis](docs/TDD_ANALYSIS.md) documents current test coverage gaps and
the implementation plan for closing them, prioritised by production risk.

The [Omega/MeTTa status](docs/OMEGA_METTA_STATUS.md) tracks the implementation
status of the Omega decision engine and the broader MeTTa neuro-symbolic system.

Historical reports and superseded summaries are retained under
[`docs/archive/`](docs/archive/) and are not authoritative for current behavior.
