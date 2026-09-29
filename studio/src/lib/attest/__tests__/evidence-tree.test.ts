/**
 * Stage 3, Phase 0 — the canonical evidence tree.
 *
 * The design is `docs/research/ASI-DAPP-PATH.md` §"What is acceptable for the recommended slice": one
 * Ed25519-signed Merkle root per class-term, published so the platform cannot silently rewrite a cohort's
 * history. The root is only worth publishing if a third party can recompute it from a sanctioned export
 * without trusting any code of ours that has not been read carefully — which means the serialization is a
 * *contract*, not an implementation detail. So every rule below is asserted here rather than documented
 * and hoped for:
 *
 *   - the field set is fixed by `syncsenta-evidence-v1`, and a record carrying extra columns (the whole
 *     row, `created_at`, `reviewed_by`, a teacher's `reviewed_at`) hashes identically to the trimmed one.
 *     A review must not be able to change a learner's root; that is the point of leaving those out.
 *   - ordering is by `id` in canonical lowercase form, never by arrival order, so two exports of the same
 *     class-term agree.
 *   - a missing nullable column and an explicit `null` are the same thing, because `SELECT` shape varies
 *     between the SQL editor, PostgREST and a CSV export.
 *   - nested `rubric` keys are sorted, so JSONB's unordered storage cannot make the same evidence produce
 *     two leaves.
 *   - `null` for the whole set is refused rather than hashed. An anchor over zero evidence would read as
 *     a class-term that happened, and a root everyone can predict is not a commitment to anything.
 *
 * The recorded roots in `__fixtures__/` are pinned from an implementation run, then re-read here; what
 * makes them load-bearing is that four independent properties above are asserted separately, so a
 * serialization change fails something other than the golden value.
 */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  EVIDENCE_CANONICALIZATION_VERSION,
  DuplicateEvidenceIdError,
  EmptyEvidenceSetError,
  EvidenceIdNotFoundError,
  MalformedEvidenceIdError,
  buildInclusionProof,
  canonicalEvidenceRecord,
  computeEvidenceRoot,
  evidenceLeafHash,
  verifyInclusionProof,
  type EvidenceRecord,
  type InclusionProof,
} from '../evidence-tree';

const FIXTURE_DIR = join(__dirname, '..', '__fixtures__');

function record(overrides: Partial<EvidenceRecord> = {}): EvidenceRecord {
  return {
    id: '3f1a2b3c-4d5e-4f60-8a90-1b2c3d4e5f60',
    student_profile_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    activity_id: 'MATH.6.2.1.measure-length',
    curriculum_design_version: 'cbd-2024-grade-6-math',
    grade: '6',
    subject: 'Mathematics',
    strand: 'Measurement',
    sub_strand: 'Length',
    learning_outcome: 'measures and compares lengths in standard units',
    competency: 'MATH.6.2.1',
    value: null,
    evidence_type: 'tutor-response',
    rubric: { score: 4, max_score: 5 },
    source: 'studio-tutor',
    captured_at: '2026-09-22T08:14:03Z',
    ...overrides,
  };
}

/**
 * The five-row term, read once at module scope: the golden-root tests and the inclusion-proof tests are
 * asserting two halves of the same commitment, so they have to be looking at one set of rows rather than
 * two copies that could drift.
 */
const fixture = JSON.parse(
  readFileSync(join(FIXTURE_DIR, 'evidence-class-term-2026-term-1.json'), 'utf8'),
) as { description: string; records: EvidenceRecord[]; root: string; leaf_hashes: string[] };

describe('the evidence set an anchor is allowed to commit to', () => {
  it('refuses to anchor a class-term with no evidence', () => {
    expect(() => computeEvidenceRoot([])).toThrow(EmptyEvidenceSetError);
  });

  it('refuses two rows with the same id, because the sort would be ambiguous', () => {
    expect(() => computeEvidenceRoot([record(), record()])).toThrow(DuplicateEvidenceIdError);
  });

  it('refuses an id that is not lowercase canonical uuid, because ordering would not port', () => {
    expect(() => computeEvidenceRoot([record({ id: '3F1A2B3C-4D5E-4F60-8A90-1B2C3D4E5F60' })]))
      .toThrow(MalformedEvidenceIdError);
    expect(() => computeEvidenceRoot([record({ id: 'not-a-uuid' })])).toThrow(MalformedEvidenceIdError);
  });

  it('has a version the root is bound to, so a re-serialization is not silently the same anchor', () => {
    expect(EVIDENCE_CANONICALIZATION_VERSION).toBe('syncsenta-evidence-v1');
  });
});

