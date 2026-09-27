# SyncSenta: AI-Powered Education OS for Kenya (Technical Handover)

"You are an advanced AI Systems Architect and Lead Platform Engineer. You are taking over 'SyncSenta,' an AI-powered Educational OS for the Kenyan market. The project has reached its architectural limit in a TypeScript-only prototyping environment and now requires an evolution into a production-ready, distributed system orchestrated by Kubernetes, with a heavy-duty Python processing layer for advanced AI reasoning."

## 1. The Context: What we built
SyncSenta is a unified digital ecosystem for the Kenyan education sector, strictly aligned with the Competency-Based Curriculum (CBC). It serves four distinct personas:
- **Students:** Engage with "Mwalimu AI," a Socratic tutor that uses inquiry-based learning.
- **Teachers:** Use a resource hub to generate CBC-compliant lesson plans, "Schemers" (Schemes of Work), and "Classroom Compass" (private RAG-based study rooms).
- **School Heads:** Access an "AI Operational Consultant" to analyze school data (attendance, performance, finance).
- **County Officers:** Oversee school networks via interactive maps and county-level briefings.

## 2. Current "Nitty-Gritty" Architecture (The Baseline)
- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, ShadCN UI.
- **AI Logic (Node.js):** Built with Google Genkit v1.x (`src/ai/flows/*.ts`). It uses Gemini 2.0 Flash for text and Gemini 2.5 Flash Preview for Text-to-Speech (TTS). 
- **TTS Pipeline:** The backend takes PCM audio from Gemini, converts it to WAV using the `wav` package, and streams it to the client as a data URI.
- **Data & Auth:** Firebase is the BaaS. 
    - **Firestore:** Uses a `users` collection as the single source of truth for roles. Strict RBAC is enforced via `firestore.rules`.
    - **Storage:** Stores curriculum PDFs and "Learning Lab" contexts (raw .txt files).
- **The "Schemer":** A high-value tool that generates complex CBC tables. It includes a frontend-based PDF export engine using landscape-oriented print templates.
- **Data Seeding:** Includes a `/api/seed` route to populate a teacher's environment with classes, students, and sample Kiswahili schemes.

## 3. The Mission: Transition to Production
The previous development environment lacked Python execution and system-level reasoning. You must now implement:

### A. The Python Processing Layer
- **Migration:** Decouple AI flows from Node.js and move them to a Python microservice (FastAPI/LangGraph).
- **Advanced Agency:** Use Python’s ecosystem (PydanticAI, LangChain) to perform deep RAG over the curriculum PDFs and complex data analysis on school metrics that TypeScript couldn't handle.
- **Task Queues:** Integrate Redis/RabbitMQ for long-running generation tasks.

### B. Kubernetes (K8s) Orchestration
- **Containerization:** Create Dockerfiles for the Next.js frontend and Python backend.
- **Scaling:** Implement Horizontal Pod Autoscalers (HPA) to manage the massive traffic spikes at 08:00 EAT (school start time).
- **Isolation:** Use K8s Namespaces or Pod groups to isolate student "Learning Lab" workloads to ensure data privacy and performance stability across different schools.
- **Secrets:** Move Firebase service accounts and API keys from `.env` to K8s Secrets or Vault.

## 4. Operational Constraints
- **Grounding:** The AI *must* remain grounded in the local curriculum data found in `src/curriculum/*.ts`.
- **Persona:** Maintain the "Mwalimu" Socratic persona (guide, don't just answer).
- **Branding:** Footers carry the SyncSenta credit with a dynamic year; never pin a literal year, it reads as abandonment by the next school that looks at us.

## 5. Troubleshooting & Deployment
### Git Authentication Issues
If you encounter `fatal: Authentication failed` or `remote: Invalid username or token`, remember that GitHub **no longer supports password authentication** for Git operations. 
- **Solution:** Generate a [Personal Access Token (PAT)](https://github.com/settings/tokens) with `repo` scopes and use it as your password when pushing to the repository.
- **Alternative:** Configure SSH keys for your development environment to bypass HTTPS token prompts entirely.

**Where the tutor actually lives:** `src/components/student/mwalimu-chat.tsx` streams from `src/app/api/chat/route.ts` (via `src/lib/chat/tutor-stream.ts`), which is the only LLM-backed route deployed on Vercel. The older `src/app/student/chat/chat-interface.tsx` and its `mwalimu-ai-flow`/`interactive-quiz-modal` chain were deleted on 2026-09-27: that surface called `/api/v1/mvp/*`, a Rust service deployed nowhere, so every learner who reached it through a subject link saw a permanent "Connecting". Keep `/student/chat` and `/student/chat/<subject>` pointed at the one remaining view (`src/components/student/student-chat-view.tsx`).