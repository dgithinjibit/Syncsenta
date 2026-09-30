# Where SyncSenta is, and where BASIX needs it by Friday 2 October

**Written 2026-09-30** after a full sweep of every research artefact in this repository —
`.kiro/specs/**` (9,297 lines), `docs/*.md` (10,325 lines), `docs/architecture/**` (2,105),
`docs/research/**` (872) — plus the code each of those documents describes.

The owner's summary of the finding, verbatim: *"seems we had our ladder on the wrong wall NGL."*
That is close to right, and this file states it precisely: **the ladder is sound, and it is leaning
against a wall we finished building in Rust and never plugged into the running product.** Nothing
here says start from scratch. Two of the three things Track 5 wants already exist as tested code.

## 0. How to read this file: three claim tiers

| Tier | Meaning |
|---|---|
| **A — proven** | A command was run in this session or is recorded with its output. Cite it freely. |
| **B — recorded, unverified** | A document in this repo asserts it, and we cannot reproduce it on this machine. Say "recorded", never "verified". |
| **C — in our docs and false** | Our own text describes work that does not exist. These are liabilities, not gaps. |

Track 5 makes AI disclosure mandatory and weights *documentation and build process* at 20%. Every
Tier C sentence below is therefore a scoring risk before it is an accuracy risk.

## 1. The lineage — five decisions that put the ladder on the wrong wall

1. **29 Aug 2026, [`OMEGA_ARCHITECTURE.md`](../architecture/OMEGA_ARCHITECTURE.md)** decided the
   opposite of what we now must present, in writing: *"Tutoring decisions don't need symbolic
   reasoning (just thresholds)"* (§Why NOT Merge, line 180), *"Hyperon not required"* (line 300),
   the MeTTa knowledge graph is a *"Conceptual demonstration … **Not used in production tutoring
   decisions**"* (lines 286–288). It closes with *"**Action: ✅ No changes needed — architecture is
   sound!**"* and a performance table claiming ~80 ms decisions, p50 chat 2.4 s, ~$0.04 per scheme.
   **Tier C**: no measurement artefact for any figure in that table exists in the tree.
2. **[`OMEGA_METTA_STATUS.md`](../OMEGA_METTA_STATUS.md)** is more honest and equally damning:
   *"Overall Implementation: 30% complete"*, *"Production-Ready Components: Omega decision engine
   only"*, and a component table where six of eight MeTTa rows read **`❌ Not used`**.
3. **28 Sep 2026, the production 503.** `sentastudio.vercel.app` answered
   `503 {"error":"Omega Claw backend is unavailable","backend":"http://127.0.0.1:8080/api/v1"}` for
   every hint and progression request, because the Rust service is deployed on no host. The fix was
   the TypeScript mirror — the right emergency call, and the moment the second voice became the only
   voice (Tier A, recorded in `AGENTS.md` and `decision-one-rule-voice.md` §2).
4. **29 Sep 2026, [`decision-one-rule-voice.md`](../architecture/decision-one-rule-voice.md)** —
   accepted, and correct: Rust is the one voice, the mirror is frozen, CI runs the Rust tests, cut the
   mirror in the same commit that sets `SYNCSENTA_BACKEND_URL`. Its §3 records the finding that should
   have stopped the press: **the Rust query path had never worked** — a query was an assertion, `$` was
   a wildcard only on the query side, `load()` re-asserted the pack per request — and *"the two
   pre-existing `#[tokio::test]`s in `omega_claw.rs` assert `introductory` and therefore cannot ever
   have passed"*, behind the statement that **0 of 35 pack statements had ever been executed**.
5. **30 Sep 2026, the BASIX registration.** Track 5 requires *"some visible piece of Omega's stateful,
   auditable-reasoning architecture … must be the actual feature, not decoration"* (ROADMAP §11).
   Decision 1 above is the direct opposite of that requirement, and it was made for sound product
   reasons — sub-100 ms decisions at zero cost for a child on metered data.

