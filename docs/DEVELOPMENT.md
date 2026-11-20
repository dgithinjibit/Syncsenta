# Development

The active development paths are Studio, the Python AI Agents service, and the
Rust workspaces. Read [Architecture](ARCHITECTURE.md) for request boundaries
and the [Developer Debugging Playbook](DEBUGGING_PLAYBOOK.md) for
symptom-based diagnostics and the Jira-ready report template.

## Prerequisites

- Node.js `>=22.18` for Studio, as declared by
  [`studio/package.json`](../studio/package.json)
- Python 3.11 for AI Agents, as declared by
  [`ai-agents/runtime.txt`](../ai-agents/runtime.txt)
- npm and Poetry
- Local test credentials for any external services the workflow exercises
- Rust stable, Cargo, a C/C++ toolchain, CMake, and Git for the Rust workspaces;
  backend tests also require PostgreSQL with the backend migrations applied

The Studio GitHub workflow currently pins Node 20. When local and CI results
differ, compare the actual runtime and first failing log before changing
application code.

## Environment

For Studio, copy [`studio/.env.example`](../studio/.env.example) to
`studio/.env.local` and fill in only the values needed for your local task.
Build-time checks require `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`; provider keys are optional for compilation
but required to exercise provider-backed routes. Keep service-role and model
keys server-side and out of Git.

For AI Agents, use the configuration in
[`ai-agents/render.yaml`](../ai-agents/render.yaml) as the deployment contract
and [`ai-agents/.env.example`](../ai-agents/.env.example) as a local template.
Do not assume the checked-in template matches the live Render service; verify
the deployed environment before investigating a production-only failure.

## Run locally

Studio:

```bash
cd studio
npm ci
npm run dev
```

AI Agents:

```bash
cd ai-agents
poetry install --with dev
PYTHONPATH=src poetry run uvicorn syncsenta_agents.api.server:app \
  --host 127.0.0.1 --port 8001 --reload
```

The local FastAPI health route is `http://127.0.0.1:8001/healthz`. A running
Studio app can use that service by setting
`NEXT_PUBLIC_AI_AGENTS_URL=http://localhost:8001` in its local environment.
Student chat in Studio is a separate path and does not require the FastAPI
service.

## Training dataset preparation

From the repository root, generate the reproducible synthetic examples and
prepare the combined dataset:

```bash
python3 developer_tools/ai-agents/scripts/generate_training_dataset.py
python3 developer_tools/ai-agents/scripts/prepare_for_training.py
```

Run the focused preparation checks with:

```bash
python3 -m unittest discover \
  -s developer_tools/ai-agents/scripts -p 'test_prepare_for_training.py' -v
```

The fine-tuning inputs are `ai-agents/data/training/splits/{train,val,test}.jsonl`.
The preparation step also writes complete and split-specific CSV files; CSV
preserves metadata and system/user/assistant messages for inspection and
analysis. Duplicate conversations are kept together in a single split.
Parquet export is not currently implemented.
The seeded generator now varies the numeric examples and grade/region context;
its generated records are still synthetic and have not been independently
reviewed against CBC curriculum or by educators. Automated arithmetic checks
do not establish pedagogical quality.

For a separate tabular evaluation fixture for tutoring-policy and connectivity
labels, see [`datasets/curriculum-evaluation/`](../datasets/curriculum-evaluation/).
It contains 5,000 deterministic synthetic rows in JSONL and CSV. Regenerate and
validate it with:

```bash
python3 datasets/curriculum-evaluation/generate_dataset.py
python3 -m unittest discover \
  -s datasets/curriculum-evaluation -p 'test_*.py' -v
python3 datasets/curriculum-evaluation/validate_dataset.py
```

Its expected labels mirror the current rules and are not educator-approved
ground truth; do not use model scores from this fixture as evidence of learner
outcomes, educational quality, or fairness.

These commands prepare data only. The optional
[`start_training.sh`](../developer_tools/scripts/start_training.sh) refers to
AMD setup and model-training scripts that are not checked in, so it fails
clearly until that training implementation is supplied.

## Rust workspaces

The root workspace contains `rust-core/` and `rust-service/`. The backend is a
separate workspace under `backend/`; its default features use Hyperon MeTTa.
`--no-default-features` selects the limited in-process fallback and is not the
normal runtime. When running the backend from `backend/`, copy
[`backend/.env.example`](../backend/.env.example) to `backend/.env` and set
`DATABASE_URL`, `JWT_SECRET`, and `SYNCSENTA_OMEGA_PROXY_JWT_SECRET`. The
proxy secret must match Studio's server-only value; do not commit either `.env`
file.

Run root workspace tests from the repository root:

```bash
cargo test --workspace
```

The backend uses compile-time SQLx queries, so `DATABASE_URL` must point to a
PostgreSQL database with `backend/syncsenta-backend/migrations/` applied before
building or testing:

```bash
cd backend
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/syncsenta \
  cargo test -p syncsenta-backend
```

The [Rust CI workflow](../.github/workflows/rust-gates.yml) shows the full
database-backed sequence used by CI.

Studio's Omega policy proxy and the Rust backend must share
`SYNCSENTA_OMEGA_PROXY_JWT_SECRET` (at least 32 bytes). Studio validates the
Supabase caller, then signs a short-lived student assertion for the separately
authenticated Omega route. Raw Supabase access tokens are not accepted by that
Rust route. Set `SYNCSENTA_BACKEND_URL` in Studio to the Rust service origin
without `/api/v1`; Studio calls `/api/v1/omega-claw/{route}` to match the
backend mount. Missing URL or proxy-secret configuration fails closed with
503. The backend exposes `/healthz` for the Render health check in root
[`render.yaml`](../render.yaml).

For Render, set the backend's `JWT_SECRET` and shared
`SYNCSENTA_OMEGA_PROXY_JWT_SECRET` as secrets. The backend uses compile-time
SQLx queries, so the linked PostgreSQL schema must be migrated before the
Rust build; runtime startup also runs the backend migrations. Supply
`SYNCSENTA_BACKEND_URL` and the same proxy secret to Studio. This config does
not deploy the service or verify its live URL.

## Verify changes

Run the narrowest relevant test first. Before a Studio change is complete, run
the applicable typecheck, unit tests, and build:

```bash
cd studio
npx tsc --noEmit
npm test
npm run build
```

For Python service changes:

```bash
cd ai-agents
PYTHONPATH=src poetry run pytest -q
```

Do not claim deployment or browser verification from a passing local check.
Record exact commands and results in the change or issue. See the debugging
playbook for service-specific checks and safe evidence collection.

## Database changes

Inspect the migration history and the actual target schema before editing or
applying a migration. Test against a non-production project first. Production
migrations and data changes require the database owner's approval; never bypass
RLS or use service-role credentials in browser code as a debugging shortcut.
