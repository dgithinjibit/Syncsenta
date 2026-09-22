# Supabase Database Setup for SyncSenta

This guide will help you set up the database for the Teacher Feedback Loop (self-learning system).

## Quick Setup (5 minutes)

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase project: https://app.supabase.com
2. Click on your project (or create a new one if you don't have one)
3. In the left sidebar, click **SQL Editor**
4. Click **New Query**

### Step 2: Run the Migration

1. Open the file: `ai-agents/src/syncsenta_agents/db/supabase_migration_simple.sql`
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

You should see:
```
✅ Created 6 tables for SyncSenta Teacher Feedback Loop
```

### Step 3: Verify Tables Were Created

Run this query in the SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'ai_decisions',
    'learned_rules',
    'cultural_patterns',
    'teacher_rule_proposals',
    'rule_votes',
    'rule_ab_tests'
  )
ORDER BY table_name;
```

You should see all 6 tables listed.

### Step 4: Get Your Supabase Credentials

1. In Supabase, go to **Settings** → **API**
2. Copy these values:

```bash
Project URL: https://xxxxx.supabase.co
anon/public key: eyJhbGc...
service_role key: eyJhbGc... (keep this secret!)
```

### Step 5: Update Render Environment Variables

1. Go to your Render dashboard: https://dashboard.render.com
2. Find the canonical backend service: `ascendra-1`
3. Go to **Environment** tab
4. Add/update these variables:

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc... (service_role key)
```

5. Click **Save Changes**
6. Render will automatically redeploy

### Step 6: Update Frontend Environment Variables

Update `studio/.env.local`:

```bash
# Supabase (for teacher feedback)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (anon/public key)
```

## What This Creates

### Tables

1. **ai_decisions** - Logs every AI tutoring decision with context and outcomes
2. **learned_rules** - Stores pedagogical rules learned from teacher feedback
3. **cultural_patterns** - Tracks what works in different Kenyan regions
4. **teacher_rule_proposals** - Teachers can propose new rules
5. **rule_votes** - Community voting on proposed rules
6. **rule_ab_tests** - A/B testing results for new rules

### Initial Rules (Seed Data)

The migration includes 3 starter rules:

1. **use_matatu_for_nairobi_ratios** - Use matatu fares for teaching ratios in Nairobi
2. **use_shamba_for_rural_measurement** - Use farm examples for rural students
3. **high_erasure_needs_scaffolding** - Increase help when student erases a lot

### Functions

1. **get_teacher_feedback_summary(teacher_id)** - Get feedback stats for a teacher
2. **get_top_rules(limit)** - Get best-performing pedagogical rules

## Testing the Setup

Run this query to see the initial rules:

```sql
SELECT 
  rule_name,
  rule_description,
  confidence,
  status,
  applicable_regions,
  applicable_grades
FROM learned_rules
WHERE status = 'active';
```

You should see 3 active rules.

## Troubleshooting

### Error: "relation already exists"

This means tables are already created. You can either:
- Skip the migration (tables already exist)
- Drop tables first: `DROP TABLE IF EXISTS ai_decisions, learned_rules, cultural_patterns, teacher_rule_proposals, rule_votes, rule_ab_tests CASCADE;`

### Error: "permission denied"

Make sure you're using the **service_role** key in Render, not the anon key.

### Render still crashing

1. Check Render logs for specific error
2. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set correctly
3. Make sure the URL doesn't have a trailing slash
4. Restart the service manually in Render dashboard

## Next Steps

Once the database is set up:

1. ✅ Backend will stop crashing (no more "failed to lookup address" errors)
2. ✅ AI decisions will be logged to `ai_decisions` table
3. ✅ Teachers can provide feedback through the dashboard
4. ✅ System will learn new rules from feedback patterns
5. ✅ Cultural patterns will be tracked automatically

## Viewing Data

To see AI decisions being logged:

```sql
SELECT 
  decision_id,
  student_id,
  competency,
  ai_action,
  teacher_feedback,
  created_at
FROM ai_decisions
ORDER BY created_at DESC
LIMIT 10;
```

To see teacher feedback:

```sql
SELECT 
  teacher_feedback,
  COUNT(*) as count
FROM ai_decisions
WHERE teacher_feedback IS NOT NULL
GROUP BY teacher_feedback;
```

## Support

If you need help:
- Check Render logs: https://dashboard.render.com
- Check Supabase logs: https://app.supabase.com/project/_/logs
- GitHub Issues: https://github.com/dgithinjibit/Ascendra/issues