**Net:** the choice that was right for the product is the choice that cannot be pitched on this track,
and the artefact that could satisfy the pitch — `rust-core` plus the policy pack plus the Hyperon
bridge — was built, tested in Rust, and never connected to anything a learner or teacher can reach.

## 2. What actually exists: eight voices, two of them in production

| Voice | Size | Has any test ever run it? | Reached in production? |
|---|---|---|---|
| `metta-logic/syncsenta_policy.metta` | 137 lines | embedded by `rust-core/src/lib.rs:72` via `include_str!`; executed only by the bridge (Tier B) | no |
| `backend/…/data/metta_rules.metta` | 196 lines | unclear — translation/CBC-term rules, no runner found | no |
| `backend/…/data/omega_claw_rules.metta` | 51 lines, 35 statements | **never executed by any runner** (Tier A, negative) | read by the drift-lock test, not by a request |
| Rust façade `metta_core/omega_claw.rs` | 408 lines, 24 tests | **no** — `rust-gates.yml` is not on `origin/main`; GitHub 404s that workflow | no (service undeployed) |
| `rust-core/` (`syncsenta-moe-core`) | 5,075 lines, **99 `#[test]`s** | **no** — same missing runner; `cargo` cannot link on this laptop | no |
| `studio/src/lib/omega-agent/omega-claw-rules.ts` | 248 lines, 31 tests | **yes, run here: 31 passed, 1.29 s** | **yes — this is what answers** |
| `studio/src/lib/omega-agent/metta-core.ts` | 857 lines, 23 `: any` | via `ai-metta-e2e.test.ts` | **yes — `/api/chat` constructs one per turn** (`route.ts:322`) and prints a status string (`:534`) |
| `ai-agents/src/syncsenta_agents/reasoning/` | 3,167 lines (`metta_engine.py` 660, `hyperon_evaluator.py` 456, `rule_sync_service.py` 376, `pedagogical_rules.py` 266) | cannot run here (no pip) | **no** — `api/server.py` includes only the lesson-architect router; `telemetry_api.py` (599 lines) is not mounted |

About **10,000 lines of rule and decision code** exist for one tutor. Production answers from two
TypeScript files. The two engines that could satisfy Track 5 are the Rust core (99 tests nobody has
run) and the Hyperon bridge (4 tests, Tier B). **The single highest-value action left in this
project is not writing rules; it is building a runner.**

## 3. What Omega is, and the one sentence we are allowed to say

