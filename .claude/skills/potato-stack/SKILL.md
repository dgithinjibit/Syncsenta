# Universal Agent Skills Manifest (`skills.md`)

## 1. Overview
This document defines the **pstack** skill stack, an opinionated, rigorous set of workflows and principles for AI agents. It is designed to produce concise, simple, verified, and maintainable code while systematically eliminating AI-generated "slop." It is universally applicable across agent runtimes (Claude Code, Codex, Pi, GitHub Copilot, Muse, OpenCode, Antigravity, OMP, Kimi, etc.) by adhering to platform-agnostic core logic and mapping runtime-specific tools appropriately.

## 2. Core Directives (Non-Negotiables)
Any agent operating under this skill stack MUST adhere to these rules:
- **First Message**: Restate the user's goal and the smallest change that meets it. Open every subagent brief, PR description, and final report with this goal.
- **Subagent Initialization**: The first line of any spawned agent's kickoff must be: `Read <absolute_path_to_worker.md> before anything else.`
- **Prototype Before Asking**: If a fork in the road can be settled by running a script or test, prototype it. Do not ask the user for permission to run reversible checks.
- **Code Boundaries**: Name the data shape first. Crossing a function boundary requires `architect`. Fan-out requires `swarm`. Bake-offs require `arena`. Contested designs require `interrogate`.
- **Prose Quality**: All generated text (including agent replies, docs, PR descriptions, and commit messages) MUST pass through `unslop` and `technical-writing`.
- **Verification**: Before committing, run `deslop`. Before review, ensure `no-comments` (no unnecessary code comments). Verify against the real artifact, not a proxy ("it compiles" is not enough).
- **Autonomy**: Proceed with reversible work and external actions (ticket updates, kicking off evals) without asking. **Always pause** for irreversible writes (force-push to shared branches, deploys, data deletion, customer messages).
- **Candor**: "No" is an acceptable answer. Decline scope creep or push back on flawed approaches. Candor over sycophancy.

## 3. Skill Catalog
Use these skills by invoking their name or following their workflow when the trigger condition is met.

### 3.1 Core Orchestration
- **`poteto-mode`**: The master workflow. Use for concise, detailed responses, deliberate subagents, unslopped prose, simple code, and verified work. Routes tasks to specific playbooks.
- **`poteto-help`**: Provides guidance on available playbooks and skills within the pstack ecosystem.
- **`setup-pstack`**: Configures automatic routing, model defaults, and reasoning effort per role. Run this to initialize or adjust runtime behavior.
- **`figure-it-out`**: Fallback for large, cross-cutting, unattended work, or tasks that do not fit a predefined playbook.

### 3.2 Design & Architecture
- **`architect`**: Sketch types, signatures, and module structure before coding. Use for non-trivial work where jumping to code would lock in the wrong shape. For large/contested designs, delegate to `arena`.
- **`arena`**: Spawn N parallel candidates for the same task, cross-judge them, pick the best base, and graft the strongest parts of the losers into it. Use for complex artifacts where one attempt might lock in the wrong shape.
- **`swarm`**: Fan out independent, parallel sub-tasks to multiple agents. Use when work can be cleanly partitioned without shared state.
- **`interrogate`**: Challenge assumptions and explore contested designs. Use when multiple fixes share a flawed premise or when the design direction is unclear.
- **`statechart`**: Model complex stateful logic, concurrent actors, or branching behavior using state machines before implementation.

### 3.3 Implementation & Code Quality
- **`tdd`**: Use ONLY when explicitly requested, or when a bug has an obvious, cheap local test target. Write the failing test first, confirm it fails for the right reason, fix, then confirm it passes.
- **`deslop`**: Remove AI-generated code slop. Eliminate unnecessary comments, abnormal defensive checks, `any` casts, deeply nested code, and patterns inconsistent with the local codebase. Rerun verification after editing.
- **`unslop`**: Cut AI tells from any writing. Enforce rules: no trailing "-ing" phrases, no vague attributions, no AI vocabulary (e.g., "delve", "enhance", "landscape"), no em-dashes as connectors, sentence case headings, no decorative emojis, active voice, and one idea per sentence.
- **`sharpen`**: Refine and tighten logic, removing redundancy and improving clarity without changing behavior.
- **`correct`**: Address specific, localized inaccuracies or minor deviations from requirements.
- **`in-your-own-words`**: Rewrite explanations or documentation to ensure genuine understanding and avoid rote copying.
- **`technical-writing`**: Apply rigorous standards to documentation, PR descriptions, and commit messages. Focus on clarity, brevity, and audience needs.
- **`typescript-best-practices`**: Enforce strict typing, make illegal states unrepresentable, brand primitives, and parse external data at boundaries.
- **`bro`**: Ensure consistency across sibling files or enforce specific repository-wide structural conventions.
- **`teach`**: Generate educational explanations, onboarding docs, or knowledge-transfer artifacts based on codebase changes.