describe('the canonical serialization', () => {
  it('emits keys sorted, whitespace-free, and keeps nulls as fields', () => {
    const canonical = canonicalEvidenceRecord(record({ value: null, strand: null }));

    // "No insignificant whitespace" — the data itself may contain spaces, and a real one in a learning
    // outcome is not a formatting bug. Round-tripping through a compact stringify is the honest check.
    expect(JSON.stringify(JSON.parse(canonical))).toBe(canonical);
    expect(canonical).toContain('"value":null');
    expect(canonical).toContain('"strand":null');

    // The serialized order is what a mirror implementation has to reproduce, and `JSON.parse` hands back
    // keys in the order they appeared in the text — so this asserts the bytes, not the object.
    const topLevelKeys = Object.keys(JSON.parse(canonical) as Record<string, unknown>);
    expect(topLevelKeys).toEqual([...topLevelKeys].sort());
  });

  it('sorts integer-like keys by code point, where ECMAScript would iterate them numerically', () => {
    const scrambled = record({ rubric: { '2': 'b', '10': 'c', '1': 'a' } });
    const ordered = record({ rubric: { '1': 'a', '2': 'b', '10': 'c' } });

    expect(evidenceLeafHash(scrambled)).toBe(evidenceLeafHash(ordered));
    expect(canonicalEvidenceRecord(ordered)).toContain('"rubric":{"1":"a","10":"c","2":"b"}');
  });

  it('treats an absent nullable column as null, so export shape cannot change the leaf', () => {
    const withNull = record({ value: null });
    const without = { ...record() } as Record<string, unknown>;
    delete without.value;

    expect(evidenceLeafHash(withNull)).toBe(evidenceLeafHash(without as unknown as EvidenceRecord));
  });

  it('ignores every field the version does not name, including a teacher review', () => {
    const trimmed = record();
    const fullRow = {
      ...record(),
      created_at: '2026-09-22T08:14:05Z',
      reviewed_by: 'cccccccc-dddd-4eee-8fff-000000000000',
      reviewed_at: '2026-09-25T11:02:00Z',
      event_id: null,
    };

    expect(evidenceLeafHash(fullRow as unknown as EvidenceRecord)).toBe(evidenceLeafHash(trimmed));
  });

  it('sorts nested rubric keys, because jsonb has no order to preserve', () => {
    const a = record({ rubric: { score: 4, max_score: 5, band: 'meets' } });
    const b = record({ rubric: { band: 'meets', max_score: 5, score: 4 } });

    expect(evidenceLeafHash(a)).toBe(evidenceLeafHash(b));
  });

  it('renders captured_at in one UTC form, so a +00:00 offset and microseconds cannot fork the leaf', () => {
    const whole = record({ captured_at: '2026-09-22T08:14:03Z' });
    const fromSqlEditor = record({ captured_at: '2026-09-22T08:14:03.000000+00:00' });
    const fromCsv = record({ captured_at: '2026-09-22T11:14:03+03:00' });

    expect(evidenceLeafHash(fromSqlEditor)).toBe(evidenceLeafHash(whole));
    expect(evidenceLeafHash(fromCsv)).toBe(evidenceLeafHash(whole));
    expect(canonicalEvidenceRecord(whole)).toContain('"captured_at":"2026-09-22T08:14:03Z"');
  });

  it('refuses a captured_at that is not a moment, rather than hashing the string it was handed', () => {
    expect(() => evidenceLeafHash(record({ captured_at: '22/09/2026 08:14' })))
      .toThrow(TypeError);
  });

  it('changes the leaf when any committed field changes', () => {
    const committed = [
      'id', 'student_profile_id', 'activity_id', 'curriculum_design_version', 'grade', 'subject',
      'strand', 'sub_strand', 'learning_outcome', 'competency', 'value', 'evidence_type', 'rubric',
      'source', 'captured_at',
    ] as const;

    for (const field of committed) {
      const changed = field === 'rubric'
        ? { rubric: { score: 3, max_score: 5 } }
        : field === 'id'
          ? { id: '00000000-0000-4000-8000-000000000000' }
          : field === 'captured_at'
            ? { captured_at: '2026-09-22T08:15:03Z' }
            : { [field]: field === 'strand' || field === 'sub_strand' || field === 'value'
                ? 'something-else'
                : `${record()[field]}-changed` };
      expect(evidenceLeafHash(record(changed as Partial<EvidenceRecord>)), `${field} is committed`)
        .not.toBe(evidenceLeafHash(record()));
    }
  });
});

