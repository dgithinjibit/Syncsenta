import { describe, expect, it } from 'vitest';

import {
  MAX_RETRIEVAL_ROWS,
  RetrievalLimitError,
  retrieveTable,
  type RetrievedRow,
  type RetrievalPolicies,
  type SelectRows,
} from '../retrieve';
import { EmptyRetrievalPolicyError, UnpoliciedRetrievalError } from '../retrieve';
import { MissingRetrievalSaltError, NonScalarRetrievedValueError } from '../redact';

/**
 * `redact.ts` decides what may survive a row; this file decides what is ever asked for. The two are tested
 * against a fake connection on purpose — the moment a retrieval helper has to be run against a live school
 * to be sure of itself, it is not a safety surface, it is a guess with a query string in it.
 */
const SALT = 'a-deployment-secret-of-at-least-sixteen-characters';

const policies: RetrievalPolicies = {
  learning_progress: {
    student_profile_id: { action: 'pseudonymize' },
    competency_code: { action: 'keep' },
    mastery_level: { action: 'keep' },
    guardian_phone: { action: 'drop' },
    portfolio: { action: 'drop' },
  },
};

/** A connection double that records what was asked and hands back canned rows. */
function fakeConnection(rows: readonly RetrievedRow[]) {
  const calls: { table: string; columns: readonly string[]; limit: number }[] = [];
  const select: SelectRows = async ({ table, columns, limit }) => {
    calls.push({ table, columns, limit });
    return rows;
  };
  return { select, calls };
}

describe('retrieveTable asks only for what the policy will keep', () => {
  it('puts the keep and pseudonymize columns in the select and the drop columns nowhere', async () => {
    const { select, calls } = fakeConnection([]);
    await retrieveTable({ select, table: 'learning_progress', policies, salt: SALT });
    expect(calls).toHaveLength(1);
    expect([...calls[0].columns].sort()).toEqual(['competency_code', 'mastery_level', 'student_profile_id']);
  });

  it('never sends a star, so an unlisted column is never on the wire to be thrown away', async () => {
    const { select, calls } = fakeConnection([]);
    await retrieveTable({ select, table: 'learning_progress', policies, salt: SALT });
    expect(calls[0].columns).not.toContain('*');
  });
});

describe('retrieveTable refuses before it queries', () => {
  it('will not retrieve a table nobody wrote a policy for, and issues no query to prove it', async () => {
    const { select, calls } = fakeConnection([]);
    await expect(retrieveTable({ select, table: 'chat_sessions', policies, salt: SALT })).rejects.toThrow(
      UnpoliciedRetrievalError,
    );
    expect(calls).toHaveLength(0);
  });

  it('will not query at all with a salt too short to be a secret', async () => {
    const { select, calls } = fakeConnection([]);
    await expect(retrieveTable({ select, table: 'learning_progress', policies, salt: 'ab12' })).rejects.toThrow(
      MissingRetrievalSaltError,
    );
    expect(calls).toHaveLength(0);
  });

  it('will not retrieve a policy whose every column is dropped', async () => {
    const { select, calls } = fakeConnection([]);
    const nothing: RetrievalPolicies = { silent_table: { a: { action: 'drop' } } };
    await expect(retrieveTable({ select, table: 'silent_table', policies: nothing, salt: SALT })).rejects.toThrow(
      EmptyRetrievalPolicyError,
    );
    expect(calls).toHaveLength(0);
  });
});

describe('retrieveTable caps how many child rows it will hold', () => {
  it('takes the cap when the caller does not name one', async () => {
    const { select, calls } = fakeConnection([]);
    await retrieveTable({ select, table: 'learning_progress', policies, salt: SALT });
    expect(calls[0].limit).toBe(MAX_RETRIEVAL_ROWS);
  });

  it('refuses a caller that asks for more rows than the cap', async () => {
    const { select, calls } = fakeConnection([]);
    await expect(
      retrieveTable({ select, table: 'learning_progress', policies, salt: SALT, limit: MAX_RETRIEVAL_ROWS + 1 }),
    ).rejects.toThrow(RetrievalLimitError);
    expect(calls).toHaveLength(0);
  });
});

describe('retrieveTable hands back redacted rows or nothing', () => {
  const rows: readonly RetrievedRow[] = [
    { student_profile_id: '8f14e45f-ceea-467a-9c06-2f6a5c1b0d3e', competency_code: 'MATH-6-1', mastery_level: 2 },
    { student_profile_id: '8f14e45f-ceea-467a-9c06-2f6a5c1b0d3e', competency_code: 'SCIE-6-3', mastery_level: 1 },
  ];

  it('pseudonymizes the identifier and keeps the two columns the policy named', async () => {
    const { select } = fakeConnection(rows);
    const retrieved = await retrieveTable({ select, table: 'learning_progress', policies, salt: SALT });
    expect(retrieved).toHaveLength(2);
    expect(retrieved[0].student_profile_id).toMatch(/^[0-9a-f]{16}$/);
    expect(retrieved[0].competency_code).toBe('MATH-6-1');
    expect(retrieved[0].student_profile_id).toBe(retrieved[1].student_profile_id);
  });

  it('drops the whole retrieval when one row carries a blob in a column the policy kept', async () => {
    const { select } = fakeConnection([{ ...rows[0], mastery_level: { level: 2 } }]);
    await expect(retrieveTable({ select, table: 'learning_progress', policies, salt: SALT })).rejects.toThrow(
      NonScalarRetrievedValueError,
    );
  });
});
