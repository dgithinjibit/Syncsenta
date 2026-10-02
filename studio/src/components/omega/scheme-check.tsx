/**
 * Omega · scheme check — the whole surface, so it can be mounted twice.
 *
 * It is reached from two addresses on purpose:
 *
 * - `/omega/check` needs no account. A BASIX judge clicks one link, and nothing on the page asks a server
 *   for a decision. That is the submission's claim, so the demo cannot sit behind a sign-in that happens to
 *   need a network.
 * - `/teacher/omega` is where it belongs in the product: inside the teacher workspace, next to the scheme
 *   wizard, for a teacher who is signed in.
 *
 * One component, one `buildCheckView`, one reconciler behind it. The two page files under `src/app` do
 * nothing but mount this, so neither address can drift from the other.
 *
 * Nothing in read-only mode calls an API. The three fetches are same-origin static files: the design pack,
 * the policy pack and the draft. No model call and no key sits in that path — the deciding happens in
 * `src/lib/scheme/reconcile.ts`, which is pure and bundles for the browser, and `check-view.ts` exists so
 * this file is allowed to be boring: a verdict computed in JSX is a verdict no pack can be cited for.
 * Teacher mode (spoon 12) adds the two same-origin engine calls (`teacher-session.ts`) and, only after the
 * handoff gate opens, one POST to `/api/generate/lesson-plan` — which is the whole point of the gate existing.
 *
 * `SchemeCheckBody` is split out from `SchemeCheck` so the markup is testable. This project has no jsdom and
 * no testing-library, and the laptop has about 650 MB free, which is not enough to boot `next dev` and look
 * at a page; `renderToStaticMarkup` in `src/lib/__tests__/scheme-check-render.test.ts` renders the body in
 * Node against the real packs. The fetching half needs a browser and is not covered by that suite.
 *
 * The draft is sample data written for this repository — a Grade 8 AI teacher's week-14 scheme, deliberately
 * imperfect: two of its four rows carry gaps, and the page exists to say what the rules make of them rather
 * than to hide them.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { SchemeRow } from '@/types/curriculum';
import { buildCheckView } from '@/lib/scheme/check-view';
import type { CheckView } from '@/lib/scheme/check-view';
import {
  acceptProposalForCard,
  parseSession,
  serializeSession,
  sessionHandoff,
  sessionView,
  startSession,
  waiveObligationOnCard,
  type TeacherSessionInput,
  type TeacherSessionState,
} from '@/lib/scheme/teacher-session';

const DRAFT_URL = '/omega/drafts/kibera_g8_week14.json';

/** The demo account's identity for this browser, matching `docs/basix-sample-audit/ledger.json`'s actor. */
const TEACHER_ACTOR = 'teacher:kibera_mama_joy';

/** Where a signed-in teacher's in-browser session survives a reload. Nothing leaves this origin. */
const SESSION_STORAGE_KEY = 'syncsen…n.v1';

/**
 * Where each pack is served from, and the path inside the repository it came from. The second half matters:
 * `file` is what a citation prints, so a `scheme_check.metta:41` on screen is a line a reviewer can open on
 * GitHub rather than a string invented for the browser.
 */
const PACKS: readonly { url: string; file: string }[] = [
  { url: '/omega/ai_g8_design.metta', file: 'studio/public/omega/ai_g8_design.metta' },
  { url: '/omega/scheme_check.metta', file: 'studio/public/omega/scheme_check.metta' },
];

type DraftFile = {
  grade: string;
  rows: SchemeRow[];
  origin?: Record<string, string>;
};

/**
 * What a returned lesson plan looks like on this page. Mapped from the generator's JSON at the call site,
 * with every field defaulted here rather than interpolated `undefined` there — the render suite forbids the
 * words `undefined` and `NaN` anywhere in this markup.
 */
export type LessonPlanView = {
  title: string;
  grade: string;
  subject: string;
  duration: string;
  objectives: string[];
  sections: { name: string; duration: string; activities: string[] }[];
  assessment: string[];
  resources: string[];
  /** Which producer made this text — the AI service or the route's prescribed fallback. Printed, never hidden. */
  source: string;
};

/**
 * The teacher-mode actions, passed only by the signed-in mount. The body stays a pure function of
 * (view, actions): with `actions` undefined it renders exactly what a judge sees at `/omega/check`, and the
 * render suite enforces that byte for byte by asserting the plain body contains no `<button` at all.
 */
export type BodyActions = {
  onAccept: (key: string) => void;
  onWaive: (key: string) => void;
  onGenerate: (rowIndex: number) => void;
  onDownload: () => void;
  onReset: () => void;
  handoffAllowed: boolean;
  plan: LessonPlanView | null;
  busy: string | null;
  error: string | null;
  recordCount: number;
};

