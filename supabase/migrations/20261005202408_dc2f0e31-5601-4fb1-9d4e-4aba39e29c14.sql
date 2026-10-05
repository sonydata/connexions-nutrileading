CREATE TABLE public.caregiver_settings (
  user_id uuid PRIMARY KEY,
  patient_name text NOT NULL DEFAULT 'Hafid',
  topics text[] NOT NULL DEFAULT ARRAY['nutrition','daily','time','culture','science']::text[],
  difficulty smallint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caregiver_settings TO authenticated;
GRANT ALL ON public.caregiver_settings TO service_role;
ALTER TABLE public.caregiver_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.caregiver_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_sessions TO authenticated;
GRANT ALL ON public.practice_sessions TO service_role;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.practice_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
  category text NOT NULL,
  skill text NOT NULL,
  prompt text NOT NULL,
  concept text,
  word_count int NOT NULL DEFAULT 0,
  option_count int NOT NULL DEFAULT 3,
  outcome text NOT NULL,
  response_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attempts_user_created ON public.attempts(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attempts TO authenticated;
GRANT ALL ON public.attempts TO service_role;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attempts" ON public.attempts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);