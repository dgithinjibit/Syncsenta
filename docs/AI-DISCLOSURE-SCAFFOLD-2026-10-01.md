# AI Disclosure — BASIX Track 5 (Solo), challenge 1

**Status: SCAFFOLD. This is not submittable yet.** BASIX requires the disclosure to be written in the
builder's own words. Everything below the `WRITE IN YOUR OWN WORDS` markers has to be replaced by the owner;
everything above them is an inventory of what is verifiable in this repository, gathered so the owner is not
guessing at facts when they write it.

Deadline: 23:59 IST, 2 October 2026.

---

## 1. The one-sentence version

AI wrote most of this code and none of its decisions: the auditable decision this project submits is produced
by rule derivation over two MeTTa files and makes **no model call** — verified 2026-10-01 by
`grep -cE "fetch\(|process\.env|OPENAI|axios"` returning **0** across `developer_tools/scripts/reconcile.mts`,
`studio/src/lib/attest/derive.ts` and `developer_tools/scripts/omega-alias.mjs`.

## 2. Where AI was used to *build* (development time)

| What AI did | Evidence in the repository |
|---|---|
| Wrote the reconciler, the MeTTa subset interpreter (`derive.ts`), the hash-chained ledger, the handoff gate, the CLI and the page | `developer_tools/scripts/reconcile.mts`, `studio/src/lib/attest/`, `studio/src/app/omega/check/`, with tests in `studio/src/lib/__tests__/scheme-*.test.ts` |
| Wrote the tests before the code, red first, and recorded the flip | commit messages and `docs/ROADMAP.md` §9 name the red counts (e.g. `1 failed / 10 passed` before `11 passed`) |
| Wrote this document's scaffold, `README.md`'s submission section, `docs/ROADMAP.md`, `docs/BASIX-PR-BODY.md` | those files |
| Ran the commands: test suite, `vercel deploy`, `curl`, `git` | suite **1085 passed / 17 skipped** across 110 files, exit 0, 62.75 s with `--testTimeout=30000`, 2026-10-02 |
| Corrected its own false claims in public | `docs/ROADMAP.md` §9 records that a preview deploy described as "Ready in 54 s, 200, shows the sign-in page" was wrong, and what `vercel inspect` actually printed |

**WRITE IN YOUR OWN WORDS (a) — why you let an agent write this much, and what you required of it.** One
paragraph. What you care about here is not speed; it is that a teacher-facing system should not be trusted
because it shipped, and whether that belief is what shaped the rules above.

## 3. Where AI was used to *decide* (run time)

| Surface | Model call? | Status |
|---|---|---|
| The submitted feature: Grade 8 AI scheme-of-work check | **None.** Rules over `studio/public/omega/ai_g8_design.metta` + `scheme_check.metta` | Tier A — no `fetch`, no env read, deterministic, re-runnable |
| Student tutor `/api/chat` | Yes — `studio/src/lib/llm/provider-chain.ts` closes the choice set at `LlmProvider = 'groq' \| 'gemini'`, needs `GROQ_API_KEY`, falls back to `GEMINI_API_KEY` | Present in code; **not** part of this submission |
| `studio/src/lib/aisa-client.ts`, `multi-ai-client.ts` | Yes — `AISA_API_KEY`, base `https://api.aisa.one/v1`, default `deepseek-v3` | Present in code; not used by the check |
| Organisers' ASI gateway (`ASI_CLOUD_KEY`, `llm.c.singularitynet.io`) | Planned | **Not wired.** No key is configured, and the decision recorded 2026-10-01 is that a model must never produce a verdict — if a model decides, the auditable-decision claim is gone |

**WRITE IN YOUR OWN WORDS (b) — the line about the guardrail you set.** The rule above ("never for a verdict")
is yours, and it is the most interesting sentence in this disclosure. Say it in your own framing.

## 4. What the human did

Product decisions, all recorded as owner decisions in `docs/ROADMAP.md` and the memory files: which track and
challenge to enter; that the consent model has to allow a teacher to refuse and have the refusal be *visible*
in the record; that sign-ups are out of scope and four hand-seeded demo roles are enough; that the vision and
mission text had to be ratified before code; the Kiswahili direction; the order of operations on GitHub
(private first). The owner also ran the steps an agent must not run: the GitHub device authorisation, and the
Vercel credential.

**WRITE IN YOUR OWN WORDS (c) — one concrete moment where you overruled the agent.** There is at least one
true one; the disclosure is worth more for naming it than for any general statement about oversight.

## 5. Limits of this disclosure — say them, don't hedge them

1. The page has never been walked by a logged-in teacher on a served URL; the preview deployment is
   `● Blocked` by a Vercel project permission. Locally it renders and reproduces the terminal byte for byte.
2. No efficacy evidence: four hand-seeded demo accounts, one hand-written pack, no real school's records.
3. `derive.ts` is this repository's own parser for the subset of MeTTa the two packs use, not Hyperon.
   Running the same packs under real Hyperon and diffing is scheduled, not done.
4. `tsc --noEmit` over the whole project and `next build` on this machine have never been run; the narrowed
   typecheck net exits 0 and is documented as narrowed.
5. Claims in this repository are tiered — A: a command in this tree produced it; B: recorded but not
   re-measured; C: written in our own docs and false — and §9 of the roadmap is where B and C get named.

**WRITE IN YOUR OWN WORDS (d) — what you'd say to an education officer who asks whether to trust this.**
Short. This is the question the challenge is actually asking.

---

### How to finish this

1. Replace the four `WRITE IN YOUR OWN WORDS` blocks. Delete the headers when you do.
2. Cut it to 400–600 words; a judge reads it once.
3. Put the final text in `README.md` as an "AI Disclosure" section (that is where BASIX looks) and delete or
   keep-this-file-as-history, your call.
4. Do not let the agent rewrite your paragraphs afterwards — the point of the requirement is your voice.
