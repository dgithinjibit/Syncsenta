# Security Policy

## Reporting a vulnerability

Email **dgithinji331@gmail.com** with the word "security" in the subject. We
aim to acknowledge within 48 hours and to patch confirmed issues before any
public disclosure. You do not need an account to report; this project's demo
accounts are hand-seeded and contain no real learner data.

## Scope

- The deployed app: `sentastudio.vercel.app` (Next.js, `studio/`)
- The agent service: `ascendra-1.onrender.com` (`ai-agents/`)
- This repository's code, docs, and CI workflows

## Good-faith expectations

SyncSenta is an education product for Kenyan classrooms, currently a hackathon
alpha running on four demo accounts. Please test read paths and your own
session only. Do not attempt to access other users' data, DoS the hosted
services, or probe the Supabase project outside the published API. Consent,
waiver, and audit-trail code (`/omega/check`, `developer_tools/scripts/reconcile.mts`)
is exactly the surface we most want reported on — findings there are treated
as the highest-value submissions.

## Known state, stated plainly

- Early commits of this repository's predecessor history contained LLM
  provider test keys (since removed from the tree; the provider credentials
  are being rotated by the maintainer). Do not reuse anything you find in
  history as a working credential — verify before assuming.
- Session auth is Supabase GoTrue with row-level security on the learner
  tables; the demo-login route (`/api/auth/demo-login`) exists deliberately
  for the four role demos and gates nothing real.

## Tooling posture

Dependabot alerts are open and carry a large backlog — recorded as unstarted
work in `docs/ROADMAP.md` §7, not hidden. `.gitignore` is reviewed so that
`*.local` env files never enter the tree. GitHub secret scanning and push
protection are settings the maintainer owns; if this repository is public they
run by default, and findings should still be reported to the address above
rather than acted on in the open.
