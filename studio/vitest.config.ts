import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  // `tsconfig.json` keeps `"jsx": "preserve"` because Next owns the JSX transform for the app build. Vite 8
  // transforms with oxc and reads that setting per file, so any `.tsx` import in a test dies with "invalid
  // JS syntax" before an assertion runs. Naming the automatic runtime here overrides it for the test
  // pipeline only; the app build still goes through Next. Vitest 4 ignores `esbuild:` entirely — the
  // startup warning says so.
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});