# Architecture

**Reviewed:** 2026-11-20
**Scope:** code-level boundaries in this repository. This document does not establish that a service or feature is currently deployed.

## Components

| Component | Role |
|---|---|
| `studio/` | Next.js 14 web application, authenticated workspaces, and same-origin API routes |
| `ai-agents/` | Python FastAPI service for agent and teacher-generation operations |
| Supabase | Authentication and application data with row-level security |
| `backend/syncsenta-backend/`, `rust-core/`, `rust-service/` | Rust services and policy code; use is optional/configuration-dependent and must not be described as the active web request path without deployment evidence |

## Web request paths

- **Student chat:** the Studio student chat uses the same-origin `/api/chat` handler. It resolves the signed-in user and streams model output through the configured provider path. Do not direct learners to the undeployed `/api/v1/mvp/*` endpoints.
- **Teacher generation:** the scheme wizard calls `/api/generate/scheme`; lesson-plan and exam flows use their Studio API routes. These handlers may call the Python service when configured. Scheme generation can return explicitly labelled prescribed template rows when the AI service is unavailable; that fallback is not AI-generated content.
- **Head workspace:** `/head` applies the role gate in its page and mounts the shared `AppSidebar` and `AppHeader` through its route layout. The sidebar's role mapping and route access must stay consistent.
- **Role routing:** `studio/src/lib/auth/role-home.ts` is the canonical role-to-home mapping. Keep redirects and workspace gates aligned with it.

## Policy and data boundaries

- Student tutoring decisions in Studio and the optional Rust policy service are separate implementations. Follow the accepted [one-rule-voice decision](architecture/decision-one-rule-voice.md); do not introduce a third runtime or silently claim Rust is serving production traffic.
- Authenticated database access must preserve Supabase RLS. Review [the single schema history decision](architecture/decision-single-schema-history.md) before changing schema ownership or migration behavior.
- Security-sensitive or deployment-specific work should update the corresponding accepted decision and the current task entry with evidence.

## Maintained decisions

- [One rule voice](architecture/decision-one-rule-voice.md)
- [Rust primary backend](architecture/decision-rust-primary-backend.md)
- [Single schema history](architecture/decision-single-schema-history.md)
- [Laya decision router](architecture/laya-decision-router.md)

For project status and verification evidence, use [ROADMAP.md](ROADMAP.md). For the active backlog, use [TASKS.md](TASKS.md).
