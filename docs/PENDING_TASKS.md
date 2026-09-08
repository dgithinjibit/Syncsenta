# Pending Tasks — Self-Prompt Notes
> These are tasks that were scoped, researched, and queued but not yet executed.
> Resume each section as a fresh prompt to Kiro.

---

## 1. Demo Button Deployment

**Status:** Code written locally, NOT yet pushed to Vercel.

**What was done:**
- Replaced "Continue with Google" button with 4 demo account buttons in:
  - `studio/src/components/auth/sign-in-form.tsx`
  - `studio/src/components/auth/sign-up-form.tsx`
- Buttons: 🎒 Student · 📚 Teacher · 👨‍👩‍👧 Parent · 🏫 Head
- Each button calls `signIn(email, password)` directly with demo credentials
- Backend `/api/auth/demo-login` route already deployed
- Demo accounts already seeded in Supabase

**To deploy, run:**
```powershell
cd "c:\Users\hp\codes\Syncsenta"
git add studio/src/components/auth/sign-in-form.tsx studio/src/components/auth/sign-up-form.tsx
git commit -m "feat: replace Google OAuth button with demo account buttons for MVP testing"
git push
```

**Demo credentials (already in Supabase):**
| Role    | Email                        | Password         | Redirect             |
|---------|------------------------------|------------------|----------------------|
| student | student01@syncsenta.dev      | Demo@Student01   | /student             |
| teacher | teacher01@syncsenta.dev      | Demo@Teacher01   | /teacher/dashboard   |
| head    | head01@syncsenta.dev         | Demo@Head01      | /teacher/dashboard   |
| parent  | parent01@syncsenta.dev       | Demo@Parent01    | /dashboard           |

---

## 2. Google OAuth Fix (post-MVP)

**Status:** Deferred — will fix before production.

**Root cause identified:**
- Google OAuth requires `gcloud` CLI installed locally for the MCP server
- More importantly, needs Google Cloud Console OAuth client configured with correct redirect URIs
- Supabase Google provider needs Client ID + Secret

**What needs to happen:**
1. Go to https://console.cloud.google.com → APIs & Services → Credentials
2. Create OAuth 2.0 client ID (Web application)
3. Add authorized redirect URIs:
   - `https://[supabase-project-id].supabase.co/auth/v1/callback`
   - `https://sentastudio.vercel.app/auth/callback`
4. Copy Client ID + Secret into Supabase Dashboard → Authentication → Providers → Google
5. Re-enable Google button in both auth forms

**Files to revert when fixing:**
- `studio/src/components/auth/sign-in-form.tsx` — restore `handleGoogleSignIn` and Google button
- `studio/src/components/auth/sign-up-form.tsx` — same

---

## 3. MeTTa Roadmap + Architecture Analysis

**Status:** Researched, not yet written. Resume this task when ready.

**Resume prompt for Kiro:**
```
Using the research already done this session, write the full MeTTa roadmap 
covering all 8 hackathon items from the two slides (Track 01 Five things worth 
building + Track 02 Three things worth building), plus the Omega agent integration 
plan. All code and agent logic should be in MeTTa language. Also answer the 
architectural question: given SingularityNET/OpenCog Hyperon uses Distributed 
AtomSpace (DAS) with MongoDB + Redis as its storage backend, do we still need 
Supabase in this project? Write it all to:
docs/metta-architecture-and-roadmap.md
```

**Research findings to include:**

### How SingularityNET/Hyperon Carries Data

**AtomSpace (in-RAM metagraph):**
- Primary knowledge store — a hypergraph database held in memory
- Atoms = nodes + links representing all knowledge, rules, percepts
- MeTTa scripts read/write directly into AtomSpace via pattern matching

