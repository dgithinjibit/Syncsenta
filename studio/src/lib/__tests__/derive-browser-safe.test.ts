import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The derivation engine has to survive being bundled to a browser.
 *
 * The plan on `docs/ROADMAP.md` §11 is a teacher who drafts a scheme of work on a phone with no network and
 * reconciles it against the national curriculum in the page, offline. That only works if the module that
 * produces the cited transcript is pure: no `node:fs`, no `process.cwd()`, no environment variable, and no
 * implicit "read the pack from wherever the server happens to be". A server-only default would make the
 * reconciler a round trip, which is the exact thing the offline requirement forbids.
 *
 * Two kinds of check, deliberately:
 *   1. a textual one, because a single stray `import { readFileSync }` type-checks fine and then explodes in
 *      the bundle;
 *   2. a behavioural one, because the text could be clean while the code still reaches for the disk — so we
 *      hand the engine a `file` that cannot exist on any host and require it to answer anyway.
 */

const REPO = join(process.cwd(), '..');
const PACK_FILE = join(REPO, 'backend', 'syncsenta-backend', 'data', 'omega_claw_rules.metta');
const PACK_TEXT = readFileSync(PACK_FILE, 'utf8');
const ENGINE_FILE = join(process.cwd(), 'src', 'lib', 'attest', 'derive.ts');

/** A source whose `file` is a label only: nothing on this machine is at that path. */
const LABELLED = {
  file: 'pack/omega_claw_rules.metta',
  text: PACK_TEXT,
};

const { deriveScope, deriveActivityApproval, renderDerivation } = await import('@/lib/attest/derive');

/** Prose legitimately names the things the code must not use, so comments are stripped before matching. */
function codeOnly(source: string): string {
  return source
    .split('\n')
    .filter((line) => !/^\s*(\/?\*|\/\/)/.test(line))
    .join('\n');
}

describe('the derivation engine is pure TypeScript, not a Node module', () => {
  it('imports nothing from node: and reads no process state', () => {
    const code = codeOnly(readFileSync(ENGINE_FILE, 'utf8'));
    expect(code).not.toMatch(/from\s+['"]node:/);
    expect(code).not.toMatch(/require\(['"]fs/);
    expect(code).not.toMatch(/\bprocess\./);
  });

  it('derives from a pack it was handed, with no reachable file on disk', () => {
    const d = deriveScope('grade6', LABELLED);
    expect(d.conclusion).toBe('introductory');
    expect(d.conclusionLine).not.toBeNull();
    expect(d.packRowCount).toBeGreaterThan(30);
  });

  it('refuses to invent a source: no argument, no derivation', () => {
    // The previous signature defaulted to a path built from process.cwd(), so a browser bundle or a
    // differently-laid-out server would either crash opaquely or quietly read a file nobody asked for.
    // The source is now the caller's to supply, on every call.
    const noSource = deriveScope as unknown as (grade: string) => unknown;
    expect(() => noSource('grade6')).toThrow();
  });

  it('cites the label it was given rather than a server path', () => {
    const d = deriveActivityApproval({ grade: 'grade6', activity: 'ai-input-output' }, LABELLED);
    const rendered = renderDerivation(d);
    expect(rendered).toContain('omega_claw_rules.metta:');
    expect(rendered).not.toContain('/home/');
    expect(rendered).not.toContain(REPO);
  });
});
