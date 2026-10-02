import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SchemeRow } from '@/types/curriculum';

/**
 * Spoon 12 — the teacher's own hands on the page: accept, waive, re-check, hand off.
 *
 * Everything the browser button needs already exists as a pure module — `consent.ts` (5c-2), `override.ts`
 * (5c-3), `ledger.ts` (5c-1), `handoff.ts` (5c-4a) — and the terminal CLI (`reconcile.mts`) already calls them
 * in one run. What never existed is the call site a signed-in teacher can click, which is the sentence the
 * README had to hedge: "the accept path has been walked in the terminal, not in the browser." This suite is
 * the browser half, executable in Node exactly the way `scheme-check-render.test.ts` renders the page in Node:
 * the session orchestration is pure (caller supplies the clock, WebCrypto hashes, no network), and the
 * component only arranges its results.
 *
 * The expected numbers are not invented here. They are the same ones `docs/basix-sample-audit/ledger.json`
 * records from the terminal run: one accept on row 3 writes three cells (subStrand, strand,
 * keyInquiryQuestion), one waiver on row 2 writes one `pack` entry against scheme_check.metta:38, and the
 * read-back is 3 clean · 0 blocking · 1 advisory with the handoff allowed. If the browser engine and the
 * recorded audit ever disagree, this test is where the disagreement surfaces — which is the point.
 */

const STUDIO = process.cwd();
const design = {
  file: 'studio/public/omega/ai_g8_design.metta',
  text: readFileSync(join(STUDIO, 'public', 'omega', 'ai_g8_design.metta'), 'utf8'),
};
const policy = {
  file: 'studio/public/omega/scheme_check.metta',
  text: readFileSync(join(STUDIO, 'public', 'omega', 'scheme_check.metta'), 'utf8'),
};
const draftFile = JSON.parse(
  readFileSync(join(STUDIO, 'public', 'omega', 'drafts', 'kibera_g8_week14.json'), 'utf8'),
) as { grade: string; rows: SchemeRow[]; origin: Record<string, string> };

const {
  startSession,
  sessionView,
  acceptProposalForCard,
  waiveObligationOnCard,
  sessionHandoff,
  serializeSession,
  parseSession,
  UnknownCardError,
} = await import('@/lib/scheme/teacher-session');
const { NothingProposedError } = await import('@/lib/scheme/consent');
const { SchemeCheckBody } = await import('@/components/omega/scheme-check');

const ACTOR = 'teacher:kibera_mama_joy';
const AT = '2026-10-02T10:00:00.000Z';

function input() {
  return {
    grade: draftFile.grade,
    rows: draftFile.rows,
    design,
    policy,
    actor: ACTOR,
  };
}

describe('a teacher session starts where the page starts', () => {
  it('opens on her draft untouched: 2 blocking, no records, no handoff', () => {
    const state = startSession(input());
    const view = sessionView(state, input());
    expect(view.verdict.certified).toBe(false);
    expect(view.verdict.counts).toEqual({ clean: 2, blocking: 2, advisory: 0 });
    expect(state.ledger.entries.length).toBe(0);
    expect(view.cards.map((card) => card.key)).toEqual(['2:assessmentMethods', '3:subStrand']);
  });
});

describe('accepting a proposal in the browser writes what the terminal writes', () => {
  it('row 3 accept changes three cells and records exactly three entries, citing the design pack', async () => {
    const state = await acceptProposalForCard(startSession(input()), input(), '3:subStrand', AT);
    expect(state.ledger.entries.length).toBe(3);
    const byField = Object.fromEntries(state.ledger.entries.map((e) => [e.field, e]));
    expect(byField.subStrand.after).toBe('3.3 Introduction to Neural Networks');
    expect(byField.strand.after).toBe('3.0 AI Techniques and Programming');
    expect(byField.keyInquiryQuestion.after).toBe('How is a neural network different from a set of rules?');
    for (const entry of state.ledger.entries) {
      expect(entry.basis).toBe('proposal-accepted');
      expect(entry.actor).toBe(ACTOR);
      expect(entry.timestamp).toBe(AT);
      expect(entry.citations[0]).toBe('studio/public/omega/ai_g8_design.metta:58');
    }
  });

  it('leaves one blocking finding, on the row whose proposal was about nothing', async () => {
    const state = await acceptProposalForCard(startSession(input()), input(), '3:subStrand', AT);
    const view = sessionView(state, input());
    expect(view.verdict.counts).toEqual({ clean: 3, blocking: 1, advisory: 0 });
    expect(view.cards.map((card) => card.key)).toEqual(['2:assessmentMethods']);
  });

  it('refuses to "accept" the empty assessment column, because nothing was proposed', async () => {
    await expect(acceptProposalForCard(startSession(input()), input(), '2:assessmentMethods', AT))
      .rejects.toBeInstanceOf(NothingProposedError);
  });
});

