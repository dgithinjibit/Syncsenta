CREATE TABLE public.teacher_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  resource_type text NOT NULL CHECK (
    resource_type IN (
      'Lesson Plan',
      'Scheme of Work',
      'Rubric',
      'Worksheet',
      'Differentiated Worksheet',
      'AI Tutor Context',
      'Other'
    )
  ),
  content text NOT NULL CHECK (
    char_length(btrim(content)) > 0 AND octet_length(content) <= 1000000
  ),
  grade text CHECK (grade IS NULL OR char_length(grade) <= 40),
  subject text CHECK (subject IS NULL OR char_length(subject) <= 100),
  join_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_resources_join_code_unique UNIQUE (join_code)
);

CREATE INDEX teacher_resources_teacher_created_idx
  ON public.teacher_resources (teacher_id, created_at DESC);

ALTER TABLE public.teacher_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_resources FORCE ROW LEVEL SECURITY;

CREATE POLICY teacher_resources_select_own
  ON public.teacher_resources
  FOR SELECT
  TO authenticated
  USING (
    teacher_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'teacher'
    )
  );

CREATE POLICY teacher_resources_insert_own
  ON public.teacher_resources
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'teacher'
    )
  );

CREATE POLICY teacher_resources_delete_own
  ON public.teacher_resources
  FOR DELETE
  TO authenticated
  USING (
    teacher_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'teacher'
    )
  );

GRANT SELECT, INSERT, DELETE ON public.teacher_resources TO authenticated;
REVOKE ALL ON public.teacher_resources FROM anon;
