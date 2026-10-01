/**
 * Teach Node how to read the `studio/src` alias, so the scripts can import the app's modules directly.
 *
 * `studio/` writes imports as `@/lib/...` and lets the bundler resolve them, which is also what vitest does.
 * Node has no idea what `@/` means, so a terminal runner that wants the *same* reconciler — rather than a
 * second implementation of it — has to answer that one question before the first import. That is this file's
 * entire job: `@/x` becomes `studio/src/x`, with the `.ts`/`.tsx` extension the bundler would have added.
 *
 * Imported for its side effect by `scripts/reconcile.mts`, so a reviewer typing `node scripts/reconcile.mts`
 * needs no flags and no `--import`. Hooks are registered synchronously in this thread, which is why the
 * scripts use a dynamic `await import(...)` for anything under `@/` — a static import would be resolved
 * before this module has run.
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'studio', 'src');

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith('@/')) return nextResolve(specifier, context);

    const base = join(SRC_ROOT, specifier.slice(2));
    const found = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')].find((candidate) =>
      existsSync(candidate),
    );
    if (found === undefined) {
      throw new Error(`omega-alias: '${specifier}' has no file behind it (looked under ${SRC_ROOT})`);
    }

    return { url: pathToFileURL(found).href, shortCircuit: true };
  },
});
