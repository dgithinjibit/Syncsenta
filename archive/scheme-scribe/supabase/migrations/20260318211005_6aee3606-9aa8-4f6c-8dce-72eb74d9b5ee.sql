CREATE TABLE public.scheme_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id uuid REFERENCES public.generated_resources(id) ON DELETE SET NULL,
  grade text NOT NULL,
  subject text NOT NULL,
  term text,
  strand text,
  rating text NOT NULL CHECK (rating IN ('positive', 'negative')),
  feedback_text text,
  generated_content jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.scheme_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback" ON public.scheme_feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" ON public.scheme_feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id);