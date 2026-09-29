/**
 * Safe data retrieval — the query half, and the reason `redact.ts` exists at all.
 *
 * A redaction policy that is applied *after* the rows arrive is a confession: the identifiers came over the
 * wire, landed in this process's memory, and were then thrown away by a function that hoped nobody had
 * dumped the heap. So this file decides what is ever asked for, and it refuses before it queries. The
 * rules, in the order they are checked:
 *
 *   1. **A table with no policy is not retrieved.** Not "retrieved and emptied", not "retrieved because the
 *      caller swears the columns are safe" — the query is never issued. Discovering a table's columns by
 *      asking for them is exactly the behaviour the redaction half was written to stop, and a surface that
 *      will SELECT anything a human types is a SQL prompt wearing a role check.
 *   2. **The select list is the policy's keep and pseudonymize columns, sorted, and nothing else.** A
 *      `drop` rule therefore does more than hide a column from the result: it keeps `guardian_phone` off
 *      the network. Sorted, because a query that varies with the order somebody wrote an object in is a
 *      query nobody can compare against a log later.
 *   3. **No star, ever.** `*` is the one form that guarantees a schema change becomes a data disclosure
 *      without anybody editing this file.
 *   4. **A cap, enforced rather than assumed.** `MAX_RETRIEVAL_ROWS` exists because "how many rows do you
 *      want" has no right answer when the rows are children, and because a missing `limit` is what turns a
 *      verification query into a table copy at 2 a.m. Asking for more than the cap is refused instead of
 *      silently clamped: a caller that believed it was fetching 5,000 rows should not be handed 200 and
 *      told the maths worked.
 *   5. **The salt is checked before the query**, using the same rule the redaction half applies afterwards.
 *      A retriever that discovered the salt was missing only once the rows were in hand had already done
 *      the thing it was refusing to finish.
 *
 * The connection arrives as a function, not as a client. That is not dependency-injection for its own
 * good: it means this whole surface is testable against a double that records what was asked, so the
 * safety properties above are asserted *without* a live school database — which matters here more than
 * anywhere, because the only database this project can reach holds real learners.
 */

import {
  assertRetrievalSalt,
  redactRow,
  type RetrievedRow,
  type ScalarValue,
  type TablePolicy,
} from './redact';

export type { RetrievedRow, ScalarValue } from './redact';

/** Every table this deployment is allowed to read, and what each one may return. */
export type RetrievalPolicies = Readonly<Record<string, TablePolicy>>;

/** What a connection is asked for: one table, an explicit column list, one bounded page. */
export interface RetrievalQuery {
  readonly table: string;
  readonly columns: readonly string[];
  readonly limit: number;
}

/** The port a real driver is adapted to. Returning more rows than `limit` is the driver's bug, not ours. */
export type SelectRows = (query: RetrievalQuery) => Promise<readonly RetrievedRow[]>;

/** More rows than this is not a verification query, it is an export, and exports are a different consent. */
export const MAX_RETRIEVAL_ROWS = 200;

export class UnpoliciedRetrievalError extends Error {
  constructor(readonly table: string) {
    super(
      `no policy was ever written for table ${JSON.stringify(table)}, so nothing was queried: retrieving an ` +
        'unpolicied table means the columns are decided by whoever typed the call, which is the failure mode ' +
        'this whole directory exists to make unreachable',
    );
    this.name = 'UnpoliciedRetrievalError';
  }
}

export class EmptyRetrievalPolicyError extends Error {
  constructor(readonly table: string) {
    super(
      `the policy for ${JSON.stringify(table)} drops every column it names, so its select list would be ` +
        'empty: a table nobody will name a keepable column for is a table that should not be retrieved at all',
    );
    this.name = 'EmptyRetrievalPolicyError';
  }
}

export class RetrievalLimitError extends Error {
  constructor(readonly limit: number) {
    super(
      `a retrieval asked for ${JSON.stringify(limit)} rows: the cap is ${MAX_RETRIEVAL_ROWS}, and the ask is ` +
        'refused rather than clamped, because a caller that thought it fetched 5,000 rows must not be handed ' +
        '200 and left to average them',
    );
    this.name = 'RetrievalLimitError';
  }
}

export interface RetrievalRequest {
  readonly select: SelectRows;
  readonly table: string;
  readonly policies: RetrievalPolicies;
  readonly salt: string;
  readonly limit?: number;
}

/**
 * Retrieve one bounded page of one policied table, redacted row by row.
 *
 * Every refusal here happens before the connection is touched, so an aborted retrieval leaves no trace in
 * the school's database beyond the read it managed to issue — which is the point of ordering the checks
 * this way rather than validating the rows afterwards.
 */
export async function retrieveTable(
  request: RetrievalRequest,
): Promise<Record<string, ScalarValue>[]> {
  const policy = request.policies[request.table];
  if (policy === undefined) throw new UnpoliciedRetrievalError(request.table);

  assertRetrievalSalt(request.salt);

  const limit = request.limit ?? MAX_RETRIEVAL_ROWS;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_RETRIEVAL_ROWS) {
    throw new RetrievalLimitError(limit);
  }

  const columns = Object.entries(policy)
    .filter(([, rule]) => rule.action !== 'drop')
    .map(([column]) => column)
    .sort();
  if (columns.length === 0) throw new EmptyRetrievalPolicyError(request.table);

  const rows = await request.select({ table: request.table, columns, limit });
  return rows.map((row) => redactRow(row, policy, request.salt));
}
