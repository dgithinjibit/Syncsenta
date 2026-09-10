/**
 * lib/ Restructuring Script
 *
 * Moves flat lib/*.ts files into deep module folders and rewrites
 * every import across the codebase to match the new paths.
 *
 * Modules created:
 *   lib/sandbox/     — 10 sandbox-* files
 *   lib/curriculum/  — 7 cbc/grade/term files
 *   lib/chat/        — 5 socratic/chat/subject-session files
 *   lib/progress/    — 5 progress/adaptive files
 *   lib/session/     — 3 session/rate-limit files
 *   lib/teacher/     — 5 teacher/scheme/realtime files
 *   lib/telemetry/   — 4 analytics/observability files
 *
 * Each folder gets an index.ts that re-exports everything public.
 *
 * Run from repo root:
 *   node studio/scripts/restructure-lib.js
 *
 * Safe to re-run: skips moves if destination already exists.
 */

const fs   = require('fs');
const path = require('path');

const SRC  = path.resolve(__dirname, '../src');
const LIB  = path.join(SRC, 'lib');

// ─────────────────────────────────────────────────────────────────────────────
// Module definitions
// Each entry: { folder, files[], extraRelativeFixup }
// extraRelativeFixup: relative imports inside the file that point to sibling
//   lib files that are NOT moving into the same folder, so need depth fix.
// ─────────────────────────────────────────────────────────────────────────────