[`github.com/singnet/Omega`](https://github.com/singnet/Omega) (Tier A, read 2026-09-30): a **public
fork of `patham9/mettaclaw`**, Python, 1,311 commits, created 2026-04-02. *"Omega is a neural-symbolic
agent framework built on the Hyperon AGI stack"*; *"Unlike reactive, session-based agents, Omega
operates in a continuous execution loop"*; *"a minimalist MeTTa-based core of approximately 200 lines of
code"*. Top level ships `lib_omega.metta`, `lib_nal.metta` (non-axionic logic), `lib_pln.metta`
(probabilistic logic networking), `run.metta`, and `memory/` (`history.metta` plus prompt files).

| Overlap claim | Verdict |
|---|---|
| We depend on or vendor `singnet/Omega` | **False.** Repo-wide search for `mettaclaw\|patham9\|singnet/Omega`: zero hits in code, docs, specs and commit messages. |
| The name "Omega Claw" is unrelated to `mettaclaw` | **Unlikely and unattributed.** The upstream's name is metta**claw**; ours is Omega **Claw**. |
| We use MeTTa | **True at the syntax level** — three `.metta` files, real MeTTa forms, parsed by our own engines. |
| We use Hyperon | **Pinned, disabled.** `backend/Cargo.toml:90` git-pins `trueagi-io/hyperon-experimental` (branch `main`) and `rust-hyperon-bridge/Cargo.toml` pins tag `v0.2.10`, but `syncsenta-backend/Cargo.toml` has `default = []` with `metta = ["dep:hyperon"]`, and the CI comment states the `metta` feature is *"NOT COVERED HERE"*. |
| We use Omega's reasoning architecture | **No.** No NAL, no PLN, no continuous agent loop. Our "stateful" is Supabase rows written per turn; our "reasoning" is rule lookup plus thresholds. |
| `rust-hyperon-bridge` executes real Hyperon over our policy pack | **Tier B.** `HYPERON_RUST_EMBEDDING_PROPOSAL.md` records it compiling under Rust 1.98 with four passing tests including execution of `syncsenta_policy.metta`. Not reproducible here (no linker, no `protoc`). |

**The sentence that is true, and should be the entry's sentence:** *"SyncSenta is the agent. Its mind is
a versioned MeTTa rule pack; its decisions print as a derivation a teacher can re-check, disagree with,
and override; the override changes the next interaction and is recorded with the teacher's name."*
**The sentence to delete everywhere it appears:** "built on Omega."

## 4. Tier C — four sentences in our own artefacts that describe work which does not exist

1. `studio/src/app/api/teacher/apply-feedback/route.ts` returns **202** with *"Patch will be applied to
   a feature branch / Tests will run automatically / If tests pass, patch will merge to main and
   deploy / Check your email for deployment confirmation."* It writes `patch_status='approved'` and
   nothing else; `GITHUB_FEEDBACK_WEBHOOK_URL` is referenced nowhere else in the repo and no workflow
   consumes it; the FastAPI endpoint it depends on, `/teacher/feedback-analysis`, **does not exist in
   `ai-agents/src`**.
2. `https://sentastudio.vercel.app/omega` answers **HTTP 200, 26,624 bytes, unauthenticated** (Tier A,
   curled this session) and renders *"studentsActive / decisionsPerMinute / culturalAdaptations /
   averageEngagement"* generated by `Math.random()` at `components/omega/omega-agent-dashboard.tsx:106-109`
   under the heading *"AI Backbone of SyncSenta"*.
3. `OMEGA_ARCHITECTURE.md`'s "Performance Metrics" and "✅ Verified Optimal" (see §1.1).
4. *"CI runs the Rust tests"* — accepted decision, and `rust-gates.yml` exists locally, but
   `git ls-tree origin/main .github/workflows/` lists only `fetch-bible-corpus.yml`,
   `omega-threshold-sync.yml` and `studio-gates.yml`, and `GET /actions/workflows/rust-gates.yml`
   returns **404** (both Tier A, checked this session). **No Rust test in this repository has ever
   been executed by any runner.**

One claim in an earlier draft of this section has itself been disproved and removed, which is worth
recording because it is the exact failure mode this document is about. I wrote that `AGENTS.md` and
`decision-one-rule-voice.md` cite `studio/src/lib/omega-agent/omega-claw-api.ts`, a path that does not
exist. Re-checked 2026-09-30: neither document asserts that path. `AGENTS.md:113` correctly places the
mirror and its drift lock under `studio/src/lib/omega-agent/`, and then names `omega-claw-api.ts` by bare
filename; that file is genuinely at `studio/src/lib/omega-claw-api.ts`, outside the directory. The real
defect is a layout that splits one decision across two directories — worth a `git mv`, not a paragraph.
Keeping the sharper accusation would have made this document read better and be less true.

Correction applied 2026-09-30 to `docs/PAPERS-AND-POSITIONING.md` §6, which asserted that tamper-evident
agent records were an unclaimed gap. They are not:
[**Agent Audit Trail: A Standard Logging Format for Autonomous AI Systems**](https://datatracker.ietf.org/doc/draft-sharif-agent-audit-trail/)
by Raza Sharif — IETF **individual** Internet-Draft, revision 06, last updated **29 September 2026**
(verified by fetch, so this is Tier A; my first draft of the correction guessed "June 2026" and was
wrong) — specifies a JSON log format with tamper-evident chaining, pre-execution recording and privacy
preservation. Our defensible claim narrows to *records about minors with a named teacher as the verifier
whose disagreement changes the next turn*, not the hashing scheme.

## 5. Where BASIX needs us by 23:59 IST / 21:29 EAT, Friday 2 October

One feature, proven, on camera. Roughly 14 focused hours of build across Wednesday and Thursday,
Friday reserved for recording and submitting.

1. **`studio/src/lib/attest/derive.ts`** — turn one Omega decision into an ordered derivation read from
   `omega_claw_rules.metta`, never a hand-written transcript. ~3 h. Proof: red test first, then
   `npx vitest run src/lib/__tests__/derive.test.ts` green, and the printed trace naming the pack line
   each step came from.
2. **Print it where the product already speaks.** `app/api/chat/route.ts:534` currently injects
   *"MeTTa student-turn boundary: recorded"*. Replace that status with the derivation. ~2 h.
3. **Make the teacher loop real instead of fictional.** Mount the orphaned `feedback-widget.tsx` (zero
   importers today) on `/teacher`, fix the payload/schema mismatch that currently 400s it, and land the
   correction as a **row the mirror consults before the pack**, naming the teacher and the timestamp.
   Delete the branch that tells the teacher tests will run. ~4 h. This is *"the teacher's portal that
   makes the agent smarter"* — and `rust-core/src/teacher_adaptation.rs` already specifies the exact
   contract (`adapt_next_interaction`, *"changes the interaction plan, not the learner's score"*, and
   never copies teacher text into a prompt), so the semantics are decided, not invented.
4. **Sign the artefact.** Ed25519 over canonical JSON from `ATTEST_KEY`, refusing honestly if unset. ~2 h.
5. **README, AI disclosure, 3-minute video, "what we'd build next."** ~3 h.

Cut, explicitly, so nobody re-litigates it this week: the on-chain credential sentence, the "built on
Omega" claim, every subject except **AI and blockchain**, every grade below **Grade 6**, Leptos/Topcoat,
any Rust rewrite of `studio/`, payments, and the three frozen roles.

Owner-gated and blocking the push: **make the repo private → push → fix the platform's `Ascendra` URL →
add BASIX.MARKET as a collaborator → revoke the leaked `gho_…` token.** 47 commits are unpushed and the
tree is public.

## 6. Gaps we will not close this week — named so we never claim them

- **Real Hyperon in the request path.** Needs the `metta` feature to compile (protoc, native toolchain)
  and a host that runs a long-lived process; Vercel does not.
- **Any proof the Rust engine runs.** One CI job on `rust-core` + `syncsenta-backend` would change this
  from Tier B to Tier A, and it needs the `workflow` scope on the token, not more code.
- **Efficacy.** StudentBench-class evidence is somebody else's study; ours is a demo with four
  hand-seeded accounts.
- **Laya** latency and Kiswahili/Sheng accuracy: unmeasured, and unmeasurable on 3.7 GB.
- **Multi-tenancy, the Rust HTTP rewrite, and the single-schema-history migration** — all still Stage 3+
  in ROADMAP §7 and untouched by this hackathon plan.

## 7. What this file does not establish

Everything in Tier A is one command's worth of evidence gathered on 2026-09-30 on a 3.7 GB laptop with
the repo at `494e2ac`; nothing here was verified against the live Supabase project, and no build or test
suite was run in full — the only suite executed was `omega-claw-rules.test.ts` (31 passed). Tier B items
are quoted from documents in this tree and remain unconfirmed. The Track 5 requirement text is our own
transcription of the platform page, not a re-read of it. **If asked "what have you measured?", the honest
answer is: the rule mirror's determinism, this file's greps, and one HTTP status code — and nothing about
learners.**
