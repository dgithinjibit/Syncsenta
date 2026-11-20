
-- Add unique constraint on url for upsert support
ALTER TABLE public.scheme_references ADD CONSTRAINT scheme_references_url_unique UNIQUE (url);

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
