/**
 * Conflict resolver — takes our (HEAD/ours) side for all 4 merge conflicts.
 *
 * Rules per file:
 *   metta-core.ts       — keep HEAD (clean 90-line engine), discard remote's MeTTa classes
 *   sandbox-activities.ts — keep HEAD (shim), discard remote's full implementation
 *   route.ts (chat)     — keep HEAD imports, discard remote's old/MeTTa imports
 *   student/page.tsx    — keep HEAD import for perf-monitor; ADD remote's getStudentId import
 */

const fs   = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// ─────────────────────────────────────────────────────────────────────────────
// Generic conflict resolver: replaces <<<< ... ==== ... >>>> blocks
// keepSide: 'ours' keeps HEAD, 'theirs' keeps origin/main, 'both' keeps both
// ─────────────────────────────────────────────────────────────────────────────
function resolveConflicts(content, keepSide) {
  // Matches conflict blocks including all whitespace variants
  const re = /<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> origin\/main\r?\n?/g;
  return content.replace(re, function(match, ours, theirs) {
    if (keepSide === 'ours')   return ours + '\n';
    if (keepSide === 'theirs') return theirs + '\n';
    if (keepSide === 'both')   return ours + '\n' + theirs + '\n';
    return ours + '\n'; // default: keep ours
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. metta-core.ts — keep ours
// ─────────────────────────────────────────────────────────────────────────────
{
  const p = path.join(root, 'src/lib/omega-agent/metta-core.ts');
  let c = fs.readFileSync(p, 'utf8');
  c = resolveConflicts(c, 'ours');
  fs.writeFileSync(p, c, 'utf8');
  console.log('RESOLVED (ours): lib/omega-agent/metta-core.ts');
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. sandbox-activities.ts — keep ours (shim)
// ─────────────────────────────────────────────────────────────────────────────
{
  const p = path.join(root, 'src/lib/sandbox-activities.ts');
  let c = fs.readFileSync(p, 'utf8');
  c = resolveConflicts(c, 'ours');
  fs.writeFileSync(p, c, 'utf8');
  console.log('RESOLVED (ours): lib/sandbox-activities.ts');
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. api/chat/route.ts — keep ours (new modular imports + Omega improvements)
// ─────────────────────────────────────────────────────────────────────────────
{
  const p = path.join(root, 'src/app/api/chat/route.ts');
  let c = fs.readFileSync(p, 'utf8');
  c = resolveConflicts(c, 'ours');
  fs.writeFileSync(p, c, 'utf8');
  console.log('RESOLVED (ours): app/api/chat/route.ts');
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. student/page.tsx — keep ours perf-monitor import, ADD getStudentId import
// ─────────────────────────────────────────────────────────────────────────────
{
  const p = path.join(root, 'src/app/student/page.tsx');
  let c = fs.readFileSync(p, 'utf8');

  // This conflict: ours has '@/lib/telemetry/performance-monitor'
  // theirs adds '@/lib/performance-monitor' (old path) + getStudentId import
  // Resolution: keep ours path for perf-monitor, add getStudentId from theirs
  c = resolveConflicts(c, 'ours');

  // Now add the getStudentId import that the remote introduced (it's a new feature)
  // Insert after the perfMonitor import line
  if (!c.includes('getStudentId') && !c.includes('student-id')) {
    c = c.replace(
      "import { perfMonitor, measureAsync } from '@/lib/telemetry/performance-monitor';",
      "import { perfMonitor, measureAsync } from '@/lib/telemetry/performance-monitor';\nimport { getStudentId } from '@/lib/auth/student-id';"
    );
    console.log('  + Added getStudentId import from remote');
  }

  fs.writeFileSync(p, c, 'utf8');
  console.log('RESOLVED (ours + getStudentId): app/student/page.tsx');
}

console.log('\nAll conflicts resolved. Run: git add -u && git commit');
