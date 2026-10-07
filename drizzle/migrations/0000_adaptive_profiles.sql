CREATE TABLE public.adaptive_profiles (
  user_id uuid PRIMARY KEY,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  expertise text NOT NULL DEFAULT '',
  diagnosis text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.adaptive_profiles TO authenticated;
GRANT ALL ON public.adaptive_profiles TO service_role;
ALTER TABLE public.adaptive_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.adaptive_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.caregiver_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  answer text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caregiver_feedback TO authenticated;
GRANT ALL ON public.caregiver_feedback TO service_role;
ALTER TABLE public.caregiver_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own feedback" ON public.caregiver_feedback FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);