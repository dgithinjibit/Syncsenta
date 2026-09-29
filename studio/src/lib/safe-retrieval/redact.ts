/**
 * Safe data retrieval — the redaction half.
 *
 * The problem this exists to solve is not "how do we read production", it is "how do we read production
 * and still hand the result to somebody". Every verification gap in `docs/ROADMAP.md` §5 is a gap of the
 * form *nobody has looked at the live rows*, and the reason nobody has looked is that looking means
 * pulling a table of children's names, phone numbers and guardrail events onto a screen — after which the
 * only honest storage location is a place that must never be committed. A retrieval surface that returns
 * rows verbatim turns a debugging session into a breach with extra steps.
 *
 * So the surface is: a caller names the columns it wants, and this file decides what may actually come
 * out. The choices, in the order they matter:
 *
 *   1. **A column the policy does not name is absent.** Not null, not empty, not "we will see". The policy
 *      is an allow-list, and an allow-list whose default is to include things is a deny-list wearing a
 *      costume. Callers therefore cannot discover a column by asking for the table.
 *   2. **A dropped column is absent rather than null.** A null in an export claims *there was a value and
 *      it was empty*; a dropped column had nothing to report, and the two read differently to the person
 *      holding the file.
 *   3. **A non-scalar value is refused, loudly.** `jsonb` is the column type where a dump hides — a
 *      `portfolio` blob can carry an essay with a phone number in it, and neither the policy author nor
 *      the reader enumerated its keys. Silence over a column nobody read is how a breach gets labelled
 *      redacted, so the whole row is rejected and the policy has to say something about that column.
 *   4. **`pseudonymize` is salted by a deployment secret.** The population here is a school roster: a few
 *      dozen names, all of them guessable, so an unsalted hash of `full_name` is not a pseudonym, it is
 *      the name written in a font nobody bothered to decode. The salt is a parameter rather than a
 *      constant precisely so that it cannot be committed. Below `MIN_SALT_LENGTH` it is treated as
 *      missing, because a salt that short is a hint.
 *   5. **The token is stable and truncated.** Stability is what makes the surface useful — the same child
 *      has to look like the same token across `learning_progress` and `point_transactions`, or the join
 *      that answers "did the award land" is impossible. Sixteen hex characters is 64 bits, which is
 *      collision-safe at the size of any school this project will serve for years and cheaper to read than
 *      a full digest. The truncation is a hashing-out, not a signature: nothing here claims authenticity,
 *      only unguessability.
 *   6. **A null stays null under `pseudonymize`.** Minting a token for an absent identity would make "we
 *      never recorded this child's name" indistinguishable from "we recorded somebody's", and the first is
 *      a fact about the row while the second is a person.
 *
 * Nothing in this file touches a database. That is deliberate: the policy is the part worth testing, and a
 * retriever that bundles the query and the redaction can only be tested against a live school.
 */

import { createHash } from 'node:crypto';

/** A column's fate, as decided by whoever wrote the policy — never by the row. */
export type ColumnRule = { action: 'keep' } | { action: 'pseudonymize' } | { action: 'drop' };

/** Column name to rule. A table with no policy is a table nothing was retrieved from. */
export type TablePolicy = Readonly<Record<string, ColumnRule>>;

/** What a redacted cell can hold once the shape rule has had its say. */
export type ScalarValue = string | number | boolean | null;

/** A retrieved row: whatever the driver returned, before this file decides what may survive. */
export type RetrievedRow = Readonly<Record<string, unknown>>;

/** Below this, a "salt" is a formatting choice rather than a secret. */
export const MIN_SALT_LENGTH = 16;

const TOKEN_HEX_LENGTH = 16;

export class MissingRetrievalSaltError extends Error {
  constructor(readonly length: number) {
    super(
      `a pseudonymization salt shorter than ${MIN_SALT_LENGTH} characters hides nothing: this row carries ` +
        `child-level identifiers and was offered a salt ${JSON.stringify(length)} characters long, so the ` +
        'retrieval is refused rather than exported in a form that survives a roster',
    );
    this.name = 'MissingRetrievalSaltError';
  }
}

export class NonScalarRetrievedValueError extends Error {
  constructor(readonly column: string, readonly typeName: string) {
    super(
      `column ${JSON.stringify(column)} holds a ${typeName}, whose keys nobody enumerated: a jsonb blob is ` +
        'where a dump hides inside a "redacted" export, so the row is refused instead of quietly dropped — ' +
        'give that column an explicit rule and narrow the select',
    );
    this.name = 'NonScalarRetrievedValueError';
  }
}

function scalarTypeName(value: unknown): string {
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'Date';
  return typeof value;
}

function isScalar(value: unknown): value is ScalarValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

/**
 * Salted, type-tagged, truncated digest. The tag keeps `6` and `'6'` from becoming the same token —
 * Postgres `int8` arrives as a string and `int4` as a number, and a pseudonym that changes with the
 * driver's mood is not a join key.
 */
function pseudonym(value: ScalarValue, salt: string): string {
  const tagged = `${typeof value}:${String(value)}`;
  return createHash('sha256').update(`${salt}\u0000${tagged}`, 'utf8').digest('hex')
    .slice(0, TOKEN_HEX_LENGTH);
}

/**
 * Apply a table's policy to one retrieved row.
 *
 * The salt is validated even when no rule asks for it: a caller that narrowed its policy later should not
 * get a silently different answer about whether identifiers were protected, and the whole point of the
 * parameter is that it arrived from a secret store rather than from this file.
 */
export function redactRow(row: RetrievedRow, policy: TablePolicy, salt: string): Record<string, ScalarValue> {
  if (typeof salt !== 'string' || salt.length < MIN_SALT_LENGTH) {
    throw new MissingRetrievalSaltError(typeof salt === 'string' ? salt.length : 0);
  }

  // Shape is checked on the way past every column, before any rule is consulted: an unnamed column
  // holding a blob is refused even though an unnamed scalar column is dropped, because the two failures
  // mean different things. A scalar we did not ask for was never in scope; a blob we did not enumerate
  // may have been.
  const redacted: Record<string, ScalarValue> = {};
  for (const [column, value] of Object.entries(row)) {
    if (!isScalar(value)) throw new NonScalarRetrievedValueError(column, scalarTypeName(value));

    const rule = policy[column];
    if (rule === undefined || rule.action === 'drop') continue;
    if (rule.action === 'keep') {
      redacted[column] = value;
      continue;
    }
    redacted[column] = value === null ? null : pseudonym(value, salt);
  }
  return redacted;
}
