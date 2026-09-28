/**
 * Teacher module
 * Public interface — import from '@/lib/teacher' not from individual files.
 *
 * The scheme clients (`scheme-loader`, `scheme-v2-client`,
 * `scheme-context-client`) were removed on 2026-09-27. They were the studio's
 * only callers of `/api/v1/schemes/*` and read `NEXT_PUBLIC_API_URL` directly,
 * i.e. `http://localhost:8080` in production — the undeployed Rust MVP backend.
 * Nothing in `app/` or `components/` imported them; the live scheme flow is
 * `components/scheme-wizard` → `/api/generate/scheme` → the Python Lesson
 * Architect. See `app/api/schemes/active/route.ts` for what scheme persistence
 * needs before it can come back.
 */

export * from './teacher-dashboard';
export * from './realtime-feedback';
export * from './teacher-reflection-evidence';
