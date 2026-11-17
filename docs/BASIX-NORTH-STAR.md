# SyncSenta engineering North Star

This is the operating charter for choosing and verifying engineering work.
The [Phase 2 Roadmap](ROADMAP.md) defines the current teacher-analytics scope.

## Mission

SyncSenta helps Kenyan schools support learning through teacher-facing
workflows grounded in authorized application data.

## Evidence rule

Use the strongest wording the evidence supports:

| Evidence | Claim |
|---|---|
| Source or configuration inspected | “The code/configuration defines…” |
| Test or build run successfully | “The test/build passes…” |
| Exact deployed endpoint checked | “The deployed endpoint returned…” |
| User flow observed in a browser | “The flow was browser-verified…” |

Do not treat “implemented”, “tested”, “deployed”, and “browser-verified” as
interchangeable. Do not claim a dashboard is live or accurate from a component,
type, mock, or passing unit test alone.

## Filters for proposed work

Before adding work to the roadmap, ask:

1. Does it improve a real learner or teacher workflow in the current scope?
2. Is the data source and the meaning of any displayed metric clear?
3. Is the current route or service the correct place to implement it?
4. Can the behavior be tested locally and verified against its real boundary?
5. Does it preserve learner privacy, teacher authorization, and RLS?

If a filter cannot be answered, record the uncertainty instead of filling the
gap with an assumption.

## Working rules

- Investigate the existing route and data path before changing code.
- Write a focused failing test before implementing a behavior fix.
- Keep one verifiable change at a time; update the roadmap when scope or
  evidence changes.
- Treat errors as errors. Never disguise a failed data request as an empty
  dashboard or substitute invented values.
- Production database changes, account changes, and public deployments require
  the responsible owner's approval.
- Preserve unrelated worktree changes and keep secrets and learner-identifying
  data out of diffs, logs, and issue reports.