describe('the tree', () => {
  it('does not care what order the rows arrive in', () => {
    const rows = [
      record({ id: '11111111-1111-4111-8111-111111111111' }),
      record({ id: '99999999-9999-4999-8999-999999999999' }),
      record({ id: '55555555-5555-4555-8555-555555555555' }),
    ];

    expect(computeEvidenceRoot(rows).root)
      .toBe(computeEvidenceRoot([...rows].reverse()).root);
  });

  it('reports the leaf count it committed to, not just the hash', () => {
    const result = computeEvidenceRoot([
      record({ id: '11111111-1111-4111-8111-111111111111' }),
      record({ id: '55555555-5555-4555-8555-555555555555' }),
    ]);

    expect(result.leafCount).toBe(2);
    expect(result.version).toBe(EVIDENCE_CANONICALIZATION_VERSION);
  });

  it('folds two leaves exactly as the written rule says', () => {
    const a = evidenceLeafHash(record({ id: '11111111-1111-4111-8111-111111111111' }));
    const b = evidenceLeafHash(record({ id: '55555555-5555-4555-8555-555555555555' }));
    const nodeRoot = createHash('sha256').update(a + b).digest('hex');

    expect(computeEvidenceRoot([
      record({ id: '11111111-1111-4111-8111-111111111111' }),
      record({ id: '55555555-5555-4555-8555-555555555555' }),
    ]).root).toBe(
      createHash('sha256')
        .update(`syncsenta-evidence-root-v1|2|${nodeRoot}`)
        .digest('hex'),
    );
  });

  it('promotes an odd node rather than duplicating it, so a 4-row and 5-row term cannot share a root', () => {
    const rows = (count: number) =>
      Array.from({ length: count }, (_, i) =>
        record({ id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}` }));

    const four = computeEvidenceRoot(rows(4));
    const five = computeEvidenceRoot(rows(5));

    expect(four.root).not.toBe(five.root);
    // A duplicated-last fold would give 4 and 5 the same top pair; the count in the binding step is the
    // belt, and this asserts the two are not equal for the wrong reason too.
    expect(five.leafCount).toBe(5);
  });
});

describe('the golden class-term', () => {
  it('reproduces the recorded root', () => {
    expect(computeEvidenceRoot(fixture.records).root).toBe(fixture.root);
  });

  it('reproduces the recorded leaf hashes in id order', () => {
    const sorted = [...fixture.records].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
    expect(sorted.map((r) => evidenceLeafHash(r))).toEqual(fixture.leaf_hashes);
  });

  it('reconstructs the five-row golden root from the written fold rule, leaf hashes upward', () => {
    const sorted = [...fixture.records].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
    const leaves = sorted.map((r) => evidenceLeafHash(r));
    expect(leaves.length).toBe(5);

    // Level 1 pairs (0,1) and (2,3) and promotes the fifth; level 2 pairs those and promotes again. That is
    // the rule as §"the fold" states it, worked by hand for this n rather than run through the loop.
    const levelOne = [
      createHash('sha256').update(leaves[0] + leaves[1]).digest('hex'),
      createHash('sha256').update(leaves[2] + leaves[3]).digest('hex'),
      leaves[4],
    ];
    const levelTwo = [
      createHash('sha256').update(levelOne[0] + levelOne[1]).digest('hex'),
      levelOne[2],
    ];
    const top = createHash('sha256').update(levelTwo[0] + levelTwo[1]).digest('hex');

    expect(computeEvidenceRoot(fixture.records).root).toBe(
      createHash('sha256').update(`syncsenta-evidence-root-v1|5|${top}`).digest('hex'),
    );
  });

  it('is a fixture with enough rows to have more than one level', () => {
    expect(fixture.records.length).toBeGreaterThan(2);
    expect(new Set(fixture.records.map((r) => r.id)).size).toBe(fixture.records.length);
  });
});

describe('the per-learner inclusion proof', () => {
  const MIDDLE = '5d5d5d5d-5d5d-4d5d-8d5d-5d5d5d5d5d5d';
  const PROMOTED = 'e7e7e7e7-e7e7-4e7e-8e7e-7e7e7e7e7e7e';

  it('proves a learner inside the displayed window against the recorded root', () => {
    const proof = buildInclusionProof(fixture.records, MIDDLE);

    expect(proof.leafHash).toBe(evidenceLeafHash(fixture.records.find((r) => r.id === MIDDLE)!));
    expect(verifyInclusionProof(proof)).toBe(true);
    expect(proof.root).toBe(fixture.root);
    expect(proof.leafCount).toBe(5);
  });

  it('proves the odd row, whose path starts with two promotions', () => {
    const proof = buildInclusionProof(fixture.records, PROMOTED);
    const sorted = [...fixture.records].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
    const leaves = sorted.map((r) => evidenceLeafHash(r));
    const pair = (left: string, right: string) => createHash('sha256').update(left + right).digest('hex');
    const n0123 = pair(pair(leaves[0], leaves[1]), pair(leaves[2], leaves[3]));

    // Leaf 4 is promoted at level one and at level two, then pairs on the right at the top. That is the
    // promote-odd rule of §"the fold" seen from inside a proof, which is where a mirror implementation
    // would get it wrong.
    expect(proof.steps).toEqual([{ promote: true }, { promote: true }, { combine: n0123, side: 'left' }]);
    expect(verifyInclusionProof(proof)).toBe(true);
  });

  it('refuses to prove somebody else evidence under a real leaf hash', () => {
    const proof = buildInclusionProof(fixture.records, MIDDLE);
    const swapped = { ...proof, leafHash: evidenceLeafHash(fixture.records[0]) };

    expect(verifyInclusionProof(swapped)).toBe(false);
  });

  it('does not verify against a root nobody anchored', () => {
    const proof = buildInclusionProof(fixture.records, MIDDLE);

    expect(verifyInclusionProof({ ...proof, root: createHash('sha256').update('x').digest('hex') }))
      .toBe(false);
  });

  it('refuses an id that is not in the set instead of returning a proof of nothing', () => {
    expect(() => buildInclusionProof(fixture.records, '00000000-0000-4000-8000-000000000000'))
      .toThrow(EvidenceIdNotFoundError);
  });

  it('refuses a proof that claims a canonicalization version this code does not implement', () => {
    const proof = buildInclusionProof(fixture.records, MIDDLE);

    // The double cast is the point, not a shortcut: `/api/verify/[anchorId]` gets this object out of a stored
    // anchor row or a caller's POST, so whatever `InclusionProof` says about the literal type, at runtime a
    // proof can name `syncsenta-evidence-v2`. TypeScript refuses a single assertion here — the literal types
    // genuinely do not overlap — which is exactly the false confidence the route will not have. A verifier
    // that folds without checking the name would approve it under v1's rules.
    const foreign = { ...proof, version: 'syncsenta-evidence-v2' } as unknown as InclusionProof;

    expect(verifyInclusionProof(foreign)).toBe(false);
  });

  it('survives a JSON round trip, because /api/verify hands it out over HTTP', () => {
    const proof = buildInclusionProof(fixture.records, MIDDLE);
    const revived = JSON.parse(JSON.stringify(proof)) as typeof proof;

    expect(verifyInclusionProof(revived)).toBe(true);
  });

  it('proves a one-row term, the case where the fold has no levels to walk', () => {
    const only = record({ id: '0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a0a' });
    const proof = buildInclusionProof([only], only.id);

    // With one leaf the top node is the leaf itself and there is no sibling to publish, so an
    // implementation that loops "while index > 0" and never emits a step would still pass — but one that
    // hashed the lone leaf twice, or bound a count of 0, would not. The root comparison is the assertion.
    expect(proof.steps).toEqual([]);
    expect(proof.root).toBe(computeEvidenceRoot([only]).root);
    expect(verifyInclusionProof(proof)).toBe(true);
  });

  it('rejects a proof whose sibling hash is another row from the same term', () => {
    const proof = buildInclusionProof(fixture.records, MIDDLE);
    const firstCombine = proof.steps.findIndex((step) => 'combine' in step);
    expect(firstCombine).toBeGreaterThanOrEqual(0);

    const step = proof.steps[firstCombine] as { combine: string; side: 'left' | 'right' };
    const forged = { ...step, combine: fixture.leaf_hashes[0] };
    const tampered = { ...proof, steps: proof.steps.map((s, i) => (i === firstCombine ? forged : s)) };

    // A sibling that exists in the term but sits elsewhere is the attack a proof is supposed to close: the
    // re-fold lands on a different node, so the root comparison has to catch it.
    expect(verifyInclusionProof(tampered)).toBe(false);
  });
});

