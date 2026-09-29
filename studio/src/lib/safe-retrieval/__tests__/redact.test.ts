import { describe, expect, it } from 'vitest';

import {
  MissingRetrievalSaltError,
  NonScalarRetrievedValueError,
  redactRow,
  type TablePolicy,
} from '../redact';

/**
 * A retrieval surface is only safe if its default is refusal, so every test below asks the same question
 * from a different angle: what comes out when the policy did not say? The salt constant is deliberately
 * long — the module refuses a short one, and a test that had to weaken that rule would be a test of a
 * surface that is not safe.
 */
const SALT = 'a-deployment-secret-of-at-least-sixteen-characters';
const OTHER_SALT = 'a-different-deployment-secret-of-equal-length';

const policy: TablePolicy = {
  id: { action: 'drop' },
  full_name: { action: 'pseudonymize' },
  grade: { action: 'keep' },
};

const row = {
  id: '8f14e45f-ceea-467a-9c06-2f6a5c1b0d3e',
  full_name: 'Amina Wanjiru',
  grade: 6,
  guardian_phone: 'not-a-number-just-a-key-name',
  enrolled_at: '2026-01-14',
};

describe('redactRow drops what the policy does not name', () => {
  it('returns only the columns the policy names as keep or pseudonymize', () => {
    const redacted = redactRow(row, policy, SALT);
    expect(Object.keys(redacted).sort()).toEqual(['full_name', 'grade']);
  });

  it('leaves a dropped column out entirely rather than setting it to null', () => {
    const redacted = redactRow(row, policy, SALT);
    expect('id' in redacted).toBe(false);
  });
});

describe('redactRow pseudonymizes with the deployment salt', () => {
  it('turns a name into a stable token that carries none of the name', () => {
    const once = redactRow(row, policy, SALT).full_name;
    const twice = redactRow(row, policy, SALT).full_name;
    expect(once).toBe(twice);
    expect(once).toMatch(/^[0-9a-f]{16}$/);
    expect(String(once).toLowerCase()).not.toContain('amina');
  });

  it('gives a different token under a different salt, so the token means nothing without the secret', () => {
    expect(redactRow(row, policy, OTHER_SALT).full_name).not.toBe(
      redactRow(row, policy, SALT).full_name,
    );
  });

  it('leaves a null pseudonymized as null rather than minting a token for an absent identity', () => {
    expect(redactRow({ full_name: null, grade: 6 }, policy, SALT).full_name).toBeNull();
  });

  it('refuses to run with a salt too short to be a secret', () => {
    expect(() => redactRow(row, policy, '')).toThrow(MissingRetrievalSaltError);
    expect(() => redactRow(row, policy, 'ab12')).toThrow(MissingRetrievalSaltError);
  });
});

describe('redactRow refuses a value it cannot render as a scalar', () => {
  it('throws on a nested object instead of passing it through or dropping it quietly', () => {
    // `portfolio` is jsonb. Silence over a column whose contents nobody enumerated is how a PII dump
    // becomes a "redacted" export, so the row is refused and the policy has to say something.
    const withNested = { id: 'u1', grade: 6, portfolio: { essays: ['draft'] } };
    expect(() => redactRow(withNested, policy, SALT)).toThrow(NonScalarRetrievedValueError);
  });

  it('lets a null through a keep rule, because a scalar absence is a fact about the row', () => {
    expect(redactRow({ grade: null, id: 'u1', full_name: 'Z' }, policy, SALT).grade).toBeNull();
  });
});
