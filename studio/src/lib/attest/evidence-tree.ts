/**
 * The canonical evidence tree — Stage 3, Phase 0 of `docs/research/ASI-DAPP-PATH.md`.
 *
 * One class-term's learning evidence becomes one hash. That hash is signed with Ed25519 (`sign.ts`) and,
 * on the chain leg, published; the value of publishing it is that a county office holding a sanctioned CSV
 * export can recompute the same hash from data alone. So this file is a serialization contract wearing a
 * TypeScript coat, and every choice below is one a second implementation in another language has to be
 * able to copy without asking us a question:
 *
 *   1. **Field set, not row shape.** `syncsenta-evidence-v1` commits to the fifteen columns that describe
 *      the learning claim. It deliberately excludes `created_at`, `event_id`, `reviewed_by` and
 *      `reviewed_at`: a teacher reviewing evidence a term later must not change the root the term was
 *      anchored under. Extra keys on the object a caller passes are ignored, so a full `SELECT *` row is
 *      the same leaf as a trimmed one.
 *   2. **Key order.** Object keys are sorted by Unicode code point at serialization time. `jsonb` in
 *      Postgres has no order to preserve, so relying on insertion order would make the root depend on how
 *      a client happened to build the object — and relying on ECMAScript's own key iteration order would
 *      make it depend on whether a key looks like an integer.
 *   3. **Numbers.** Integers in practice. Non-finite numbers are refused; everything else is emitted in
 *      ECMAScript's shortest round-trip form, which is the one place a Python mirror has to do real work,
 *      so it is pinned by the golden fixture rather than assumed.
 *   4. **Null vs absent.** A nullable column that came back absent and one that came back `null` are the
 *      same leaf, because PostgREST, the SQL editor and a CSV export disagree about which they emit.
 *   5. **Time.** `captured_at` is rendered in UTC at whole-second precision: `YYYY-MM-DDTHH:MM:SSZ`. An
 *      offset of `+03:00` and a microsecond suffix therefore cannot fork the tree, and a timestamp string
 *      that is not a moment is a `TypeError` rather than a hash of gibberish. Truncating sub-second
 *      precision is the price of that agreement and is paid on purpose — two rows that differ only in
 *      microseconds still differ in `id`.
 *   6. **Order.** Leaves are ordered by `id` in canonical lowercase-uuid form. Arrival order is never a
 *      factor, and an id outside that form is refused instead of being sorted by whatever comparison the
 *      host language happens to default to.
 *   7. **The fold.** Leaves are hex sha256 digests over `version + NUL + canonical-json`. Each level
 *      hashes the concatenation of two child hex strings; an odd node is promoted, never duplicated. The
 *      top node is then bound as `sha256("syncsenta-evidence-root-v1|<leafCount>|<topNode>")`, so the root
 *      commits to how many rows it stands for as well as what they say.
 *   8. **The empty set is not a root.** A class-term with no evidence throws. A predictable hash over
 *      nothing would read as a term that happened, and the anchor exists precisely so that cannot be faked.
 *
 * The shape mirrors `learning_evidence` as it exists in production
 * (`supabase/migrations_live/20260928000000_live_baseline.sql:146`), snake_cased like every other row type
 * here, because callers hand over database rows. What that means for the first real anchor: the table is in
 * the catalog and has no writer and no generated type in `studio/src`, which is the question §10 of the
 * roadmap puts to the owner.
 */

import { createHash } from 'node:crypto';

export const EVIDENCE_CANONICALIZATION_VERSION = 'syncsenta-evidence-v1';

/** Mixed into the final hash so a change of fold rule cannot silently reuse an old root. */
const ROOT_BINDING_VERSION = 'syncsenta-evidence-root-v1';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * One learner's captured evidence for the term, as the anchor sees it. The snake_case names are the
 * database's, not a style choice: the caller is expected to hand over rows read from `learning_evidence`.
 */
export interface EvidenceRecord {
  id: string;
  student_profile_id: string;
  activity_id: string;
  curriculum_design_version: string;
  grade: string;
  subject: string;
  strand: string | null;
  sub_strand: string | null;
  learning_outcome: string;
  competency: string | null;
  value: string | null;
  evidence_type: string;
  rubric: JsonValue;
  source: string;
  captured_at: string;
}

export interface EvidenceRoot {
  version: typeof EVIDENCE_CANONICALIZATION_VERSION;
  leafCount: number;
  root: string;
}

export class EmptyEvidenceSetError extends Error {
  constructor() {
    super(
      'cannot anchor a class-term with no evidence: a root over nothing is predictable, so it commits to ' +
      'nothing. Refusing is the honest answer.',
    );
    this.name = 'EmptyEvidenceSetError';
  }
}

export class DuplicateEvidenceIdError extends Error {
  constructor(readonly id: string) {
    super(`duplicate evidence id ${id}: two rows with one id make the leaf order ambiguous`);
    this.name = 'DuplicateEvidenceIdError';
  }
}

