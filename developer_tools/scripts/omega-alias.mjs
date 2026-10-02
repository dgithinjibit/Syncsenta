/**
 * Teach Node how to read the `studio/src` alias, so the scripts can import the app's modules directly.
 *
 * `studio/` writes imports as `@/lib/...` and lets the bundler resolve them, which is also what vitest does.
 * Node has no idea what `@/` means, so a terminal runner that wants the *same* reconciler — rather than a
 * second implementation of it — has to answer that one question before the first import. That is this file's
 * entire job: `@/x` becomes `studio/src/x`, with the `.ts`/`.tsx` extension the bundler would have added.
 *
 * It also answers a second question it did not have to until spoon 5c-4b: a *relative* runtime import inside
 * `studio/src`. `handoff.ts` imports `./ledger`, and Node's ESM resolver refuses an extensionless specifier,
 * so the runner died on `ERR_MODULE_NOT_FOUND` while the browser and vitest were perfectly happy. The app's
 * modules are not the place to fix that — writing `./ledger.ts` is a bundler-hostile import nobody else in
 * `studio/src` uses, and the page must keep resolving through the same specifiers the tests do. The runner is
 * the thing that lacks the bundler's habit, so the runner is where the habit gets added.
 *
 * Imported for its side effect by `scripts/reconcile.mts`, so a reviewer typing `node scripts/reconcile.mts`
 * needs no flags and no `--import`. Hooks are registered synchronously in this thread, which is why the
 * scripts use a dynamic `await import(...)` for anything under `@/` — a static import would be resolved
 * before this module has run.
 */

import { existsSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC_ROOT = join(realpathSync(dirname(fileURLToPath(import.meta.url))), '..', '..', 'studio', 'src');

/** The extension a bundler would have supplied, in the order the app's own imports use. */
function resolveFile(base) {
  return [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')].find((candidate) => existsSync(candidate));
}

/** True for a specifier resolving to a module inside `studio/src`, which is the only place this hook touches. */
function parentInsideSrc(parentURL) {
  if (typeof parentURL !== 'string' || !parentURL.startsWith('file:')) return false;
  return fileURLToPath(parentURL).startsWith(SRC_ROOT);
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const found = resolveFile(join(SRC_ROOT, specifier.slice(2)));
      if (found === undefined) {
        throw new Error(`omega-alias: '${specifier}' has no file behind it (looked under ${SRC_ROOT})`);
      }
      return { url: pathToFileURL(found).href, shortCircuit: true };
    }

    if (specifier.startsWith('.') && parentInsideSrc(context.parentURL)) {
      const found = resolveFile(join(dirname(fileURLToPath(context.parentURL)), specifier));
      // Not a module the app wrote — a package, a JSON file, anything else. Hand it back untouched rather
      // than guessing an extension a real resolver would refuse.
      if (found !== undefined) return { url: pathToFileURL(found).href, shortCircuit: true };
    }

    return nextResolve(specifier, context);
  },
});
