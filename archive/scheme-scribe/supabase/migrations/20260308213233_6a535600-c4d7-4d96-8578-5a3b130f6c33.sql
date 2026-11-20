CREATE TABLE public.scheme_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_site TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  grade TEXT,
  subject TEXT,
  strand TEXT,
  term TEXT,
  description TEXT,
  content_snippet TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scheme_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scheme references"
  ON public.scheme_references FOR SELECT
  TO anon, authenticated
  USING (true);
