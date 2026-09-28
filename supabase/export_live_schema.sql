-- Export the live Supabase schema so the repo can stop guessing.
--
-- Why this file exists: `supabase/migrations/` and
-- `backend/syncsenta-backend/migrations/` together define 93 tables, but code
-- queries 21 tables with no DDL anywhere in the readable repo (point_transactions,
-- learning_progress, teacher_students, chat_messages, …). The live project is the
-- only complete description of the schema, and nothing here can reach it: there is
-- no supabase CLI on the dev laptop, no DB password in the repo, and the five
-- symlinks in supabase/migrations/ point at /home/web4ke/… which exists nowhere.
--
-- How to use it: open the Supabase dashboard → SQL editor → New query, run each
-- numbered statement on its own, then Download result → CSV. Name the files
-- exactly as below and drop them in `supabase/live_schema_export/`. Seven CSVs is
-- enough to reconstruct a faithful baseline migration; nothing here needs a
-- password, a token, or a connection string.
--
-- Read-only. Every statement is a SELECT.

-- 1. columns.csv — every column, its type, nullability and default
select
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.character_maximum_length,
  c.numeric_precision,
  c.datetime_precision,
  c.is_nullable,
  c.column_default,
  c.is_identity,
  c.identity_generation
from information_schema.columns c
where c.table_schema = 'public'
order by c.table_name, c.ordinal_position;

-- 2. constraints.csv — primary keys, foreign keys, checks, unique, verbatim
select
  conrelid::regclass::text          as table_name,
  conname                           as constraint_name,
  contype                           as kind,
  pg_get_constraintdef(oid)         as definition
from pg_constraint
where connamespace = 'public'::regnamespace
order by conrelid::regclass::text, conname;

-- 3. indexes.csv
select
  tablename    as table_name,
  indexname    as index_name,
  indexdef     as definition
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 4. rls.csv — is RLS on, and what exactly does each policy allow?
select
  c.relname                          as table_name,
  c.relrowsecurity                   as rls_enabled,
  c.relforcerowsecurity              as rls_forced,
  p.polname                          as policy_name,
  case p.polcmd
    when 'r' then 'SELECT' when 'a' then 'INSERT' when 'w' then 'UPDATE'
    when 'd' then 'DELETE' when '*' then 'ALL'
  end                                as command,
  p.polpermissive                    as permissive,
  array_to_string(
    (select array_agg(r::regrole::text) from unnest(p.polroles) r), ','
  )                                  as applies_to_roles,
  pg_get_expr(p.polqual, p.polrelid)       as using_expr,
  pg_get_expr(p.polwithcheck, p.polrelid)  as check_expr
from pg_class c
left join pg_policy p on p.polrelid = c.oid
where c.relnamespace = 'public'::regnamespace
  and c.relkind = 'r'
order by c.relname, p.polname;

-- 5. routines.csv — the database functions the studio calls via .rpc()
select
  p.proname                          as function_name,
  pg_get_function_arguments(p.oid)   as arguments,
  pg_get_function_result(p.oid)      as returns,
  l.lanname                          as language,
  p.prosecdef                        as security_definer,
  pg_get_functiondef(p.oid)          as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l  on l.oid = p.prolang
where n.nspname = 'public'
order by p.proname;

-- 6. views.csv
select
  table_name                         as view_name,
  pg_get_viewdef(format('%I.%I', 'public', table_name)::regclass, true) as definition
from information_schema.views
where table_schema = 'public'
order by table_name;

-- 7. enums.csv — label sets, in order, because sqlx maps them by name
select
  t.typname                          as enum_name,
  string_agg(e.enumlabel, ',' order by e.enumsortorder) as labels,
  count(*)                           as label_count
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
group by t.typname
order by t.typname;

-- Optional, but it answers the other half of the question: which migrations has
-- anything ever recorded as applied? Empty result is itself the answer.
-- 8. applied.csv
-- select * from _sqlx_migrations order by version;
-- select id, name, hash, created_at from supabase_migrations.schema_migrations order by version;
