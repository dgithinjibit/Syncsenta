-- ============================================================================
-- VERIFICATION SCRIPT: Check if training data export migration is applied
-- Run this in Supabase SQL Editor to verify the fix
-- ============================================================================

-- Check 1: Verify columns exist in schemes table
SELECT 
  '✅ Schemes table columns' as check_name,
  COUNT(*) as found_columns,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ PASS - All 4 columns exist'
    ELSE '❌ FAIL - Missing columns'
  END as status
FROM information_schema.columns 
WHERE table_name = 'schemes' 
AND column_name IN ('exported_at', 'storage_path', 'is_training_data', 'export_format');

-- Check 2: Verify indexes exist
SELECT 
  '✅ Indexes' as check_name,
  COUNT(*) as found_indexes,
  CASE 
    WHEN COUNT(*) >= 2 THEN '✅ PASS - Indexes created'
    ELSE '❌ FAIL - Missing indexes'
  END as status
FROM pg_indexes 
WHERE tablename = 'schemes' 
AND indexname IN ('idx_schemes_training_data', 'idx_schemes_storage_path');

-- Check 3: Verify training_exports table exists
SELECT 
  '✅ Training exports table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'training_exports'
    ) THEN 1
    ELSE 0
  END as found_tables,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'training_exports'
    ) THEN '✅ PASS - Table exists'
    ELSE '⚠️  OPTIONAL - Full migration not applied (only quick fix)'
  END as status;

-- Check 4: Verify functions exist
SELECT 
  '✅ Helper functions' as check_name,
  COUNT(*) as found_functions,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ PASS - All functions exist'
    ELSE '⚠️  OPTIONAL - Full migration not applied (only quick fix)'
  END as status
FROM information_schema.routines 
WHERE routine_name IN (
  'mark_scheme_as_training_data',
  'get_training_data_stats',
  'get_exportable_schemes'
);

-- Detailed column information
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'schemes' 
AND column_name IN ('exported_at', 'storage_path', 'is_training_data', 'export_format')
ORDER BY column_name;

-- Summary
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns 
  WHERE table_name = 'schemes' 
  AND column_name IN ('exported_at', 'storage_path', 'is_training_data', 'export_format');
  
  IF col_count = 4 THEN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ SUCCESS! Migration applied correctly';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Your export feature should now work!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test the export feature in your frontend';
    RAISE NOTICE '2. If still getting PGRST204, refresh schema cache:';
    RAISE NOTICE '   NOTIFY pgrst, ''reload schema'';';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '❌ MIGRATION NOT APPLIED';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Found % out of 4 required columns', col_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Please run: quick_fix_migration.sql';
    RAISE NOTICE 'Or the full migration: 20260522000002_training_data_export.sql';
    RAISE NOTICE '';
  END IF;
END $$;
