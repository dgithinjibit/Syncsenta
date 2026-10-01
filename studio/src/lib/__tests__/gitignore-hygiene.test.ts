import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

/**
 * Static assets that git refuses to carry are static assets Vercel never serves.
 *
 * This repo grew out of a create-next-app `.gitignore` that ignored a bare `public` for Gatsby's build output.
 * There is no Gatsby site here, but the rule was live the whole time: `studio/public/` already held 124 tracked
 * files, so nothing appeared wrong until a *new* file was added — `git add` said the path was ignored, and
 * `git status --ignored` showed the directory with a `!!`. That is how a service worker or a MeTTa pack ends up
 * present on a laptop and absent in production, which is the built-but-unreachable anti-pattern §6 of the
 * roadmap already counts three instances of, arriving from a direction nobody was watching.
 *
 * So the gate is the boring one: for each path the browser has to be able to fetch, prove git will take it.
 */

const REPO = join(process.cwd(), '..');

/** Paths the deployed app must serve, or a CI checkout must contain, and which therefore must be committable. */
const MUST_BE_COMMITTABLE = [
  'studio/public/sw.js',
  'studio/public/manifest.json',
  'studio/public/omega/ai_g8_design.metta',
  'studio/public/omega/scheme_check.metta',
  'studio/src/lib/attest/derive.ts',
  // The reconciler suite asserts a whole scheme's defects from this one file; ignored, it is present on the
  // laptop that wrote it and the suite passes there while CI has nothing to read.
  'studio/public/omega/drafts/kibera_g8_week14.json',
  // `vercel link` appends a blanket `.env*` to `.gitignore` when it writes `.env.local`, which would also
  // swallow every env *template* — the file a new developer needs most, and the one nobody notices is
  // missing from a checkout. The repository's own `.env*` line is negated for `*.example`; these six paths
  // are what proves that negation is still standing.
  'studio/.env.example',
  'studio/.env.cbc-agent.example',
  '.env.example',
  'ai-agents/.env.example',
  'rust-service/.env.example',
  'scheme-scribe/.env.example',
];

/**
 * One `git` process for the whole list, not one per assertion, and asked with `--no-index`.
 *
 * **The spawn cost.** Each `it` used to spawn `git check-ignore` by itself: six processes, each paying for a
 * fresh look at the ignore stack, and under a full-suite run on this 3.7 GB machine the first one went past
 * vitest's 5 s default and the file was reported failed by timeout, not by a rule. A guard that trips because
 * the laptop was busy is worse than no guard — the next green run gets ignored, and the real defect hides
 * among the noise. `--stdin` asks the same question of every path in one process, and git prints a line only
 * for the paths that *are* ignored, so "this path is not in the output" is the assertion that was here
 * before, at a seventh of the time (5.9 s → 13 ms).
 *
 * **`--no-index`, which is the part that changes what the guard proves.** Without it git refuses to call a
 * tracked path ignored, so every file in the list below — tracked since long before the rule was noticed —
 * answers "not ignored" *even with the bare `public` rule back in `.gitignore`*. Verified by putting it back
 * and watching the old form stay green. That means the version of this file that caught the defect in the
 * paragraph above could not have caught it while the files were already tracked; it only worked because the
 * check ran on the day a new file was being added. `--no-index` asks the pattern layer directly, which is the
 * question the guard was always meant to answer: would a *new* file at this path be swallowed?
 */
function rulesFor(paths: readonly string[]): Map<string, string> {
  const result = spawnSync('git', ['check-ignore', '--stdin', '-v', '--no-index'], {
    cwd: REPO,
    input: `${paths.join('\n')}\n`,
    encoding: 'utf8',
  });
  // 0 means at least one path matched, 1 means none did. Anything else is git failing to answer, and an
  // unanswered guard has to say so rather than report every path clean.
  if (result.error !== undefined || !([0, 1].includes(result.status ?? -1))) {
    throw new Error(`gitignore-hygiene: git check-ignore did not answer (${result.status}): ${result.stderr}`);
  }
  const matched = new Map<string, string>();
  for (const line of result.stdout.split('\n')) {
    // `-v` prints `<source>:<line>:<pattern>\t<pathname>` — and it prints that line for a *negating* pattern
    // too, which is not an ignore. Splitting on the tab and reading the pattern field is the only way to tell
    // "this path matches a rule" apart from "this path is un-matched by a rule", and the difference is the
    // whole guard: a `.env*` line with a `!.env*.example` under it must not report every template as ignored.
    const tab = line.lastIndexOf('\t');
    if (tab === -1) continue;
    const rule = line.slice(0, tab);
    const path = line.slice(tab + 1);
    if (rule.slice(rule.lastIndexOf(':') + 1).startsWith('!')) continue;
    matched.set(path, rule);
  }
  return matched;
}

const ALL_CHECKED = [...MUST_BE_COMMITTABLE, 'studio/public'];
const IGNORED = rulesFor(ALL_CHECKED);

describe('nothing that ships to a browser is git-ignored', () => {
  for (const path of MUST_BE_COMMITTABLE) {
    it(`${path} is not ignored`, () => {
      expect(IGNORED.get(path) ?? null, `${path} matches an ignore rule`).toBeNull();
    });
  }

  it('the static root itself is open, so the rule cannot come back as a directory match', () => {
    // `public` alone was the defect: it matches any directory of that name at any depth, including the Next.js
    // app's own static root. Checking the directory, not just the files in it, is what catches a reintroduction.
    expect(IGNORED.get('studio/public') ?? null, 'studio/public is ignored').toBeNull();
  });
});