**Distributed AtomSpace (DAS) — the persistence layer:**
- Extends AtomSpace for distributed, multi-agent scenarios
- Backend: **MongoDB** (stores MeTTa expressions/atoms) + **Redis** (indexes + caching)
- Source: [singnet/das-poc](https://github.com/singnet/das-poc)
- Postgres StorageNode also exists (`atomspace-pgres`) but is deprecated
- RocksDB backend exists for local single-node file storage

**Fetch.ai / Agentverse uAgents storage:**
- Agents use `ctx.storage` — a simple key-value JSON store per agent
- Stored locally as JSON files inside the agent process
- NOT a centralised database — each agent owns its own state
- For shared/persistent state across agents, you connect to an external DB

### Do We Still Need Supabase?

**Short answer: YES, for now. Partially replace later.**

| Concern                  | Supabase (keep)                        | AtomSpace/DAS (replace with)             |
|--------------------------|----------------------------------------|------------------------------------------|
| User auth + sessions     | ✅ Keep — Supabase Auth is solid        | ❌ DAS has no auth layer                 |
| User profiles/students   | ✅ Keep — RLS, roles, structured data   | Could mirror into AtomSpace for reasoning|
| CBC curriculum content   | ✅ Keep — structured relational queries | Mirror into AtomSpace as knowledge atoms |
| AI agent working memory  | ❌ Don't use Supabase for this          | ✅ AtomSpace/DAS is the right layer       |
| Inter-agent knowledge    | ❌ Don't use Supabase for this          | ✅ DAS (MongoDB+Redis) is correct         |
| Learning evidence / xAPI | ✅ Keep for audit trail + RLS           | Mirror summaries into AtomSpace          |
| Real-time subscriptions  | ✅ Keep — Supabase Realtime             | Not available in DAS                     |

**Migration strategy:**
- Phase 1 (MVP): Keep all Supabase. Add AtomSpace as agent working memory only.
- Phase 2: Mirror curriculum + student profiles into AtomSpace atoms for MeTTa reasoning.
- Phase 3: DAS becomes the knowledge layer. Supabase becomes the auth + audit layer only.

### Track 01 — Five Things Worth Building (MeTTa)

1. **Skill-to-Brief Marketplace Router**
   - MeTTa atoms: `(Student $id (Skills $s) (CompletedProjects $p) (Grade $g))`
   - Pattern match student skills against posted briefs
   - Rank by credential verification + near-miss explanation

2. **University Activation Pack**
   - MeTTa atoms: `(Institution $id (Status inbound) (Tier $t))`
   - Generate co-branded onboarding from institution profile
   - Track position in activation funnel as state transitions

3. **Student Portfolio Storefront**
   - MeTTa atoms: `(Portfolio $student (Badges $b) (QuizHistory $q) (Projects $p))`
   - Compose verifiable public page from atoms
   - Employer-readable proof without raw data exposure

4. **Cohort Health Agent**
   - MeTTa atoms: `(Student $id (XP $xp) (LastActive $t) (DriftRisk $r))`
   - Pattern match students approaching drop-off threshold
   - Draft mentor outreach message as MeTTa string output

5. **Fractional CTO Workflow**
   - MeTTa atoms: `(Interview $id (Requirements $r) (VendorOptions $v))`
   - Chain: interview → requirements → build-vs-buy → MVP roadmap
   - Output: development brief as structured MeTTa expression

### Track 02 — Three Things Worth Building (MeTTa)

1. **Expertise Locator**
   - MeTTa atoms: `(Person $id (Departments $d) (Publications $p) (Topics $t))`
   - Find shortest path from question to person via shared graph
   - Path IS the deliverable — not just the name

2. **Local Trade Connection Finder**
   - MeTTa atoms: `(Supplier $id (Goods $g) (Location $l))`
   - Surface two-hop and three-hop trades where no direct match exists
   - Constraint: local economy only

3. **Constrained Recommender**
   - MeTTa atoms: `(Item $id (CompatibleWith $c) (Restrictions $r) (Prerequisites $p))`
   - Hard constraints beat similarity scoring — MeTTa's pattern match enforces this natively

4. **MeTTa = Meta-Type Talk (the language itself)**
   - The Hyperon cognitive stack
   - Agents represent, reason over, and exchange knowledge as atoms
   - All 7 items above are implemented IN MeTTa running on AtomSpace

---

## 4. gcloud CLI Setup (for Google Cloud MCP)

**Status:** Partially complete. Resume when needed.

**What was done:**
- Downloaded and installed Google Cloud SDK to `C:\Users\hp\AppData\Local\Google\Cloud SDK\`
- Set `CLOUDSDK_PYTHON` env var to bundled Python
- Confirmed `gcloud --version` works via direct Python call

**Still needed:**
```powershell
$env:CLOUDSDK_PYTHON = "C:\Users\hp\AppData\Local\Google\Cloud SDK\google-cloud-sdk\platform\bundledpython\python.exe"
& $env:CLOUDSDK_PYTHON "C:\Users\hp\AppData\Local\Google\Cloud SDK\google-cloud-sdk\lib\gcloud.py" auth application-default login
```
This opens a browser to authenticate. Once done, the gcloud MCP server will connect.

**mcp.json entry (already saved):**
```json
"gcloud": {
  "command": "npx",
  "args": ["-y", "@google-cloud/gcloud-mcp"],
  "env": {
    "CLOUDSDK_PYTHON": "C:\\Users\\hp\\AppData\\Local\\Google\\Cloud SDK\\google-cloud-sdk\\platform\\bundledpython\\python.exe"
  },
  "disabled": false
}
```
Note: `@google-cloud/gcloud-mcp` package may not be published to npm yet — verify before retrying.

---

*Last updated: September 2, 2026*
