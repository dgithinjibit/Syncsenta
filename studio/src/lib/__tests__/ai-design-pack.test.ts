import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The Grade 8 AI design pack: generated, committed, and locked against the curriculum it came from.
 *
 * The teacher reconciler has to answer "is this sub-strand real for Grade 8?" offline, in the page, from one
 * place. `studio/src/data/curriculum/senior-school/ai.ts` already holds that answer, but it is a 1,141-line
 * TS module and a MeTTa transcript cites `file:line`. So the pack is *derived* from the TS, never hand-copied:
 * `ai.ts` stays the decision-maker and this file is one more rendering of it, the same relationship the Omega
 * rule pack has to `omega-claw-rules.ts`. The drift test below is what makes that claim rather than the
 * comment — edit `ai.ts` without re-running the generator and this suite fails.
 *
 * Every row carries an `(= (ai-design-origin …) "<file>:<line>")` value pointing at the exact `ss(…)` call it
 * was read from, so a transcript can show a teacher the curriculum line behind a refusal, not just the
 * generated line.
 */

const STUDIO = process.cwd();
const REPO = join(STUDIO, '..');
const SOURCE_LABEL = 'studio/src/data/curriculum/senior-school/ai.ts';
const SOURCE_FILE = join(STUDIO, 'src', 'data', 'curriculum', 'senior-school', 'ai.ts');
const PACK_FILE = join(STUDIO, 'public', 'omega', 'ai_g8_design.metta');

const { emitDesignPack } = await import('@/data/curriculum/design-pack/emit');
const { parsePack } = await import('@/lib/attest/derive');

const SOURCE_TEXT = readFileSync(SOURCE_FILE, 'utf8');
const SOURCE_LINES = SOURCE_TEXT.split('\n');

function emit(): string {
  return emitDesignPack({
    sourceText: SOURCE_TEXT,
    sourceLabel: SOURCE_LABEL,
    gradeKey: 'g8',
    exportName: 'grade8AI',
  });
}

describe('the Grade 8 design pack is generated from the curriculum module', () => {
  it('is committed, and is byte-identical to what the generator produces today', () => {
    expect(existsSync(PACK_FILE), `${PACK_FILE} should exist — run npm run generate:design-pack`).toBe(true);
    const committed = readFileSync(PACK_FILE, 'utf8');
    expect(committed.replace(/\r\n/g, '\n')).toBe(emit());
  });

  it('parses with the derivation engine, including its quoted prose values', () => {
    const rows = parsePack(emit());
    expect(rows.length).toBeGreaterThan(60);
    // A row the parser cannot read is a row that silently does not exist; nothing may be dropped here.
    expect(rows.every((row) => row.line > 0 && row.head.startsWith('ai-design-'))).toBe(true);
    const names = rows.filter((row) => row.head === 'ai-design-name');
    expect(names.every((row) => typeof row.value === 'string' && row.value.length > 0)).toBe(true);
  });

  it('names the sub-strands the curriculum names, and no others', () => {
    const rows = parsePack(emit());
    const nameOf = (id: string) => rows.find((row) => row.head === 'ai-design-name' && row.args.includes(id))?.value;
    expect(nameOf('1.1')).toBe('Search and Problem Solving');
    expect(typeof nameOf('5.4')).toBe('string');
    expect(rows.filter((row) => row.head === 'ai-design-name')).toHaveLength(16);
  });

  it('cites an origin line that really states that sub-strand in ai.ts', () => {
    const rows = parsePack(emit());
    const origins = rows.filter((row) => row.head === 'ai-design-origin');
    expect(origins.length).toBeGreaterThan(0);
    for (const row of origins) {
      const id = row.args[row.args.length - 1];
      const [label, lineRaw] = String(row.value).split(':');
      expect(label).toBe(SOURCE_LABEL);
      const line = Number(lineRaw);
      expect(Number.isInteger(line), `${id} origin line`).toBe(true);
      const text = SOURCE_LINES[line - 1] ?? '';
      expect(text, `${id} should appear at ${SOURCE_LABEL}:${line}`).toContain(`"${id} `);
      const name = rows.find((n) => n.head === 'ai-design-name' && n.args.includes(id))?.value;
      expect(text).toContain(String(name));
    }
  });

  it('carries the strand membership a scheme row is checked against', () => {
    const rows = parsePack(emit());
    const strandOf = (id: string) =>
      rows.find((row) => row.head === 'ai-design-strand' && row.args.includes(id))?.value;
    expect(strandOf('1.1')).toBe('1.0');
    expect(strandOf('2.3')).toBeTypeOf('string');
    expect(rows.filter((row) => row.head === 'ai-design-strand-name').map((row) => row.value)).toEqual([
      'Foundations of Intelligence',
      'Data and Representation',
      'AI Techniques and Programming',
      'AI System Design and Projects',
      'Ethics, Society and AI Policy',
    ]);
  });

  it('records the version stamp the curriculum module itself carries', () => {
    const version = parsePack(emit()).find((row) => row.head === 'ai-design-curriculum-version');
    const declared = SOURCE_TEXT.match(/AI_LITERACY_VERSION\s*=\s*"([^"]+)"/)?.[1];
    expect(declared).toBeTruthy();
    expect(version?.value).toBe(declared);
  });

  it('refuses to emit for a curriculum file that does not contain the requested grade', () => {
    expect(() =>
      emitDesignPack({ sourceText: '(= (a b) c)\n', sourceLabel: 'x.ts', gradeKey: 'g8', exportName: 'grade8AI' }),
    ).toThrow(/grade8AI/);
  });
});
