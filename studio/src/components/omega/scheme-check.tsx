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
 * Nothing here calls an API. The three fetches are same-origin static files: the design pack, the policy
 * pack and the draft. No model call and no key sits in this path — the deciding happens in
 * `src/lib/scheme/reconcile.ts`, which is pure and bundles for the browser, and `check-view.ts` exists so
 * this file is allowed to be boring: a verdict computed in JSX is a verdict no pack can be cited for.
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

import { useEffect, useState } from 'react';
import type { SchemeRow } from '@/types/curriculum';
import { buildCheckView } from '@/lib/scheme/check-view';
import type { CheckView } from '@/lib/scheme/check-view';

const DRAFT_URL = '/omega/drafts/kibera_g8_week14.json';

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

export function SchemeCheckBody({ view }: { view: CheckView }) {
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

export default function SchemeCheck() {
  const [view, setView] = useState<CheckView | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setView(
          buildCheckView({
            grade: draft.grade,
            rows: draft.rows,
            design: { file: PACKS[0].file, text: designText },
            policy: { file: PACKS[1].file, text: policyText },
            origin: draft.origin,
          }),
        );
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error !== null) {
    return (
      <p role="alert" className="border border-destructive/40 p-4 text-sm">
        The check could not run: {error}. The packs are served from this origin, so a failure here is a
        missing file, not a missing model key.
      </p>
    );
  }

  if (view === null) return <p className="text-sm text-muted-foreground">Reading the packs…</p>;

  return <SchemeCheckBody view={view} />;
}
