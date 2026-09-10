/**
 * Import Audit Script
 * Maps which files in studio/src import from each lib file being reorganised.
 * Run: node studio/scripts/audit-imports.js
 */

const fs   = require('fs');
const path = require('path');

const patterns = [
  // sandbox
  'sandbox-activities','sandbox-types','sandbox-geometry','sandbox-media',
  'sandbox-artifact-queue','sandbox-artifact-runner','sandbox-artifact-worker',
  'sandbox-submission','sandbox-personalization','sandbox-provider-runtime','sandbox-provider',
  // chat
  'socratic-prompts','chat-history-supabase','socratic-history','subject-session','homework-help',
  // progress
  'progress-tracking','adaptive-difficulty','adaptive-question-bridge',
  'intervention-detector','student-learning-loop',
  // session
  'session-persistence','session-manager','rate-limit-upstash',
  // teacher
  'teacher-dashboard','scheme-loader','scheme-context-client','scheme-v2-client','realtime-feedback',
  // telemetry
  'analytics','observability','agentTrace','performance-monitor',
  // curriculum
  'cbc-curriculum','curriculum-activities-mapper','grade-id','grade1Competencies',
  'learning-paths','term-utils','grade-greetings',
];

const root = path.resolve(__dirname, '../src');

function walk(dir, out) {
  out = out || [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function(e) {
    var full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full, out); }
    else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) { out.push(full); }
  });
  return out;
}

var allFiles = walk(root);

patterns.forEach(function(p) {
  var importers = allFiles.filter(function(f) {
    return fs.readFileSync(f, 'utf8').indexOf(p) !== -1;
  }).map(function(f) {
    return f.replace(root + path.sep, '').replace(/\\/g, '/');
  });
  if (importers.length > 0) {
    console.log('\n[' + p + '] (' + importers.length + ')');
    importers.forEach(function(f) { console.log('  ' + f); });
  }
});
