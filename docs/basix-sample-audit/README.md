# Sample audit trail — Grade 8 AI scheme-of-work check

BASIX Track 5 asks for *one functioning feature and a sample audit trail*. This directory is the sample: the
output of the submitted reconciler, kept in the repository so a reviewer can read it and re-run the exact
command that produced it. Nothing here was pasted from a terminal — `studio/src/lib/__tests__/basix-sample-audit.test.ts`
re-runs the third command below into a temporary directory and fails if `policy.metta`, `ledger.json` or
`diff.json` stop matching these bytes.

No account, no API key, no model call, no network. The rules are two text packs and the decision is a
derivation over them.

## The three runs, in the order they happened

```bash
# 1 · read-only: the checker's opinion of the draft as the teacher left it
node developer_tools/scripts/reconcile.mts

# 2 · the teacher consents to one proposal and waives one mandatory column, and the record is written here
node developer_tools/scripts/reconcile.mts --accept 3 --waive assessmentMethods \
  --actor teacher:kibera_mama_joy --note 'Lesson 2 is oral.' \
  --at 2026-10-02T09:04:15+03:00 --out docs/basix-sample-audit

# 3 · a later run, with no waiver flag anywhere in the command, reads the waiver off disk
node developer_tools/scripts/reconcile.mts --policy docs/basix-sample-audit/policy.metta
```

| File | What it is | What it shows |
|---|---|---|
| `run0-read-only.txt` | stdout of run 1 | `2 clean · 2 blocking · 0 advisory · 4 rows`, `∴ not certified` — two empty mandatory columns, and the agent refusing to invent either |
| `run1-consent-and-waiver.txt` | stdout of run 2 | `3 clean · 0 blocking · 1 advisory`, `∴ certified for classroom use`, four records naming the actor, and `handoff · allowed` |
| `run2-read-back.txt` | stdout of run 3 | `field-obligation-waived-by-teacher` as an **advisory** — the column is still empty and the run says the reason it is allowed to stay empty is the teacher's waiver, not its own opinion |
| `policy.metta` | the policy pack run 2 decided on | the waiver as a line in the pack, which is why run 3 can honour it without being told to |
| `ledger.json` | the consent record | four SHA-256-chained entries, each with `actor`, `timestamp`, `basis` and the rule lines it cites |
| `diff.json` | what consent actually wrote | three cells on row 3, `before` and `after`, against the draft in `studio/public/omega/drafts/kibera_g8_week14.json` |

## What each entry can be held to

Run 2 is the whole claim of the feature in one transcript: an agent that cites `studio/public/omega/ai_g8_design.metta:58`
– `:62` for the proposal it made, a teacher who accepts it under a name and a timestamp, a waiver that moves a
blocking gap to advisory **without moving the certification threshold**, and a lesson-plan generator that is
only allowed to read the scheme once `blocking-must-be-zero` holds. The fourth record is the interesting one —
`row pack · assessmentMethods · override-granted · cited studio/public/omega/scheme_check.metta:38` — because a
waiver is not a gap fix. The column stays empty. What changed is who is answerable for it.

`--at` is why these files are stable. Without it the timestamp is `now` and every re-run rewrites the hash
chain; with it, the same command produces the same bytes six months from now, which is the property an audit
trail is supposed to have.

## Honest limits of this sample

`teacher:kibera_mama_joy` is the repository's Grade 8 demo persona, and the draft is a hand-written scheme of
work for Kibera week 14 — this is a demonstration of the record, not a record of a real teacher's decision
about real pupils. No learner data is in this directory. The packs are MeTTa source read by this repository's
own parser (`studio/src/lib/attest/derive.ts`); running them under real Hyperon is a roadmap item, not a claim
made here. And the hash chain proves these entries were not edited after the fact — it does not prove the
person named in them existed, which is why the actor field is a name a school would have to vouch for.