describe('waiving a column is the override, not a settings toggle', () => {
  it('rewrites scheme_check.metta:38 to waived and records one pack entry', async () => {
    const state = await waiveObligationOnCard(startSession(input()), input(), '2:assessmentMethods', AT);
    expect(state.policyText).toContain('(= (scheme-field-obligation g8 assessmentMethods) waived)');
    expect(state.ledger.entries.length).toBe(1);
    const entry = state.ledger.entries[0];
    expect(entry.row).toBe('pack');
    expect(entry.before).toBe('mandatory');
    expect(entry.after).toBe('waived');
    expect(entry.basis).toBe('override-granted');
    expect(entry.citations).toEqual(['studio/public/omega/scheme_check.metta:38']);
  });

  it('waiving alone does not certify: row 3 is still blocking on its own', async () => {
    const state = await waiveObligationOnCard(startSession(input()), input(), '2:assessmentMethods', AT);
    const view = sessionView(state, input());
    expect(view.verdict.certified).toBe(false);
    expect(view.verdict.counts).toEqual({ clean: 2, blocking: 1, advisory: 1 });
  });
});

describe('accept then waive reaches exactly the recorded sample-audit state', () => {
  async function walked() {
    const accepted = await acceptProposalForCard(startSession(input()), input(), '3:subStrand', AT);
    return waiveObligationOnCard(accepted, input(), '2:assessmentMethods', AT);
  }

  it('certifies with 3 clean · 0 blocking · 1 advisory, and the waived row shows as advisory', async () => {
    const state = await walked();
    const view = sessionView(state, input());
    expect(view.verdict.certified).toBe(true);
    expect(view.verdict.counts).toEqual({ clean: 3, blocking: 0, advisory: 1 });
    const waivedCard = view.cards.find((card) => card.gap === 'field-obligation-waived-by-teacher');
    expect(waivedCard).toBeDefined();
    expect(waivedCard?.severity).toBe('advisory');
  });

  it('the handoff opens only once both gates agree: certified and every record recomputes', async () => {
    const state = await walked();
    const decision = await sessionHandoff(state, input());
    expect(decision.allowed).toBe(true);
    expect(decision.gate).toBe('ok');
    expect(decision.reason).toContain('4 records recomputes');
  });

  it('the transcript the page prints after walking is the engine\'s, and says no network was used', async () => {
    const state = await walked();
    const view = sessionView(state, input());
    expect(view.transcript).toContain('no network, no model, rules only');
    expect(view.transcript).toContain('3 clean · 0 blocking · 1 advisory · 4 rows');
  });
});

describe('the gate is a gate', () => {
  it('refuses the handoff while a blocking finding survives, naming certification', async () => {
    const decision = await sessionHandoff(startSession(input()), input());
    expect(decision.allowed).toBe(false);
    expect(decision.gate).toBe('certification');
  });

  it('refuses a certified session whose ledger was edited afterwards, naming the broken entry', async () => {
    const accepted = await acceptProposalForCard(startSession(input()), input(), '3:subStrand', AT);
    const state = await waiveObligationOnCard(accepted, input(), '2:assessmentMethods', AT);
    const tampered = {
      ...state,
      ledger: {
        ...state.ledger,
        entries: state.ledger.entries.map((entry) =>
          entry.index === 2 ? { ...entry, after: 'something else entirely' } : entry,
        ),
      },
    };
    const decision = await sessionHandoff(tampered, input());
    expect(decision.allowed).toBe(false);
    expect(decision.gate).toBe('chain');
    expect(decision.invalid).toEqual([{ index: 2, reason: 'hash' }]);
  });

  it('refuses an unknown card key instead of inventing a finding to answer', async () => {
    await expect(acceptProposalForCard(startSession(input()), input(), '9:nope', AT))
      .rejects.toBeInstanceOf(UnknownCardError);
    await expect(waiveObligationOnCard(startSession(input()), input(), '1:week', AT))
      .rejects.toBeInstanceOf(UnknownCardError);
  });
});