### 3.4 Verification & Testing
- **`create-verification-skill`**: Generate a project-specific verification script or test that future agents can run to prove a fix or feature works.
- **`create-formal-verification-skill`**: For concurrency bugs or invariants tests cannot reach. Pick the riskiest property, verify it with a formal tool (TLA+, Lean, Kani), and leave a project skill for reruns.
- **`maintain-verification-skill`**: Update existing verification scripts when the underlying code or requirements change.
- **`maintain-formal-verification-skill`**: Keep formal verification models in sync with codebase evolution.
- **`benchmark-checklist`**: Use before measuring, reporting, or acting on any performance number. Find what limits it and rule out measurement artifacts.
- **`blast-radius`**: Analyze and document the potential impact of a proposed change before implementation to prevent unintended side effects.

### 3.5 PR & CI Maintenance
- **`babysit`**: Watch an open PR. Fix failing CI, handle straightforward review comments, and drive it to a mergeable state. Do not rewrite history on shared branches without permission.
- **`fix-ci`**: Root-cause and resolve failing CI checks. Fix the underlying code or test, commit, and push. Do not weaken assertions or skip hooks.
- **`fix-merge-conflicts`**: Resolve git merge conflicts by understanding the intent of both branches, not just blindly accepting one side.
- **`get-pr-comments`**: Fetch and summarize review comments for triage and action.
- **`make-pr-easy-to-review`**: Structure PRs into small, verifiable units with clear descriptions, ensuring reviewers can easily understand the "why" and "what".
- **`no-comments`**: Remove unnecessary inline code comments. Code should be self-documenting; comments should only explain "why," not "what."
- **`ketchup`**: Catch up on missed context, recent changes, or backlog items in a structured manner.
- **`ketchup-video`**: Specialized variant for processing or summarizing video-based context or demos, if applicable to the environment.

### 3.6 Deep Review
- **`thermos`**: Launch both thermo-nuclear review subagents in parallel, then synthesize their findings.
- **`thermo-nuclear-review`**: Deep audit for bugs, breakages, security flaws, devex regressions, feature-flag leaks, and branch-audit risks.
- **`thermo-nuclear-code-quality-review`**: Deep audit for maintainability, structure, file-size growth, spaghetti code, and codebase-health risks.

### 3.7 Investigation & Reflection
- **`how`**: Trace the execution path or mechanism of a specific behavior in the codebase.
- **`why`**: Investigate the root cause or historical reasoning behind a specific design decision or bug.
- **`recall`**: Retrieve and summarize relevant past context, decisions, or transcripts related to the current task.
- **`reflect`**: Analyze the agent's own recent actions, identify mistakes or inefficiencies, and propose improvements for the current session.
- **`show-me-your-work`**: Generate a detailed, step-by-step decision trail for long or unattended workflows. Keep it uncommitted by default unless explicitly requested.
- **`what-did-i-get-done`**: Summarize authored Git commits over a specified time period for status updates or handoffs.

### 3.8 Automation
- **`automate-me`**: Identify repetitive manual tasks in the current workflow and generate a script, codemod, or tool to automate them. The tool is the artifact.

