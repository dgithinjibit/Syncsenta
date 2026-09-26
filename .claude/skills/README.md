# Agent skills for SyncSenta

Working agreements that shape how coding agents (Claude Code, Kiro, Bonsai,
Qoder) plan, write, review, and talk about changes in this repository. They
target the failure modes already recorded in
[`docs/TASKS.md`](../../docs/TASKS.md) — agent-written code that buries the
answer, skips tests, or lands as one unverifiable blob.

Each directory holds one upstream `SKILL.md`, unmodified. Attribution and MIT
licenses are in the two `LICENSE-*` files here.

| Skill | Source | Use it for |
|---|---|---|
| `i-have-adhd` | [ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd) | Output shape: lead with the next action, number steps, restate progress, no preamble or closer |
| `test-driven-development` | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | Red-green-refactor; required before any behavior change |
| `incremental-implementation` | addyosmani/agent-skills | Landing multi-file changes as thin verifiable slices |
| `debugging-and-error-recovery` | addyosmani/agent-skills | Root-causing failures instead of guessing at fixes |
| `code-review-and-quality` | addyosmani/agent-skills | Pre-merge review across correctness, tests, and readability |
| `code-simplification` | addyosmani/agent-skills | Removing complexity without changing behavior |

## How they are loaded

- **Claude Code / Qoder**: reads this directory natively as `.claude/skills/`.
  Invoke a skill by name (`/i-have-adhd`).
- **Kiro / Bonsai / other agents**: `.claude/skills/` is not on their load path,
  so the rules that matter unconditionally are restated in
  [`AGENTS.md`](../../AGENTS.md) under "Response shape" and "Working agreements".
  Read that section every session; read the individual `SKILL.md` files when a
  task matches its trigger.

## Refreshing from upstream

```bash
git clone --depth 1 https://github.com/addyosmani/agent-skills /tmp/agent-skills
git clone --depth 1 https://github.com/ayghri/i-have-adhd /tmp/i-have-adhd
# copy the SKILL.md files listed above, then diff to see what changed
```

Keep the copies verbatim so a refresh stays a one-line diff. Repo-specific rules
belong in `AGENTS.md` and `docs/CODING_STANDARDS.md`, not in these files.
