# MeTTa Prototype Archive

**Archived:** September 7, 2026  
**Reason:** Code was fully implemented but never wired to production. See `OMEGA_METTA_STATUS.md` at the project root for full assessment.

---

## What's Here

| File | Original Location | Why Archived |
|---|---|---|
| `lib/omega-agent/metta-core.ts` | `studio/src/lib/omega-agent/metta-core.ts` | ~790 lines of `MeTTaEducationKnowledgeGraph`, `MeTTaInterpreter`, `MeTTaSession`, `MeTTaEducationSystem` — implemented 100%, used 0% in production. |
| `lib/omega-agent/metta-router.ts` | `studio/src/lib/omega-agent/metta-router.ts` | `MeTTaRouter` — agent-driven navigation. Fully implemented, never initialised. |
| `lib/omega-agent/metta-config.ts` | `studio/src/lib/omega-agent/metta-config.ts` | Env var config for MeTTa subsystems. Unused because the subsystems are unused. |
| `lib/omega-agent/aws-integration.ts` | `studio/src/lib/omega-agent/aws-integration.ts` | AWS enhancement strategy document masquerading as code. No runtime logic. |
| `components/metta/metta-student-interface.tsx` | `studio/src/components/metta/` | ~450 lines of demo UI. Not wired to any route. |
| `components/metta/metta-teacher-dashboard.tsx` | `studio/src/components/metta/` | ~500 lines of demo teacher dashboard. Not wired to any route. |
| `app/api/metta/interact/route.ts` | `studio/src/app/api/metta/interact/` | MeTTa interaction endpoint. Only called by the archived student interface demo. |
| `app/api/metta/session/route.ts` | `studio/src/app/api/metta/session/` | MeTTa session persistence endpoint. Only called by `MeTTaSession.persist()` (also archived). |
| `app/metta/page.tsx` | `studio/src/app/metta/` | Full MeTTa-driven application entry point. Uses the archived router and components. |

**Total archived:** ~2,450 lines

---

## What Was NOT Archived

The following live Omega files remain in `studio/src/lib/omega-agent/`:

| File | Status |
|---|---|
| `metta-core.ts` | ✅ **Active** — contains only `evaluateTutoringDecision()` + `OMEGA_THRESHOLDS` |
| `answer-quality.ts` | ✅ **Active** — multi-signal answer classifier (Sept 7, 2026) |
| `server-enrichment.ts` | ✅ **Active** — cultural examples + teacher alerts (Sept 7, 2026) |
| `scaffolding-telemetry.ts` | ✅ **Active** — outcome telemetry payload builders (Sept 7, 2026) |
| `core.ts` | ⚠️ **Client-side** — `OmegaAgent` class, used by `use-omega-agent.ts` hook (wiring planned) |

---

## How to Restore

To bring any of these files back into production:

1. Copy the file from `archive/metta-prototype/` back to its original path under `studio/src/`.
2. Update imports in any callers.
3. Wire the component to a real route.
4. Run `npx vitest run` to check for regressions.
5. Remove it from this archive README.

---

## Integration Decision Criteria

Per `OMEGA_METTA_STATUS.md`, MeTTa is worth reintegrating if:

- It measurably improves learning outcomes vs. the current Omega decision engine
- It reduces code complexity (not increases it)
- It enables features that SQL + TypeScript cannot
- The team can maintain and extend it

Suggested experiment: wire `metta-student-interface.tsx` to `/student/metta-playground`, run with 100 students for 1 week, compare engagement + mastery metrics.
