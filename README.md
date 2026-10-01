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

## One feature, proven: the scheme-of-work check

This section is the **BASIX Track 5 (Solo) submission**, challenge 1:

> *"One agent producing an auditable decision"*

It is deliberately separated from the platform pitch below, because the assignment is one feature working,
not a platform described.

### Problem

A Grade 8 teacher files a term's scheme of work. It came either from her own spreadsheet or from an AI
generator, and either way it arrives with no reason attached: a column is empty, a sub-strand is invented,
an assessment method is missing, and nothing states *which rule* calls that a problem or *who* decided it.
When the education officer asks why the scheme was signed off the way it is, the honest answer today is
"the model said so." Better prompting does not fix that. The reason has to be a checkable artefact, not a
sentence.

### Solution

The agent is SyncSenta; for this decision its mind is **two versioned MeTTa packs rather than a prompt**.
`studio/public/omega/ai_g8_design.metta` holds the design as facts the curriculum states, and
`studio/public/omega/scheme_check.metta` holds the policy written by hand: what counts as a gap, how severe
it is, and the sentence explaining why. The reconciler in `studio/src/lib/scheme/reconcile.ts` reads the
teacher's draft — **input, not output:** it is the offline file `studio/public/omega/drafts/kibera_g8_week14.json`,
and this feature does not claim to have generated it — and emits one finding per problem, each quoting the
pack's own words and the line they come from.

This is the real output of `node scripts/reconcile.mts`, on the sample draft, with no flags:

```
Scheme check · Grade 8 Artificial Intelligence · design 2026-09-22.grade6.lovable-import.v1
4 rows read · no network, no model, rules only

Row 2, assessmentMethods — BLOCKING · mandatory-field-empty
  A column the design cannot do without is empty, so this row is not yet a lesson plan.
  Not proposed — The assessmentMethods column is empty and the policy pack calls it mandatory: Evidence of competency is the competency, so a scheme with no assessment method cannot be signed off. The design states no value for it, so the agent will not write one. Fill it yourself, or tell the checker the column does not apply.
    Omega derivation · scheme-gap-severity · scheme_check.metta (36 statements)
    1. (scheme-gap-severity g8 mandatory-field-empty) → blocking — scheme_check.metta:46
    2. (scheme-gap-reason g8 mandatory-field-empty) → A column the design cannot do without is empty, so this row is not yet a lesson plan. — scheme_check.metta:47
    ∴ blocking — scheme_check.metta:46

Row 3, subStrand — BLOCKING · sub-strand-not-in-design
  This sub-strand is not in the Grade 8 design, so the scheme plans teaching that the curriculum does not contain.
Proposed, needs consent — cited studio/public/omega/ai_g8_design.metta:58
    subStrand: 3.3 Introduction to Neural Networks
    strand: 3.0 AI Techniques and Programming
    keyInquiryQuestion: How is a neural network different from a set of rules?
    Omega derivation · scheme-gap-severity · scheme_check.metta (36 statements)
    1. (scheme-gap-severity g8 sub-strand-not-in-design) — no match at scheme_check.metta:46
    2. (scheme-gap-severity g8 sub-strand-not-in-design) → blocking — scheme_check.metta:48
    3. (scheme-gap-reason g8 sub-strand-not-in-design) — no match at scheme_check.metta:47
    4. (scheme-gap-reason g8 sub-strand-not-in-design) → This sub-strand is not in the Grade 8 design, so the scheme plans teaching that the curriculum does not contain. — scheme_check.metta:49
    ∴ blocking — scheme_check.metta:48

2 clean · 2 blocking · 0 advisory · 4 rows
∴ not certified — 2 blocking, and the rule is blocking-must-be-zero. A scheme is certified for classroom use only when no blocking gap survives, and a certified scheme is what the lesson-plan generator is allowed to read.
```

Then the four things that make it a decision rather than a linter:

