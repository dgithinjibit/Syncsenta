# Studio

`studio/` is the deployed Next.js 14 web application. Its API routes run as
part of the Studio deployment; the separate Python service is in `ai-agents/`.

## Local development

Use Node.js `>=22.18` and npm:

```bash
npm ci
npm run dev
```

The development server uses port `5173`. Copy the required public and server
environment variables from the deployment configuration into a local
`.env.local`; never commit credentials.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

See [`../docs/DEVELOPMENT.md`](../docs/DEVELOPMENT.md) for environment setup,
and [`../docs/DEBUGGING_PLAYBOOK.md`](../docs/DEBUGGING_PLAYBOOK.md) for
request-flow triage. Student chat streams through `/api/chat`; teacher
generation routes call the configured AI Agents service.
