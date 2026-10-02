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

This is the real output of `node developer_tools/scripts/reconcile.mts`, on the sample draft, with no flags:

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

Run the check the way a reviewer can, from the repository root. **Needs Node.js 22.18 or newer** and nothing
else — no `npm install`, because the runner imports only `node:fs`, `node:path` and its own alias shim
(`developer_tools/scripts/omega-alias.mjs`), and the repository root has no `package.json` to install from. The
version is not a preference: the file is TypeScript loaded by Node's own type stripping (unflagged from v22.18.0)
plus `module.registerHooks()` (from v22.15.0), so on Node 20 this command stops with
`ERR_UNKNOWN_FILE_EXTENSION` before it has read a single rule.

```bash
node developer_tools/scripts/reconcile.mts
```

`scripts/` is a compatibility symlink to `developer_tools/scripts`, so the shorter
`node scripts/reconcile.mts` works on a checkout that materialises symlinks — which is every Linux and macOS
clone, and not every Windows one. The path above is the one that works everywhere, so it is the one printed here.

Change it, record it, and read the record back — the second command carries no waiver flag, and the waiver
still appears because it is a line in the file it was pointed at:

```bash
node developer_tools/scripts/reconcile.mts --accept 3 --waive assessmentMethods \
  --actor teacher:kibera_mama_joy --note 'Lesson 2 is oral.' \
  --at 2026-10-02T09:04:15+03:00 --out /tmp/run1

node developer_tools/scripts/reconcile.mts --policy /tmp/run1/policy.metta
```

Those three runs have already been made and committed, so a reviewer who does not want to type anything can
read the record instead: `docs/basix-sample-audit/` holds the three transcripts, the policy the waiver wrote,
the four-entry hash-chained `ledger.json` and the `diff.json` of the cells consent changed — the audit trail the
brief asks for, and `studio/src/lib/__tests__/basix-sample-audit.test.ts` re-runs the second command into a
temporary directory and fails if those artefacts stop matching these bytes. Read together they are the feature
in one page: `2 clean · 2 blocking · ∴ not certified`, then a named teacher accepting one proposal and waiving
one mandatory column, then `3 clean · 0 blocking · 1 advisory · ∴ certified for classroom use`, and then a later
run that honours the waiver from the file with no flag telling it to.

The page mounts the same module: `/omega/check` locally with no account, `/teacher/omega` inside the
workspace, with
the view model in `studio/src/lib/scheme/check-view.ts` between the engine and the JSX so a screen cannot
decide anything. `studio/src/lib/__tests__/scheme-reconcile-cli.test.ts` compares the terminal's bytes with
the page's transcript, so "same engine, two faces" is a checked claim; `basix-readme.test.ts` in the same
directory re-runs the terminal and holds the block above to it.

To see the page instead of the terminal — **needs an install, unlike the CLI**:

```bash
cd studio && npm install && npm run dev     # binds :5173, printed by the dev script itself
```

then open `http://localhost:5173/omega/check`. That route is not behind the auth wall — `PROTECTED_WORKSPACE_PREFIXES`
in `studio/src/lib/auth/route-policy.ts` covers `/student`, `/teacher`, `/parent`, `/head` and `/dashboard`, and
`/omega/check` is none of them — so it asks for no account and no environment variable. Everything it reads is
in the repository: the hand-written Grade 8 AI pack, the scheme pack, and one sample draft JSON, fetched by
`studio/src/components/omega/scheme-check.tsx` and nothing else. `/teacher/omega` is the same component inside
the teacher workspace, and *that* one does need a signed-in demo account — and since 2026-10-02 it is the
interactive half: Accept and Waive buttons that re-run this same reconciler on the new state, a hash-chained
session ledger the teacher can download, and a lesson-plan handoff that opens only when the scheme certifies
*and* every record in that ledger recomputes (`studio/src/lib/scheme/teacher-session.ts`). The 18 tests in
`studio/src/lib/__tests__/scheme-teacher-session.test.ts` walk that path in Node against the real packs; the
click-through on the deployed page is this build's job, not a claim yet.

Proof of the suite, on this machine: `npx vitest run --no-file-parallelism --testTimeout=30000` in `studio/` →
**1107 passed, 17 skipped** across 112 files (111 files green, 1 file skipped), exit 0, 67.52 s on vitest's
clock, 2026-10-02 20:18 EAT. Peak memory was not captured on these runs; the 2026-10-01 16:39 run
measured 237 MB. The `--testTimeout` flag is part of the command, not decoration: one guard spawns the CLI and the
default 5 s budget loses it on this laptop. (`docs/ROADMAP.md` §9
carries the same number as its baseline, and `basix-readme.test.ts` fails if the two documents stop agreeing
— which is weaker than it sounds: only re-running the suite can tell that both are stale in the same
direction, and that is how this number moved once already.)


### What this does not claim

- The gate is enforced where a caller asks for it — `--require-handoff` exits 2 on a refusal — and it is
  **not yet wired into `/api/generate/lesson-plan`**, so the generator route is the next spoon, not a
  finished fact.
