-- Cached exams: one exam per (grade, subject, term) reused across pupils
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  term TEXT NOT NULL,
  questions JSONB NOT NULL,
  total_marks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (grade, subject, term)
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read exams"
  ON public.exams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert exams"
  ON public.exams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their exams"
  ON public.exams FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their exams"
  ON public.exams FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE INDEX idx_exams_lookup ON public.exams (grade, subject, term);

-- Exam attempts: per-pupil, per-take record owned by the signed-in teacher
CREATE TABLE public.exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  pupil_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  term TEXT NOT NULL,
  awarded INTEGER NOT NULL,
  total INTEGER NOT NULL,
  percent INTEGER NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read their attempts"
  ON public.exam_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert attempts"
  ON public.exam_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their attempts"
  ON public.exam_attempts FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE INDEX idx_attempts_owner ON public.exam_attempts (owner_id, created_at DESC);
CREATE INDEX idx_attempts_pupil ON public.exam_attempts (owner_id, pupil_name);