## What this changes

One sentence: what does the reviewer get that they did not have before this PR?

## Why now

Link the item in `docs/ROADMAP.md` (section number) or explain what put it on
the map. Thin slices only — if this PR does two verifiable things, split it.

## Evidence (the part that is not optional)

- [ ] Failing test written first and observed failing for the stated reason
- [ ] `npx tsc --noEmit` clean (from `studio/` if TS changed)
- [ ] `npx vitest run --no-file-parallelism --testTimeout=30000` result stated
      **with its counts and clock time**, not "tests pass"
- [ ] Any claim added to a README or doc carries the exact command that produced it
- [ ] `docs/ROADMAP.md` updated in this branch — tier A/B/C wording matches what
      was actually run, nothing upgraded from "has not been done" to done
- [ ] Staged diff scanned for secrets (keys, tokens, passwords, private keys) —
      paste the scan result, not a checkbox from memory
- [ ] `cargo check -p syncsenta-backend` if Rust changed; note in the PR if the
      environment could not run it

## What this does NOT claim

Fill in what remains unverified after this PR — browser passes not done, hosts
not deployed, runtimes not exercised. Deleting this section is how Tier C
sentences got into our docs once already.