describe('the session survives a reload exactly as it stood', () => {
  it('serialize → parse keeps rows, policy text, and every hash identical', async () => {
    const accepted = await acceptProposalForCard(startSession(input()), input(), '3:subStrand', AT);
    const state = await waiveObligationOnCard(accepted, input(), '2:assessmentMethods', AT);
    const restored = parseSession(serializeSession(state), input());
    expect(restored.rows).toEqual(state.rows);
    expect(restored.policyText).toBe(state.policyText);
    expect(restored.ledger).toEqual(state.ledger);
    expect(sessionView(restored, input()).transcript).toBe(sessionView(state, input()).transcript);
  });

  it('refuses to restore a session recorded against a different draft or pack', () => {
    const fresh = serializeSession(startSession(input()));
    const shifted = JSON.parse(fresh);
    shifted.ledger.subject.draftFile = 'studio/public/omega/drafts/some_other_scheme.json';
    expect(() => parseSession(JSON.stringify(shifted), input())).toThrow(/not this draft/);
  });
});

describe('the buttons only exist where a signed-in teacher stands', () => {
  function bodyWithActions(overrides: Record<string, unknown> = {}) {
    const view = sessionView(startSession(input()), input());
    const actions = {
      onAccept: () => {},
      onWaive: () => {},
      onGenerate: () => {},
      onDownload: () => {},
      onReset: () => {},
      handoffAllowed: false,
      plan: null,
      busy: null,
      error: null,
      recordCount: 0,
      ...overrides,
    };
    return { html: renderToStaticMarkup(SchemeCheckBody({ view, actions })), actions };
  }

  it('renders no button at all without actions — /omega/check is unchanged for the judge', () => {
    const view = sessionView(startSession(input()), input());
    const plain = renderToStaticMarkup(SchemeCheckBody({ view }));
    expect(plain).not.toContain('<button');
  });

  it('puts Accept on the proposal card and Waive on the refusal card, and nowhere else', () => {
    const { html } = bodyWithActions();
    expect(html).toContain('data-action="accept" data-card="3:subStrand"');
    expect(html).toContain('data-action="waive" data-card="2:assessmentMethods"');
    expect(html).not.toContain('data-action="generate"');
    expect(html).toContain('data-action="download"');
    expect(html).toContain('data-action="reset"');
  });

  it('offers lesson-plan generation only when the handoff is allowed, and prints the plan it returned', () => {
    const { html } = bodyWithActions({
      handoffAllowed: true,
      plan: {
        title: 'Lesson Plan: 3.3 Introduction to Neural Networks',
        grade: '8',
        subject: 'Artificial Intelligence',
        duration: '40 minutes',
        objectives: ['By the end of the lesson, the learner should be able to explain and apply 3.3.'],
        sections: [
          { name: 'Introduction', duration: '5 minutes', activities: ['Activate prior knowledge.'] },
          { name: 'Development', duration: '25 minutes', activities: ['Model the sub-strand.'] },
        ],
        assessment: ['Observation, oral questions, and an exit task.'],
        resources: ['Learner book', 'teacher guide'],
        source: 'frontend-prescribed-fallback',
      },
    });
    expect(html).toContain('data-action="generate"');
    expect(html).toContain('Lesson Plan: 3.3 Introduction to Neural Networks');
    expect(html).toContain('Development');
    // The provenance of the plan text is stated, never hidden: fallback-vs-AI is exactly the kind of claim
    // this repository has learned to print rather than imply.
    expect(html).toContain('frontend-prescribed-fallback');
  });

  it('shows the running state and any refusal in the same markup pass', () => {
    const { html } = bodyWithActions({ busy: '3:subStrand', error: 'Nothing was proposed for that card.' });
    expect(html).toContain('data-busy="3:subStrand"');
    expect(html).toContain('Nothing was proposed for that card.');
  });
});