- **Nothing is written to her scheme without her.** A fix is a *proposal* until she accepts it, and
  accepting names the actor — `studio/src/lib/scheme/consent.ts` writes the three cells and records all
  three.
- **She can disagree with the rule, and the disagreement changes the next run.** A waiver rewrites one
  line of the policy text (`studio/src/lib/scheme/override.ts`); every later run reads that file and calls
  the gap advisory *because of her waiver, not the checker's judgement*. The certification threshold
  itself refuses to be overridden.
- **Every act lands on a record that reports being edited.** `studio/src/lib/scheme/ledger.ts` is an
  append-only hash chain: recompute it and a change made afterwards surfaces as a named broken entry, with
  the reason it broke.
- **The verdict stops work.** `studio/src/lib/scheme/handoff.ts` asks both gates on every call — the
  pack's threshold *and* the chain's integrity — and returns a decision, or throws for a caller that has to
  be stopped rather than told.

### Technology

Next.js 16 and TypeScript for the app; the decision itself is pure TypeScript with **no LLM call, no
network request and no clock** — it reads two `.metta` text packs and one JSON draft, and the same answer is
reproducible six months later. Ledger entries are chained with SHA-256 from WebCrypto (`node:crypto` in the
terminal). The packs are MeTTa source, read by this repository's own parser in
`studio/src/lib/attest/derive.ts`; running them under real Hyperon is on the list below, not a claim.

Run the check the way a reviewer can, from the repository root:

```bash
node scripts/reconcile.mts
```

Change it, record it, and read the record back — the second command carries no waiver flag, and the waiver
still appears because it is a line in the file it was pointed at:

```bash
node scripts/reconcile.mts --accept 3 --waive assessmentMethods \
  --actor teacher:kibera_mama_joy --note 'Lesson 2 is oral.' \
  --at 2026-10-02T09:04:15+03:00 --out /tmp/run1

node scripts/reconcile.mts --policy /tmp/run1/policy.metta
```

The page mounts the same module: `/omega/check` locally with no account, `/teacher/omega` inside the
workspace, with
the view model in `studio/src/lib/scheme/check-view.ts` between the engine and the JSX so a screen cannot
decide anything. `studio/src/lib/__tests__/scheme-reconcile-cli.test.ts` compares the terminal's bytes with
the page's transcript, so "same engine, two faces" is a checked claim; `basix-readme.test.ts` in the same
directory re-runs the terminal and holds the block above to it.

Proof of the suite, on this machine: `npx vitest run --no-file-parallelism` in `studio/` →
**1078 passed, 17 skipped** across 110 files — exit 0, 61.4 s, peak 237 MB, 2026-10-01. (`docs/ROADMAP.md` §9
carries the same number as its baseline, and `basix-readme.test.ts` fails if the two documents stop agreeing
— which is weaker than it sounds: only re-running the suite can tell that both are stale in the same
direction, and that is how this number moved once already.)


### What this does not claim

- The gate is enforced where a caller asks for it — `--require-handoff` exits 2 on a refusal — and it is
  **not yet wired into `/api/generate/lesson-plan`**, so the generator route is the next spoon, not a
  finished fact.
- The page renders with no account **locally**; on a deployed instance the middleware asks every visitor to
  sign in first, including `/omega/check`. `next build` has not been run on this batch; `tsc` on the
  narrowed file set exits 0, and the full `tsc --noEmit` is recorded in `docs/ROADMAP.md` §9 as a standing gap.