const MODULES = [
  {
    folder: 'sandbox',
    files: [
      'sandbox-activities.ts',
      'sandbox-types.ts',
      'sandbox-geometry.ts',
      'sandbox-media.ts',
      'sandbox-artifact-queue.ts',
      'sandbox-artifact-runner.ts',
      'sandbox-artifact-worker.ts',
      'sandbox-submission.ts',
      'sandbox-personalization.ts',
      'sandbox-provider-runtime.ts',
      'sandbox-provider.ts',
    ],
  },
  {
    folder: 'curriculum',
    files: [
      'cbc-curriculum.ts',
      'curriculum-activities-mapper.ts',
      'grade-id.ts',
      'grade1Competencies.ts',
      'learning-paths.ts',
      'term-utils.ts',
      'grade-greetings.ts',
    ],
  },
  {
    folder: 'chat',
    files: [
      'socratic-prompts.ts',
      'chat-history-supabase.ts',
      'socratic-history.ts',
      'subject-session.ts',
      'homework-help.ts',
    ],
  },
  {
    folder: 'progress',
    files: [
      'progress-tracking.ts',
      'adaptive-difficulty.ts',
      'adaptive-question-bridge.ts',
      'intervention-detector.ts',
      'student-learning-loop.ts',
    ],
  },
  {
    folder: 'session',
    files: [
      'session-persistence.ts',
      'session-manager.ts',
      'rate-limit-upstash.ts',
    ],
  },
  {
    folder: 'teacher',
    files: [
      'teacher-dashboard.ts',
      'scheme-loader.ts',
      'scheme-context-client.ts',
      'scheme-v2-client.ts',
      'realtime-feedback.ts',
      'teacher-reflection-evidence.ts',
    ],
  },
  {
    folder: 'telemetry',
    files: [
      'analytics.ts',
      'observability.ts',
      'agentTrace.ts',
      'performance-monitor.ts',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Build lookup: filename → new module folder
// ─────────────────────────────────────────────────────────────────────────────

const fileToModule = {};   // 'sandbox-activities.ts' → 'sandbox'
const moduleFiles  = {};   // 'sandbox' → ['sandbox-activities.ts', ...]

for (const mod of MODULES) {
  moduleFiles[mod.folder] = mod.files;
  for (const f of mod.files) {
    fileToModule[f] = mod.folder;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Create directories and move files
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Step 1: Moving files ──────────────────────────────────────');

for (const mod of MODULES) {
  const destDir = path.join(LIB, mod.folder);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  for (const file of mod.files) {
    const src  = path.join(LIB, file);
    const dest = path.join(destDir, file);

    if (!fs.existsSync(src)) {
      console.log(`  SKIP (not found): lib/${file}`);
      continue;
    }
    if (fs.existsSync(dest)) {
      console.log(`  SKIP (exists):    lib/${mod.folder}/${file}`);
      continue;
    }

    fs.renameSync(src, dest);
    console.log(`  MOVED: lib/${file}  →  lib/${mod.folder}/${file}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Fix relative imports inside moved files
//
// Files that moved into lib/<folder>/ used to sit at lib/ level.
// Their relative imports need one extra "../" for:
//   './supabase/...'  → '../supabase/...'
//   './other-sibling' → '../other-sibling'  (if that sibling didn't move)
//
// Also: cross-references between files in DIFFERENT new modules:
//   sandbox-activities imports curriculum-activities-mapper → was './curriculum-activities-mapper'
//   now both moved, so it becomes '../curriculum/curriculum-activities-mapper'
//
// And: files in the SAME new module:
//   sandbox-activities imports sandbox-types → was './sandbox-types'
//   now both in lib/sandbox/ → stays './sandbox-types'
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Step 2: Fixing internal relative imports ─────────────────');

for (const mod of MODULES) {
  const destDir = path.join(LIB, mod.folder);

  for (const file of mod.files) {
    const filePath = path.join(destDir, file);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf8');
    let changed  = false;

    // Match all import/export ... from '...' or "..."
    content = content.replace(
      /(from\s+['"])(\.\/[^'"]+)(['"'])/g,
      (match, prefix, importPath, suffix) => {
        // importPath starts with './'
        const imported = importPath.slice(2); // strip './'

        // Is it importing a file that moved into the SAME module?
        const sameModFile = mod.files.find(
          f => f === imported + '.ts' || f === imported + '.tsx' || f === imported
        );
        if (sameModFile) {
          // stays './<file>' — no change needed (same directory)
          return match;
        }

        // Is it importing a file that moved into a DIFFERENT module?
        const tsFile  = imported + '.ts';
        const tsxFile = imported + '.tsx';
        const movedTo = fileToModule[tsFile] || fileToModule[tsxFile] || fileToModule[imported];
        if (movedTo) {
          changed = true;
          const newImport = `../${movedTo}/${imported}`;
          console.log(`  ${file}: '${importPath}' → '${newImport}'`);
          return `${prefix}${newImport}${suffix}`;
        }

        // It's a relative import to something that stayed in lib/ (e.g. './supabase/client')
        // or a deeper path. Needs one extra '../'
        if (importPath.startsWith('./supabase') || importPath.startsWith('./auth') ||
            importPath.startsWith('./types') || importPath.startsWith('./utils')) {
          changed = true;
          const newImport = '.' + importPath; // './supabase/...' → '../supabase/...'
          console.log(`  ${file}: '${importPath}' → '${newImport}'`);
          return `${prefix}${newImport}${suffix}`;
        }

        // Catch-all: any remaining './' that references lib/ root — add extra dot
        // Only trigger if the target doesn't look like a full module path
        if (!importPath.includes('/lib/') && !importPath.startsWith('./lib')) {
          // Check if it references something that stayed at lib/ root
          const basename = imported.split('/')[0];
          if (!fileToModule[basename + '.ts']) {
            changed = true;
            const newImport = '.' + importPath;
            console.log(`  ${file}: '${importPath}' → '${newImport}'`);
            return `${prefix}${newImport}${suffix}`;
          }
        }

        return match;
      }
    );

    if (changed) fs.writeFileSync(filePath, content, 'utf8');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Write index.ts barrel files
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Step 3: Writing index.ts barrel files ────────────────────');

for (const mod of MODULES) {
  const indexPath = path.join(LIB, mod.folder, 'index.ts');
  if (fs.existsSync(indexPath)) {
    console.log(`  SKIP (exists): lib/${mod.folder}/index.ts`);
    continue;
  }

  const lines = [
    `/**`,
    ` * ${mod.folder.charAt(0).toUpperCase() + mod.folder.slice(1)} module`,
    ` * Public interface — import from '@/lib/${mod.folder}' not from individual files.`,
    ` */`,
    ``,
  ];

  for (const file of mod.files) {
    const filePath = path.join(LIB, mod.folder, file);
    if (!fs.existsSync(filePath)) continue;
    const stem = file.replace(/\.tsx?$/, '');
    lines.push(`export * from './${stem}';`);
  }

  fs.writeFileSync(indexPath, lines.join('\n') + '\n', 'utf8');
  console.log(`  WROTE: lib/${mod.folder}/index.ts`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Rewrite all @/lib/<filename> imports across the codebase
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Step 4: Rewriting @/lib imports across codebase ──────────');

function walk(dir, out) {
  out = out || [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // Skip node_modules, .next, archive
      if (['node_modules','.next','archive','.git'].includes(e.name)) return;
      walk(full, out);
    } else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) {
      out.push(full);
    }
  });
  return out;
}

// Build the rewrite map: '@/lib/<stem>' → '@/lib/<module>/<stem>'
// We also add bare stem rewrites for relative imports at lib/ root depth
const rewrites = {};
for (const mod of MODULES) {
  for (const file of mod.files) {
    const stem = file.replace(/\.tsx?$/, '');
    rewrites[`@/lib/${stem}`] = `@/lib/${mod.folder}/${stem}`;
  }
}

const allFiles = walk(SRC);
let totalFilesChanged = 0;
let totalReplacements = 0;

for (const filePath of allFiles) {
  // Don't rewrite files inside lib/<module>/ themselves (Step 2 handled those)
  const relToLib = path.relative(LIB, filePath);
  const isInsideNewModule = MODULES.some(m => relToLib.startsWith(m.folder + path.sep));
  if (isInsideNewModule) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  let changed  = false;

  for (const [oldPath, newPath] of Object.entries(rewrites)) {
    // Match both single and double quotes, with optional named/default import
    // Pattern: from '@/lib/subject-session' → from '@/lib/chat/subject-session'
    // Also handles: from "@/lib/subject-session"
    const escaped = oldPath.replace(/[/\-]/g, s => s === '/' ? '/' : '\\' + s);
    const re = new RegExp(`(['"])${escaped}(['"])`, 'g');

    if (re.test(content)) {
      content = content.replace(re, (m, q1, q2) => `${q1}${newPath}${q2}`);
      changed = true;
      totalReplacements++;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    const rel = filePath.replace(SRC + path.sep, '').replace(/\\/g, '/');
    console.log(`  UPDATED: ${rel}`);
    totalFilesChanged++;
  }
}

console.log(`\n  Total files updated: ${totalFilesChanged}`);
console.log(`  Total import rewrites: ${totalReplacements}`);

// ─────────────────────────────────────────────────────────────────────────────
// Step 5 — Write backwards-compat shims at old lib/ paths
//
// Any file outside src/ (e.g. tests, scripts) that uses the old path gets
// a one-liner re-export shim so nothing breaks until callers are updated.
// These shims are intentionally thin — just re-exports.
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Step 5: Writing backwards-compat shims ───────────────────');

for (const mod of MODULES) {
  for (const file of mod.files) {
    const shimPath = path.join(LIB, file);
    if (fs.existsSync(shimPath)) {
      console.log(`  SKIP (file still exists — move may have failed): ${file}`);
      continue;
    }
    const stem = file.replace(/\.tsx?$/, '');
    const shim = `// @deprecated — import from '@/lib/${mod.folder}' instead\nexport * from './${mod.folder}/${stem}';\n`;
    fs.writeFileSync(shimPath, shim, 'utf8');
    console.log(`  SHIM: lib/${file}`);
  }
}

console.log('\n── Done ──────────────────────────────────────────────────────');
console.log('Next steps:');
console.log('  1. Run: npx vitest run');
console.log('  2. Once tests pass, shims in lib/*.ts can be deleted in a follow-up PR.');