export class MalformedEvidenceIdError extends Error {
  constructor(readonly id: string) {
    super(
      `evidence id ${JSON.stringify(id)} is not a lowercase canonical uuid: the tree orders by this ` +
      'string, so a form another host would sort differently cannot be part of a public contract',
    );
    this.name = 'MalformedEvidenceIdError';
  }
}

/** The columns `syncsenta-evidence-v1` commits to. Adding one here is a new version, not a patch. */
const V1_FIELDS = [
  'id',
  'student_profile_id',
  'activity_id',
  'curriculum_design_version',
  'grade',
  'subject',
  'strand',
  'sub_strand',
  'learning_outcome',
  'competency',
  'value',
  'evidence_type',
  'rubric',
  'source',
  'captured_at',
] as const;

const CANONICAL_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Code-point comparison, used for ids and for keys alike. */
function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * `YYYY-MM-DDTHH:MM:SSZ`, from anything `Date` accepts. Dropping sub-second parts is contract rule 5; an
 * unparseable string throws rather than becoming a hash of a typo.
 */
function canonicalCapturedAt(value: unknown): string {
  if (typeof value !== 'string') {
    throw new TypeError(`captured_at must be a timestamp string, got ${typeof value}`);
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new TypeError(`captured_at is not a moment: ${JSON.stringify(value)}`);
  }
  return new Date(parsed).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Normalize to a JSON value the emitter can render: absent becomes null, non-finite numbers and functions
 * are refused. Sorting happens at emit time, not here, because ECMAScript re-orders integer-like keys on
 * iteration and that re-ordering must not reach the bytes.
 */
function toJsonValue(value: unknown, path: string): JsonValue {
  if (value === null || value === undefined) return null;

  switch (typeof value) {
    case 'string':
      return value;
    case 'boolean':
      return value;
    case 'number':
      if (!Number.isFinite(value)) {
        throw new TypeError(`${path} is ${String(value)}, which has no JSON representation to hash`);
      }
      return value;
    case 'bigint':
      return value.toString();
    case 'object':
      break;
    default:
      throw new TypeError(`${path} has type ${typeof value}, which is not a JSON value`);
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => toJsonValue(item, `${path}[${index}]`));
  }

  const source = value as Record<string, unknown>;
  const copy: { [key: string]: JsonValue } = {};
  for (const key of Object.keys(source)) {
    copy[key] = toJsonValue(source[key], `${path}.${key}`);
  }
  return copy;
}

/** Compact, key-sorted, whitespace-free JSON. The bytes this version hashes. */
function emit(value: JsonValue): string {
  if (value === null) return 'null';

  switch (typeof value) {
    case 'string':
      return JSON.stringify(value);
    case 'number':
      return String(value);
    case 'boolean':
      return value ? 'true' : 'false';
  }

  if (Array.isArray(value)) {
    return `[${value.map(emit).join(',')}]`;
  }

  const object = value as { [key: string]: JsonValue };
  const keys = Object.keys(object).sort(compareStrings);
  return `{${keys.map((key) => `${JSON.stringify(key)}:${emit(object[key])}`).join(',')}}`;
}

/**
 * The exact string whose hash is the leaf. Exposed because the auditor CLI described in
 * `docs/research/ASI-DAPP-PATH.md` Phase 1 shows it to a human, and because a mirror implementation in
 * another language is only checkable against this if the string itself is reachable.
 */
export function canonicalEvidenceRecord(record: EvidenceRecord): string {
  const picked: { [key: string]: JsonValue } = {};

  for (const field of V1_FIELDS) {
    picked[field] = field === 'captured_at'
      ? canonicalCapturedAt(record[field])
      : toJsonValue(record[field], field);
  }

  return emit(picked);
}

export function evidenceLeafHash(record: EvidenceRecord): string {
  const { id } = record;

  if (typeof id !== 'string' || !CANONICAL_UUID.test(id)) {
    throw new MalformedEvidenceIdError(String(id));
  }

  return sha256Hex(`${EVIDENCE_CANONICALIZATION_VERSION}\u0000${canonicalEvidenceRecord(record)}`);
}

/**
 * The root of one class-term's evidence. Deterministic in the records only: same set, any order, same root.
 */
export function computeEvidenceRoot(records: readonly EvidenceRecord[]): EvidenceRoot {
  if (records.length === 0) throw new EmptyEvidenceSetError();

  const sorted = [...records].sort((a, b) => compareStrings(a.id, b.id));

  const seen = new Set<string>();
  const leaves: string[] = [];
  for (const record of sorted) {
    if (seen.has(record.id)) throw new DuplicateEvidenceIdError(record.id);
    seen.add(record.id);
    leaves.push(evidenceLeafHash(record));
  }

  let level = leaves;
  while (level.length > 1) {
    const next: string[] = [];
    for (let index = 0; index < level.length; index += 2) {
      next.push(
        index + 1 < level.length
          ? sha256Hex(level[index] + level[index + 1])
          : level[index],
      );
    }
    level = next;
  }

  return {
    version: EVIDENCE_CANONICALIZATION_VERSION,
    leafCount: leaves.length,
    root: sha256Hex(`${ROOT_BINDING_VERSION}|${leaves.length}|${level[0]}`),
  };
}