- What a browser *has* seen, as of 2026-10-01: a private preview deployment,
  `https://sentastudio-pi0lk0r58-dans-projects-5f474b51.vercel.app`, built from this tree by
  `vercel deploy --yes` in `studio/` (54 s, exit 0, `▲ Next.js 16.1.1 (build 5)` — the version the lockfile
  pins, so the build ran from this checkout's dependencies). With no cookie, `/` and `/omega/check` both
  return **200** and show the sign-in page. That is middleware and build evidence only: the teacher
  click-through with a real account has not been done, and the preview omits `studio/public/assets/` (19 MB)
  to fit the upload, so it is not the submission build. Production `sentastudio.vercel.app` is 67 commits
  behind this tree and does not carry the feature.
- No learner data, no payments, and no real school's records are involved: four hand-seeded demo accounts
  and one hand-written Grade 8 AI pack.

### What we'd build next

1. **Put the gate in front of the generator**, so a scheme that does not certify cannot produce lesson
   plans from the UI either — the module exists; the call site does not.
2. **Publish the ledger's head hash on-chain — not started, and it needs a wallet plus a testnet decision
   the owner owns.** Today the record is a tamper-evident, recompute-able
   evidence anchor that lives in this repository; committing its head to a chain is what lets a county
   office verify a signed scheme without trusting this codebase.
3. **Run the packs under real Hyperon** and diff the answers against `derive.ts`, so the MeTTa claim is
   made by the MeTTa runtime rather than by a faithful parser.
4. **The rest of the ladder**: Grade 10–12 AI packs, a Kiswahili scheme, and the same check for the
   blockchain course.


## How it works

At the heart of SyncSenta is the **Omega tutoring decision engine**. Before
every chat response, Omega reads the student's mastery data and computes a
scaffolding level — *Independent*, *Guided*, or *Intensive* — then builds a
dynamic system prompt that instructs the LLM exactly how to respond. A student
who has just started gets gentle guided questions. One who is frustrated gets
the concept broken into the smallest possible step, with concrete Kenyan
examples. One who has mastered the material gets open-ended challenges. Teachers
can see each student's live scaffolding level in the dashboard.

Student learning uses two explicit layouts. Core CBC subjects (Mathematics,
English, Kiswahili, Environmental Activities, Social Studies, Creative Arts,
CRE, and Indigenous Language) open a grade-specific sandbox overview. Activities
are labelled as canvas-ready, worksheet-ready, or guided fallback; only
activities with a supported manipulative use the draggable canvas. Extended
courses (Blockchain, Financial Literacy, and AI Literacy) remain chat-first and
open into the full Omega-aware Socratic tutor.

See the [student content readiness matrix](docs/CONTENT_READINESS.md) for the
current Grade 4 coverage, route model, fallback boundaries, and expansion plan.

## Monorepo structure

The repository is a monorepo of related components. Most active development
happens in `studio/`.

```
studio/          Next.js 16 — the primary web application (students + teachers)
ai-agents/       FastAPI — LangGraph orchestrator, CBC content generators
backend/         Rust — Axum API, blockchain and shared crates
rust-core/       Rust — adaptive tutoring decision engine (source of truth)
rust-service/    Rust HTTP wrapper around rust-core (built, not yet wired to prod)
scheme-scribe/   Vite/React standalone — separate Supabase project
supabase/        Database migrations and SQL verification scripts
scripts/         Development, deployment, and maintenance scripts
docs/            Architecture, development, research, setup, and archived reports
```

The repository root holds only deploy and workspace manifests
(`vercel.json`, `render.yaml`, `Dockerfile`, `Cargo.toml`, `pyproject.toml`,
`uv.lock`), the `README.md` / `AGENTS.md` entry points, and the Replit training
entry points (`app.py`, `start_notebook.sh`, `jupyter_config.py`,
`patch_unsloth_cpu.py`). Everything else belongs in a folder: new documents go
under `docs/`, new executable helpers under `scripts/`.

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
before committing any change to the Next.js app. [P.M](https://dgithinji331s-team-company.monday.com/boards/5102970375)

The [TDD analysis](docs/TDD_ANALYSIS.md) documents current test coverage gaps and
the implementation plan for closing them, prioritised by production risk.

The [Omega/MeTTa status](docs/OMEGA_METTA_STATUS.md) tracks the implementation
status of the Omega decision engine and the broader MeTTa neuro-symbolic system.

Historical reports and superseded summaries are retained under
[`docs/archive/`](docs/archive/) and are not authoritative for current behavior.
