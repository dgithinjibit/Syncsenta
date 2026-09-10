#!/usr/bin/env node
/**
 * CI: Omega Threshold Sync Check
 *
 * Verifies that the TypeScript Omega decision thresholds in
 *   studio/src/lib/omega-agent/metta-core.ts  (OMEGA_THRESHOLDS)
 * are exactly equal to the Rust source of truth in
 *   rust-core/src/agent_runtime.rs  (decide_tutoring)
 *
 * Runs without any build step — parses the Rust source with regex
 * and reads the TS thresholds directly from the exported constant.
 *
 * Exit codes:
 *   0  All thresholds match
 *   1  At least one threshold has drifted — CI should fail
 *
 * Usage:
 *   node studio/scripts/check-omega-thresholds.mjs
 *   # or from studio/:
 *   node scripts/check-omega-thresholds.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
// Paths (relative to this script's location)
// ─────────────────────────────────────────────────────────────────────────────

const RUST_FILE = resolve(__dirname, '../../rust-core/src/agent_runtime.rs');
const TS_FILE   = resolve(__dirname, '../src/lib/omega-agent/metta-core.ts');

// ─────────────────────────────────────────────────────────────────────────────
// Extract Rust thresholds
// ─────────────────────────────────────────────────────────────────────────────

function extractRustThresholds(source) {
  /**
   * Matches decide_tutoring body. We look for:
   *   hints_used >= N   → INTENSIVE_HINTS_MIN
   *   mastery_percent() < N  (first occurrence) → INTENSIVE_MASTERY_MAX
   *   mastery_percent() < N  (second occurrence) → GUIDED_MASTERY_MAX
   */
  const hintsMatch    = source.match(/hints_used\s*>=\s*(\d+)/);
  const masteryAll    = [...source.matchAll(/mastery_percent\(\)\s*<\s*(\d+)/g)];

  if (!hintsMatch)         throw new Error('Could not find hints_used >= N in Rust source');
  if (masteryAll.length < 2) throw new Error('Expected 2 mastery_percent() < N comparisons in Rust source');

  return {
    INTENSIVE_HINTS_MIN:  Number(hintsMatch[1]),
    INTENSIVE_MASTERY_MAX: Number(masteryAll[0][1]),
    GUIDED_MASTERY_MAX:    Number(masteryAll[1][1]),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Extract TS thresholds
// ─────────────────────────────────────────────────────────────────────────────

function extractTsThresholds(source) {
  /**
   * Matches the OMEGA_THRESHOLDS object literal in metta-core.ts.
   * Looks for key: value pairs inside the const block.
   */
  const blockMatch = source.match(/OMEGA_THRESHOLDS\s*=\s*\{([^}]+)\}/s);
  if (!blockMatch) throw new Error('Could not find OMEGA_THRESHOLDS constant in TS source');

  const block = blockMatch[1];
  const thresholds = {};

  for (const line of block.split('\n')) {
    const kv = line.match(/(\w+)\s*:\s*(\d+)/);
    if (kv) {
      thresholds[kv[1]] = Number(kv[2]);
    }
  }

  const required = ['INTENSIVE_MASTERY_MAX', 'GUIDED_MASTERY_MAX', 'INTENSIVE_HINTS_MIN'];
  for (const key of required) {
    if (!(key in thresholds)) {
      throw new Error(`Missing key ${key} in OMEGA_THRESHOLDS`);
    }
  }

  return thresholds;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

let exitCode = 0;

try {
  console.log('\n🔍 Omega Threshold Sync Check');
  console.log('─'.repeat(50));

  const rustSource = readFileSync(RUST_FILE, 'utf8');
  const tsSource   = readFileSync(TS_FILE,   'utf8');

  const rustThresholds = extractRustThresholds(rustSource);
  const tsThresholds   = extractTsThresholds(tsSource);

  console.log('\nRust thresholds (source of truth):');
  for (const [k, v] of Object.entries(rustThresholds)) {
    console.log(`  ${k.padEnd(24)} = ${v}`);
  }

  console.log('\nTypeScript thresholds (OMEGA_THRESHOLDS):');
  for (const [k, v] of Object.entries(tsThresholds)) {
    console.log(`  ${k.padEnd(24)} = ${v}`);
  }

  console.log('\nComparison:');
  const keys = Object.keys(rustThresholds);
  let allMatch = true;

  for (const key of keys) {
    const rust = rustThresholds[key];
    const ts   = tsThresholds[key];
    const match = rust === ts;

    const icon = match ? '✅' : '❌';
    console.log(`  ${icon} ${key.padEnd(24)}: Rust=${rust} TS=${ts}${match ? '' : ' ← MISMATCH'}`);

    if (!match) {
      allMatch = false;
      exitCode = 1;
    }
  }

  if (allMatch) {
    console.log('\n✅ All thresholds match. Omega TS and Rust are in sync.\n');
  } else {
    console.error('\n❌ THRESHOLD MISMATCH DETECTED');
    console.error('   Update OMEGA_THRESHOLDS in studio/src/lib/omega-agent/metta-core.ts');
    console.error('   to match rust-core/src/agent_runtime.rs decide_tutoring()\n');
  }
} catch (err) {
  console.error('\n❌ Threshold check failed with error:');
  console.error('  ', err.message);
  exitCode = 1;
}

process.exit(exitCode);