- The page renders with no account **locally**, and locally is the only place anyone has seen it. On a
  deployed instance we cannot report what our own middleware does to a signed-out visitor, because Vercel
  answers first — see the next bullet. `next build` has not been run on this batch; `tsc` on the narrowed
  file set exits 0, and the full `tsc --noEmit` is recorded in `docs/ROADMAP.md` §9 as a standing gap.
- What the commands have seen — updated 2026-10-02 ~14:12 EAT, and it is **not** a browser pass:
  `vercel deploy --yes --local-config vercel-cli-preview.json` in `studio/` uploaded **355.6 KB** and created
  `https://sentastudio-gady22na2-dans-projects-5f474b51.vercel.app`, which `vercel inspect` reports as
  `status ● Blocked`, reason: *"The deployment was blocked because the commit author doesn't have permission
  to create deployments for this project."* `curl -L` on `/` and `/omega/check` both end at
  `https://vercel.com/login?next=/sso-api…` with `<title>Login – Vercel</title>` — that is Vercel's SSO wall,
  not our sign-in page. What changed: pushing `main` over SSH now git-triggers a Production deploy, and after
  the commit-author email was corrected the build went **● Ready in 4m**;
  `curl -s -o /dev/null -w '%{http_code}' https://sentastudio.vercel.app/omega/check` then returns **200**
  with the reconciler's own copy in the HTML, and `/teacher/omega` returns **307** to `/auth/signin`, the
  auth gate working as designed. So the submitted feature **is** on the live site as of this line. What is
  still not done: the teacher click-through with a real account has not been done, on any host, and
  `● Ready` plus a 200 is a served page, not a seen one.
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
5. **Production grooming of the repo and the site**: a real domain for a product meant for schools
   and county offices — a `*.vercel.app` subdomain is honest for an alpha and wrong for
   infrastructure — rotation of the hackathon provider test keys that touched this repo's early
   commit history, the Dependabot backlog, and copy that says *architected* for scale until a load
   test says otherwise.


### AI Disclosure

- **In the product:** the teacher Co-Pilot tools and the learner chat surface are LLM-generated, routed
  through the BASIX ASI gateway (`asi1-mini`) and labelled as AI output in the UI. The submitted feature
  itself is the opposite kind of system: the scheme-of-work check is a deterministic reconciliation of the
  teacher's draft against two MeTTa packs by our own rule engine — no LLM sits on the decision path, and
  every verdict line cites the policy line that produced it. The transcripts in
  `docs/basix-sample-audit/` are reproducible byte for byte from the command above.
- **In the build:** this repository was authored solo (Track 5) by Daniel Githinji with agentic coding
  assistance — an AI pair drafted code, tests and documentation under the owner's direction and review.
  Every claim in this README names a command that was run on the owner's machine, and the corrections
  recorded in `docs/ROADMAP.md` (spoons 10–15) are places where measurement contradicted an earlier
  AI-drafted sentence and the measurement won.

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
ACTIVE — the submitted feature and the product it runs in
studio/          Next.js 14 (14.2.35) web app — the reconciler engine, the MeTTa
                 packs, /omega/check (public) and /teacher/omega (gated)
developer_tools/ zero-install scripts incl. the reconcile CLI; scripts/ is the
                 compatibility symlink to developer_tools/scripts
docs/            authoritative docs: ROADMAP.md, basix-sample-audit/ (the submitted
                 audit trail), architecture/, research/, setup/
supabase/        migration histories incl. migrations_live/ (what production holds)
.github/         CI gates (studio-gates, rust-gates) + the corpus-fetch workflow

ACTIVE — deployed service alongside the app
ai-agents/       FastAPI agents service (Render: Ascendra-1) — teacher generators
                 and assessment; an older line in this map called it a "LangGraph
                 orchestrator": its own README never says that and the code
                 carries two incidental comments. It is not.

DORMANT BUT DOCUMENTED — real code, wired to nothing in production
backend/         Rust Axum API + blockchain crates — deployed nowhere
rust-core/       adaptive policy source of truth (MeTTa rules mirrored in TS)
rust-service/    built; not yet wired; rust-hyperon-bridge/ — bridge scaffolding
metta-logic/     one legacy policy pack whose role overlaps the packs under
                 studio/ + docs/basix-sample-audit/ — consolidation task
scheme-scribe/   standalone Vite app on a separate Supabase project

RESEARCH AND HISTORY — candidates for one consolidation pass
data/            workflow output directory (gikuyu_bible/ corpus, scheduled)
datasets/        research datasets with licences and provenance notes
syncsenta-logo/  brand guidelines + app icons. The served favicon is NOT here:
                 studio/src/app/favicon.ico + icon.png ship with the app
arduino/         hardware prototype exploration (Mwalimu camera)
```

The repository root holds only deploy and workspace manifests
(`vercel.json`, `render.yaml`, `Dockerfile`, `Cargo.toml`, `pyproject.toml`,
`uv.lock`), the `README.md` / `AGENTS.md` entry points, and the Replit training
entry points (`app.py`, `start_notebook.sh`, `jupyter_config.py`,
`patch_unsloth_cpu.py`). Everything else belongs in a folder: new documents go
under `docs/`, new developer helpers under `developer_tools/`.

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

Point-in-time reports were removed from the tree on 2026-10-02; the repository's history
is the archive, and [`docs/ROADMAP.md`](docs/ROADMAP.md) is the record of where the
project actually stands.