export function SchemeCheckBody({ view, actions }: { view: CheckView; actions?: BodyActions }) {
  return (
    <div className="space-y-8">
      <section className="space-y-1">
        <h2 className="text-xl font-semibold">{view.title}</h2>
        <p className="text-sm text-muted-foreground">
          {view.originLine === '' ? null : `${view.originLine} · `}design {view.designVersion}
        </p>
      </section>

      <section
        className="border p-5"
        data-certified={view.verdict.certified ? 'true' : 'false'}
        data-handoff={view.verdict.handoff}
      >
        <p className="text-lg font-semibold">
          {view.verdict.certified ? 'Certified' : 'Not certified'} · {view.verdict.threshold}
        </p>
        <p className="mt-2 text-sm">{view.verdict.detail}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {view.verdict.counts.clean} clean · {view.verdict.counts.blocking} blocking ·{' '}
          {view.verdict.counts.advisory} advisory · {view.rows.length} rows
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="font-medium">Your rows, as you wrote them</h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left">
              <th className="border-b py-2 pr-3 font-medium">Week</th>
              <th className="border-b py-2 pr-3 font-medium">Lesson</th>
              <th className="border-b py-2 pr-3 font-medium">Sub-strand</th>
              <th className="border-b py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((row) => (
              <tr key={`${row.week}-${row.lesson}`}>
                <td className="border-b py-2 pr-3 align-top">{row.week}</td>
                <td className="border-b py-2 pr-3 align-top">{row.lesson}</td>
                <td className="border-b py-2 pr-3 align-top">{row.subStrand}</td>
                <td className="border-b py-2 align-top">
                  <span className="text-xs uppercase tracking-wide" data-status={row.status}>
                    {row.status}
                  </span>
                  {row.gaps.length > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">{row.gaps.join(', ')}</span>
                  )}
                  {actions !== undefined && actions.handoffAllowed && (
                    <button
                      type="button"
                      className="ml-3 border px-2 py-0.5 text-xs"
                      data-action="generate"
                      data-row={row.index}
                      disabled={actions.busy !== null}
                      onClick={() => actions.onGenerate(row.index)}
                    >
                      Generate lesson plan
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-4">
        <h3 className="font-medium">What Omega found</h3>
        {view.cards.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No gap the packs name. Every row matches the design and fills what the policy requires.
          </p>
        )}
        {view.cards.map((card) => (
          <article key={card.key} className="border p-5" data-severity={card.severity}>
            <p className="font-medium">{card.heading}</p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {card.severity} · {card.gap}
            </p>
            <p className="mt-3 text-sm">{card.reason}</p>
            {card.proposal !== undefined && (
              <dl className="mt-3 space-y-1 border-l-2 pl-3 text-sm">
                {Object.entries(card.proposal.values).map(([field, value]) => (
                  <div key={field} className="flex gap-2">
                    <dt className="text-muted-foreground">{field}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {card.consentNote !== undefined && (
              <p className="mt-2 text-xs italic text-muted-foreground">{card.consentNote}</p>
            )}
            {card.refusal !== undefined && (
              <p className="mt-2 text-sm text-muted-foreground">Not proposed — {card.refusal}</p>
            )}
            {actions !== undefined && card.proposal !== undefined && (
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  className="border px-3 py-1 text-sm"
                  data-action="accept"
                  data-card={card.key}
                  disabled={actions.busy !== null}
                  {...(actions.busy === card.key ? { 'data-busy': card.key } : {})}
                  onClick={() => actions.onAccept(card.key)}
                >
                  Accept proposal
                </button>
              </div>
            )}
            {actions !== undefined && card.proposal === undefined && card.severity === 'blocking' && (
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  className="border px-3 py-1 text-sm"
                  data-action="waive"
                  data-card={card.key}
                  disabled={actions.busy !== null}
                  {...(actions.busy === card.key ? { 'data-busy': card.key } : {})}
                  onClick={() => actions.onWaive(card.key)}
                >
                  Waive this column
                </button>
                <span className="self-center text-xs text-muted-foreground">
                  answers the rule at its source and is recorded as an override
                </span>
              </div>
            )}
            <details className="mt-3">
              <summary className="cursor-pointer text-sm">Why the rules say this</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap bg-muted/40 p-3 text-xs">
                {card.why}
              </pre>
              <p className="mt-2 text-xs text-muted-foreground">Cited: {card.citations.join(' · ')}</p>
            </details>
          </article>
        ))}
      </section>

      {actions === undefined ? null : (
        <section className="space-y-3" data-record-count={actions.recordCount}>
          <h3 className="font-medium">Your decisions in this browser</h3>
          <p className="text-sm text-muted-foreground">
            {actions.recordCount === 0
              ? 'No decisions recorded yet in this tab. Accepting a proposal or waiving a column writes here — ' +
                'a hash-chained record that stays on this origin, downloadable as JSON, and resettable.'
              : `${actions.recordCount} record${actions.recordCount === 1 ? '' : 's'} in this session's ledger — ` +
                'each one the moment you clicked, charged to you, citing the pack line that allowed it.'}
          </p>
          {actions.error !== null && (
            <p role="alert" className="border border-destructive/40 p-3 text-sm">
              {actions.error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              className="border px-3 py-1 text-sm"
              data-action="download"
              onClick={actions.onDownload}
            >
              Download this session&#39;s record
            </button>
            <button
              type="button"
              className="border px-3 py-1 text-sm"
              data-action="reset"
              onClick={actions.onReset}
            >
              Reset to the draft as it synced
            </button>
          </div>
        </section>
      )}

      {actions !== undefined && (
        <section className="space-y-2" data-handoff-gate={actions.handoffAllowed ? 'open' : 'closed'}>
          <h3 className="font-medium">The lesson-plan handoff</h3>
          <p className="text-sm">
            {actions.handoffAllowed
              ? 'The scheme certifies and every record in this session\'s ledger recomputes, so the gate in ' +
                'handoff.ts is open: the generator may read this scheme. Pick a row above.'
              : 'Closed. The gate reads two things — the certification the packs reach, and the chain of your ' +
                'records — and it opens only when both agree. Nothing downstream can skip past it.'}
          </p>
        </section>
      )}

      {actions?.plan != null && (
        <section className="space-y-3 border p-5" data-plan-source={actions.plan.source}>
          <h3 className="font-medium">{actions.plan.title}</h3>
          <p className="text-sm text-muted-foreground">
            {actions.plan.grade === '' ? '' : `Grade ${actions.plan.grade} · `}
            {actions.plan.subject} · {actions.plan.duration}
          </p>
          <div className="text-xs text-muted-foreground">
            Plan text produced by: {actions.plan.source}
          </div>
          <div>
            <p className="text-sm font-medium">Objectives</p>
            <ul className="list-disc pl-5 text-sm">
              {actions.plan.objectives.map((objective) => (
                <li key={objective}>{objective}</li>
              ))}
            </ul>
          </div>
          {actions.plan.sections.map((section) => (
            <div key={section.name}>
              <p className="text-sm font-medium">
                {section.name} · {section.duration}
              </p>
              <ul className="list-disc pl-5 text-sm">
                {section.activities.map((activity) => (
                  <li key={activity}>{activity}</li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="text-sm font-medium">Assessment</p>
            <ul className="list-disc pl-5 text-sm">
              {actions.plan.assessment.map((method) => (
                <li key={method}>{method}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium">Resources</p>
            <p className="text-sm">{actions.plan.resources.join(' · ')}</p>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="font-medium">The whole derivation</h3>
        <p className="text-sm text-muted-foreground">
          The transcript below is what the agent produced, step by step — the same lines a terminal run
          prints, because there is one engine and this page only arranges its output.
        </p>
        <pre className="overflow-x-auto whitespace-pre-wrap border p-4 text-xs">{view.transcript}</pre>
      </section>
    </div>
  );
}

export default function SchemeCheck({ mode = 'readonly' }: { mode?: 'readonly' | 'teacher' }) {
  const [view, setView] = useState<CheckView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputs, setInputs] = useState<TeacherSessionInput | null>(null);
  const [session, setSession] = useState<TeacherSessionState | null>(null);
  const [handoffAllowed, setHandoffAllowed] = useState(false);
  const [plan, setPlan] = useState<LessonPlanView | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const rowsRef = useRef<{ origin?: Record<string, string> }>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [draftResponse, designText, policyText] = await Promise.all([
          fetch(DRAFT_URL),
          fetch(PACKS[0].url).then((response) => response.text()),
          fetch(PACKS[1].url).then((response) => response.text()),
        ]);
        if (!draftResponse.ok) throw new Error(`draft: HTTP ${draftResponse.status}`);
        const draft = (await draftResponse.json()) as DraftFile;
        if (cancelled) return;
        rowsRef.current = { origin: draft.origin };
        if (mode === 'teacher') {
          const base: TeacherSessionInput = {
            grade: draft.grade,
            rows: draft.rows,
            design: { file: PACKS[0].file, text: designText },
            policy: { file: PACKS[1].file, text: policyText },
            actor: TEACHER_ACTOR,
          };
          setInputs(base);
          let restored: TeacherSessionState | null = null;
          try {
            const saved = window.localStorage.getItem(SESSION_STORAGE_KEY);
            if (saved !== null) restored = parseSession(saved, base);
          } catch {
            restored = null; // a stale or foreign record: the draft's own session starts clean.
          }
          setSession(restored ?? startSession(base));
        } else {
          setView(
            buildCheckView({
              grade: draft.grade,
              rows: draft.rows,
              design: { file: PACKS[0].file, text: designText },
              policy: { file: PACKS[1].file, text: policyText },
              origin: draft.origin,
            }),
          );
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  // Teacher mode: the view is always the session's, re-derived through the same engine — never edited in place.
  useEffect(() => {
    if (inputs === null || session === null) return;
    setView(sessionView(session, inputs));
    void sessionHandoff(session, inputs).then((decision) => setHandoffAllowed(decision.allowed));
  }, [inputs, session]);

  async function runTransition(
    key: string,
    transition: (state: TeacherSessionState, input: TeacherSessionInput, stamp: string) => Promise<TeacherSessionState>,
  ) {
    if (inputs === null || session === null || busy !== null) return;
    setBusy(key);
    setActionError(null);
    try {
      const next = await transition(session, inputs, new Date().toISOString());
      setSession(next);
      window.localStorage.setItem(SESSION_STORAGE_KEY, serializeSession(next));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  }

  const accept = (key: string) =>
    void runTransition(key, (state, input, stamp) => acceptProposalForCard(state, input, key, stamp));
  const waive = (key: string) =>
    void runTransition(key, (state, input, stamp) => waiveObligationOnCard(state, input, key, stamp));

  async function generate(rowIndex: number) {
    if (session === null || busy !== null) return;
    const row = session.rows[rowIndex];
    if (row === undefined) return;
    setBusy(`generate:${rowIndex}`);
    setActionError(null);
    try {
      const response = await fetch('/api/generate/lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: '8',
          subject: 'Artificial Intelligence',
          term: rowsRef.current.origin?.term ?? '',
          week: row.week,
          lesson: row.lesson,
          row: { ...row },
        }),
      });
      const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) {
        const refusal = (payload?.refusal ?? payload?.detail) as string | undefined;
        throw new Error(refusal ?? `the generator replied ${response.status}`);
      }
      const lp = (payload?.lesson_plan ?? {}) as Record<string, any>;
      const phase = (name: string, fallbackLabel: string) => ({
        name,
        duration: String(lp[fallbackLabel]?.duration ?? ''),
        activities: (Array.isArray(lp[fallbackLabel]?.activities) ? lp[fallbackLabel].activities : []).map(String),
      });
      setPlan({
        title: String(lp.title ?? 'Lesson plan'),
        grade: String(lp.grade ?? ''),
        subject: String(lp.subject ?? ''),
        duration: String(lp.duration ?? ''),
        objectives: (Array.isArray(lp.objectives) ? lp.objectives : []).map(String),
        sections: [phase('Introduction', 'introduction'), phase('Development', 'development'), phase('Conclusion', 'conclusion')],
        assessment: (Array.isArray(lp.assessment) ? lp.assessment : []).map(String),
        resources: (Array.isArray(lp.resources) ? lp.resources : []).map(String),
        source: String(payload?.source ?? 'unknown'),
      });
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  }

  function downloadRecord() {
    if (session === null) return;
    const blob = new Blob([JSON.stringify(session.ledger, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'kibera_g8_week14_session_ledger.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function resetSession() {
    if (inputs === null) return;
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    setPlan(null);
    setActionError(null);
    setSession(startSession(inputs));
  }

  if (error !== null) {
    return (
      <p role="alert" className="border border-destructive/40 p-4 text-sm">
        The check could not run: {error}. The packs are served from this origin, so a failure here is a
        missing file, not a missing model key.
      </p>
    );
  }

  if (view === null) return <p className="text-sm text-muted-foreground">Reading the packs…</p>;

  if (mode === 'readonly' || session === null) return <SchemeCheckBody view={view} />;

  return (
    <SchemeCheckBody
      view={view}
      actions={{
        onAccept: accept,
        onWaive: waive,
        onGenerate: (rowIndex) => void generate(rowIndex),
        onDownload: downloadRecord,
        onReset: resetSession,
        handoffAllowed,
        plan,
        busy,
        error: actionError,
        recordCount: session.ledger.entries.length,
      }}
    />
  );
}
