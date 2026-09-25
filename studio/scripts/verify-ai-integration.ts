/**
 * Quick AI/MeTTa Integration Verification Script
 * 
 * Usage: npx tsx studio/scripts/verify-ai-integration.ts
 * 
 * Checks:
 * - Chat API is accessible
 * - MeTTa/Omega decision logic exists
 * - Supabase RLS policies are active
 * - Required environment variables are set
 */

import { createClient } from '@supabase/supabase-js';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function log(emoji: string, message: string, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function success(message: string) {
  log('✓', message, colors.green);
}

function error(message: string) {
  log('✗', message, colors.red);
}

function warning(message: string) {
  log('⚠', message, colors.yellow);
}

function info(message: string) {
  log('ℹ', message, colors.blue);
}

async function verifyEnvironmentVariables(): Promise<boolean> {
  console.log(`\n${colors.bold}=== Environment Variables ===${colors.reset}`);
  
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'GROQ_API_KEY',
  ];

  let allPresent = true;

  for (const varName of required) {
    if (process.env[varName]) {
      success(`${varName} is set`);
    } else {
      error(`${varName} is missing`);
      allPresent = false;
    }
  }

  return allPresent;
}

async function verifySupabaseConnection(): Promise<boolean> {
  console.log(`\n${colors.bold}=== Supabase Connection ===${colors.reset}`);

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Test connection with a simple query
    // NOTE: do not name this `error` — it shadows the console helper below.
    const { error: queryError } = await supabase.from('profiles').select('id').limit(1);

    if (queryError) {
      if (queryError.message.includes('relation') || queryError.message.includes('does not exist')) {
        warning('Profiles table not found (may be expected in new setup)');
        return true;
      }
      error(`Supabase connection error: ${queryError.message}`);
      return false;
    }

    success('Supabase connection working');
    return true;
  } catch (err) {
    error(`Failed to connect to Supabase: ${err}`);
    return false;
  }
}

async function verifyRLSPolicies(): Promise<boolean> {
  console.log(`\n${colors.bold}=== RLS Policies ===${colors.reset}`);

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Try to query learning_progress without auth (should fail or return empty)
    const { data, error } = await supabase
      .from('learning_progress')
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('RLS') || error.message.includes('policy')) {
        success('RLS policies are active (access denied without auth)');
        return true;
      }
      warning(`Unexpected error: ${error.message}`);
      return false;
    }

    if (data && data.length === 0) {
      success('RLS policies enforced (empty result without auth)');
      return true;
    }

    warning('RLS might not be enforced (got data without auth)');
    return false;
  } catch (err) {
    error(`RLS check failed: ${err}`);
    return false;
  }
}

async function verifyOmegaIntegration(): Promise<boolean> {
  console.log(`\n${colors.bold}=== Omega/MeTTa Integration ===${colors.reset}`);

  try {
    // Check if Omega decision function exists
    const fs = await import('fs/promises');
    const path = await import('path');

    const omegaPath = path.join(process.cwd(), 'studio', 'src', 'lib', 'omega-agent', 'metta-core.ts');
    const chatRoutePath = path.join(process.cwd(), 'studio', 'src', 'app', 'api', 'chat', 'route.ts');

    // Check Omega function exists
    try {
      await fs.access(omegaPath);
      success('Omega/MeTTa core module found');
    } catch {
      error('Omega/MeTTa core module not found');
      return false;
    }

    // Check chat route imports Omega
    const chatRouteContent = await fs.readFile(chatRoutePath, 'utf-8');
    if (chatRouteContent.includes('evaluateTutoringDecision')) {
      success('Chat route integrates Omega decision engine');
    } else {
      error('Chat route does not call evaluateTutoringDecision');
      return false;
    }

    // Check for learning state builder
    if (chatRouteContent.includes('buildLearningState')) {
      success('Learning state builder integrated');
    } else {
      warning('Learning state builder not found in chat route');
    }

    return true;
  } catch (err) {
    error(`Omega integration check failed: ${err}`);
    return false;
  }
}

async function verifyChatAPI(): Promise<boolean> {
  console.log(`\n${colors.bold}=== Chat API ===${colors.reset}`);

  try {
    const apiUrl = process.env.TEST_API_URL || 'http://localhost:3000';
    
    info(`Testing ${apiUrl}/api/chat (expecting 401 without auth)`);

    const response = await fetch(`${apiUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Hello',
        history: [],
        grade: 'Grade 4',
        subject: 'Mathematics',
      }),
    });

    if (response.status === 401) {
      success('Chat API rejects unauthenticated requests (correct)');
      return true;
    } else if (response.status === 404) {
      error('Chat API not found (is dev server running?)');
      return false;
    } else {
      warning(`Unexpected status ${response.status} (expected 401)`);
      return false;
    }
  } catch (err) {
    error(`Chat API check failed: ${err}`);
    info('Make sure dev server is running: npm run dev');
    return false;
  }
}

async function verifyDatabaseSchema(): Promise<boolean> {
  console.log(`\n${colors.bold}=== Database Schema ===${colors.reset}`);

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const tables = [
      'learning_progress',
      'chat_sessions',
      'chat_messages',
    ];

    let allExist = true;

    for (const table of tables) {
      const { error: tableError } = await supabase.from(table).select('id').limit(1);
      
      if (tableError) {
        if (tableError.message.includes('does not exist')) {
          error(`Table '${table}' does not exist`);
          allExist = false;
        } else {
          // RLS error or other (table exists but access denied)
          success(`Table '${table}' exists`);
        }
      } else {
        success(`Table '${table}' exists and accessible`);
      }
    }

    return allExist;
  } catch (err) {
    error(`Database schema check failed: ${err}`);
    return false;
  }
}

async function main() {
  console.log(`\n${colors.bold}${colors.blue}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}║   AI/MeTTa Integration Verification                   ║${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}╚═══════════════════════════════════════════════════════╝${colors.reset}`);

  const checks = [
    { name: 'Environment Variables', fn: verifyEnvironmentVariables },
    { name: 'Supabase Connection', fn: verifySupabaseConnection },
    { name: 'Database Schema', fn: verifyDatabaseSchema },
    { name: 'RLS Policies', fn: verifyRLSPolicies },
    { name: 'Omega/MeTTa Integration', fn: verifyOmegaIntegration },
    { name: 'Chat API', fn: verifyChatAPI },
  ];

  const results: Record<string, boolean> = {};

  for (const check of checks) {
    try {
      results[check.name] = await check.fn();
    } catch (err) {
      error(`${check.name} check crashed: ${err}`);
      results[check.name] = false;
    }
  }

  // Summary
  console.log(`\n${colors.bold}=== Summary ===${colors.reset}`);
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  const percentage = Math.round((passed / total) * 100);

  console.log(`\n${colors.bold}Status: ${passed}/${total} checks passed (${percentage}%)${colors.reset}\n`);

  for (const [name, passed] of Object.entries(results)) {
    if (passed) {
      success(name);
    } else {
      error(name);
    }
  }

  if (percentage === 100) {
    console.log(`\n${colors.green}${colors.bold}✓ All checks passed! AI integration is ready.${colors.reset}\n`);
    process.exit(0);
  } else if (percentage >= 70) {
    console.log(`\n${colors.yellow}${colors.bold}⚠ Most checks passed, but some issues found.${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${colors.red}${colors.bold}✗ Multiple checks failed. Review errors above.${colors.reset}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  error(`Verification script crashed: ${err}`);
  process.exit(1);
});
