/**
 * Generate a MeTTa design pack from the KICD-shaped curriculum module.
 *
 * Why this exists rather than a hand-written pack: `senior-school/ai.ts` is already the single source for what
 * a Grade 8 AI course contains (16 sub-strands, their lesson counts, their key inquiry questions). A second,
 * typed-out copy of that list would be a second decision-maker, and the reconciler would then be able to
 * refuse a valid scheme row because somebody updated one file and not the other. So the pack is derived, the
 * derivation is committed, and `ai-design-pack.test.ts` fails if the committed bytes no longer match what this
 * function produces from the current curriculum.
 *
 * Why a generated *file* is acceptable when a generated *decision engine* would not be: it is the same shape as
 * the drift lock around `omega_claw_rules.metta` — one authority, one rendering, and an alarm between them. Each
 * row also carries the `ai.ts` line it was read from, so a refusal can point at the curriculum rather than at a
 * generated artifact nobody can check.
 *
 * The output is one statement per line because that is what makes `file:line` citations possible
 * (`attest/derive.ts` explains the trade-off), and it fails loudly on a row it cannot understand instead of
 * skipping it — the silent-skip class of bug that `derive.ts` itself just had to fix.
 */

/** Header comment for a generated pack, naming the only file that may be edited by hand. */
const GENERATOR_NOTE = 'scripts/generate-ai-design-pack.mts';

export interface DesignPackRequest {
  /** The full text of `studio/src/data/curriculum/senior-school/ai.ts`. */
  readonly sourceText: string;
  /** The path printed in every `ai-design-origin` value, repo-relative so it is openable. */
  readonly sourceLabel: string;
  /** Canonical pack key for the grade, e.g. `g8`. */
  readonly gradeKey: string;
  /** The exported const to read, e.g. `grade8AI`. */
  readonly exportName: string;
}

interface ParsedSubStrand {
  /** KICD-style id, e.g. `2.1`. */
  readonly id: string;
  readonly name: string;
  readonly strand: string;
  readonly lessons: number;
  readonly inquiry: string;
  /** 1-based line in the source file the `ss(…)` call starts on. */
  readonly line: number;
}

export class DesignPackSourceError extends Error {
  constructor(reason: string) {
    super(`cannot generate a design pack: ${reason}`);
    this.name = 'DesignPackSourceError';
  }
}

/**
 * The five strand names, read from the `STRAND_NAMES` block only. Scoping the read to that array keeps a
 * similarly-shaped string anywhere else in a 1,141-line file from becoming curriculum structure.
 */
function readStrandNames(sourceLines: readonly string[]): Map<string, string> {
  const names = new Map<string, string>();
  const start = sourceLines.findIndex((line) => line.startsWith('const STRAND_NAMES'));
  if (start === -1) {
    throw new DesignPackSourceError('STRAND_NAMES is missing, so a strand could not be named');
  }
  for (let i = start + 1; i < sourceLines.length; i += 1) {
    if (/^\]/.test(sourceLines[i])) break;
    const match = sourceLines[i].match(/^\s*"(\d+\.0)\s+(.+)",?\s*$/);
    if (match) names.set(match[1], match[2]);
  }
  if (names.size === 0) {
    throw new DesignPackSourceError('STRAND_NAMES is empty, so a strand could not be named');
  }
  return names;
}

/**
 * The `ss("2.1 …", 5, "…", [ … ], [ … ])` calls inside one grade's `build([ … ])` block, in file order.
 *
 * Line-oriented on purpose, matching the shape the curriculum file is actually written in, and stopping at the
 * block's closing bracket so a later grade's rows cannot leak into this one.
 */
function readSubStrands(request: DesignPackRequest): ParsedSubStrand[] {
  const lines = request.sourceText.split('\n');
  const start = lines.findIndex((line) => line.startsWith(`export const ${request.exportName}`));
  if (start === -1) {
    throw new DesignPackSourceError(`${request.exportName} is not exported in ${request.sourceLabel}`);
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\]\)?\);?$/.test(lines[i])) {
      end = i;
      break;
    }
  }

  const found: ParsedSubStrand[] = [];
  for (let i = start + 1; i < end; i += 1) {
    const raw = lines[i];
    if (!/^\s*ss\(/.test(raw)) continue;
    const call = raw.match(/^\s*ss\(\s*"([^"]*)",\s*(\d+),\s*"([^"]*)",\s*\[/);
    if (!call) {
      throw new DesignPackSourceError(
        `${request.sourceLabel}:${i + 1} is an ss(…) call this generator cannot read: ${raw.trim().slice(0, 80)}`,
      );
    }
    const [, title, lessonsRaw, inquiry] = call;
    const idMatch = title.match(/^(\d+)\.(\d+)\s+(.*)$/);
    if (!idMatch) {
      throw new DesignPackSourceError(
        `${request.sourceLabel}:${i + 1} has a sub-strand title with no KICD id: "${title}"`,
      );
    }
    found.push({
      id: `${idMatch[1]}.${idMatch[2]}`,
      name: idMatch[3],
      strand: `${idMatch[1]}.0`,
      lessons: Number(lessonsRaw),
      inquiry,
      line: i + 1,
    });
  }

  if (found.length === 0) {
    throw new DesignPackSourceError(`${request.exportName} contains no sub-strands`);
  }
  return found;
}

function quote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * The pack text. Rows are grouped by strand so a reader scrolling the file sees the same structure the curriculum
 * states, and every row is one statement on one line so the derivation engine can cite it.
 */
export function emitDesignPack(request: DesignPackRequest): string {
  const subStrands = readSubStrands(request);
  const lines = request.sourceText.split('\n');
  const strands = readStrandNames(lines);

  const version = request.sourceText.match(/AI_LITERACY_VERSION\s*=\s*"([^"]+)"/)?.[1];
  if (!version) {
    throw new DesignPackSourceError('AI_LITERACY_VERSION is missing, so this pack could not state what it describes');
  }

  const grade = request.gradeKey;
  const out: string[] = [
    ';; GENERATED — DO NOT EDIT BY HAND.',
    `;; Derived from ${request.sourceLabel} (export ${request.exportName}) by ${GENERATOR_NOTE}.`,
    ';; The curriculum module is the authority; this file is a rendering of it, and the test that',
    ';; regenerates it fails if the two disagree. Every ai-design-origin row names the source line.',
    '',
    `(= (ai-design-curriculum-version ${grade}) ${quote(version)})`,
    `(= (ai-design-learning-area ${grade}) ${quote('Artificial Intelligence')})`,
    '',
  ];

  for (const [strand, name] of strands) {
    out.push(`(= (ai-design-strand-name ${strand}) ${quote(name)})`);
  }
  out.push('');

  let currentStrand = '';
  for (const sub of subStrands) {
    if (sub.strand !== currentStrand) {
      currentStrand = sub.strand;
      out.push(`;; ${currentStrand} ${strands.get(currentStrand) ?? ''}`.trimEnd());
    }
    out.push(`(= (ai-design-name ${grade} ${sub.id}) ${quote(sub.name)})`);
    out.push(`(= (ai-design-strand ${grade} ${sub.id}) ${sub.strand})`);
    out.push(`(= (ai-design-lessons ${grade} ${sub.id}) ${sub.lessons})`);
    out.push(`(= (ai-design-inquiry ${grade} ${sub.id}) ${quote(sub.inquiry)})`);
    out.push(`(= (ai-design-origin ${grade} ${sub.id}) ${quote(`${request.sourceLabel}:${sub.line}`)})`);
  }

  out.push('');
  return out.join('\n');
}