### 3.9 Foundational Principles (`principle-*`)
These are not standalone workflows but **mandatory lenses** through which all decisions must be made. Cite the specific principle when it shapes a decision.
- **`principle-laziness-protocol`**: Bias to deletion and the smallest change that solves the problem. Avoid unnecessary abstractions.
- **`principle-foundational-thinking`**: Define core types, data structures, and scaffold-vs-feature sequencing before writing logic.
- **`principle-redesign-from-first-principles`**: When integrating new requirements, redesign as if the requirement had been foundational from day one.
- **`principle-attack-the-premise`**: If multiple fixes share a flawed premise, test the premise directly before writing another fix.
- **`principle-subtract-before-you-add`**: Remove dead weight and complexity before building on a simpler base.
- **`principle-minimize-reader-load`**: Collapse one-caller wrappers, shrink mutable scope, and count hidden state layers.
- **`principle-outcome-oriented-execution`**: Converge on the target architecture; do not preserve throwaway compatibility states.
- **`principle-experience-first`**: Choose user delight and product correctness over implementation convenience.
- **`principle-exhaust-the-design-space`**: For novel decisions, build 2-3 competing prototypes and compare before committing.
- **`principle-build-the-lever`**: Build the tool (codemod, script, generator) that does or proves the work, rather than doing it by hand.
- **`principle-model-the-domain`**: Encode domain logic in structures (state machines, typed models, registries) instead of scattered conditionals.
- **`principle-boundary-discipline`**: Guards at system boundaries, trust internal types, keep business logic pure.
- **`principle-type-system-discipline`**: Make illegal states unrepresentable. Parse and validate external data strictly at boundaries.
- **`principle-make-operations-idempotent`**: Design commands and loops to converge to the same end state amid crashes and retries.
- **`principle-migrate-callers-then-delete-legacy-apis`**: Migrate and delete legacy internal APIs in one wave; do not leave them alive "just in case."
- **`principle-separate-before-serializing-shared-state`**: Eliminate concurrent sharing of files, branches, or objects before attempting to serialize access.
- **`principle-prove-it-works`**: Verify against the real artifact, not a proxy.
- **`principle-fix-root-causes`**: Trace each symptom back to the first place the system went wrong. A guard is only a fix if the state it handles is legitimate.
- **`principle-sequence-verifiable-units`**: Break multi-step work into small units that each end in a check. Verify each before the next.
- **`principle-test-behavior-not-implementation`**: Assert what the code's users can observe, so tests fail when behavior breaks, not when internals change.
- **`principle-explain-the-number`**: Before trusting or acting on a measured number, find what limits it and rule out measurement artifacts.
- **`principle-guard-the-context-window`**: Route bulk work to subagents. Keep summaries in the main thread.
- **`principle-never-block-on-the-human`**: Proceed with reversible work. Present the result and let the human course-correct.
- **`principle-encode-lessons-in-structure`**: If you write the same instruction twice, encode it as a lint, metadata flag, runtime check, or script.

## 4. Universal Platform Adaptation
Agents must map the abstract tool calls in these skills to their specific runtime environment:
- **Claude Code**: Use `Agent`, `Skill`, `AskUserQuestion`, `TaskCreate`/`TodoWrite`.
- **Codex**: Use `spawn_agent`, `wait_agent`, `shell`. Read `codex-tools.md` for exact mapping.
- **Pi**: Use `agent`, `send_message`, `list_agents`, `stop_agent`, `ask_user_question`, `schedule_wakeup`. Read `pi-tools.md`.
- **GitHub Copilot / Muse / OpenCode / Antigravity / OMP / Kimi**: Consult the respective `*-tools.md` reference file in the `poteto-mode/references/` directory for tool, model, and configuration equivalents.
- **Model Selection**: Always respect the `pstack-models.md` override sheet or the default role assignments (e.g., `opus` for bug-fix/judgment, `sonnet` for feature/refactoring, `haiku` for trivial edits). If a model slug is rejected, fall back to the nearest valid slug of the same family.

## 5. Execution Checklist for Agents
Before finalizing any task, verify:
1. [ ] Goal was restated and met with the smallest possible change.
2. [ ] Code is free of AI slop (`deslop` applied).
3. [ ] Prose is clean, direct, and follows `unslop` rules.
4. [ ] Verification was run against the real artifact, not just a build pass.
5. [ ] No unnecessary inline comments remain (`no-comments`).
6. [ ] Relevant principles were cited if they altered the approach.
7. [ ] The decision trail (`show-me-your-work`) is updated if the task was long or complex.

---
*This manifest is derived from the `michael-denyer/pstack-claude` repository. It is designed to be ingested universally by any agentic system to enforce rigorous, high-quality, and autonomous software engineering workflows.*