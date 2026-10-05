ALTER TABLE public.attempts ADD COLUMN item_id text, ADD COLUMN kind text;
CREATE INDEX attempts_user_item ON public.attempts(user_id, item_id);
ALTER TABLE public.caregiver_settings ALTER COLUMN topics SET DEFAULT ARRAY['nutrition','avis','sciences','temps','expression']::text[];
UPDATE public.caregiver_settings SET topics = ARRAY['nutrition','avis','sciences','temps','expression']::text[];
CREATE POLICY "voice cache read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'voice');
CREATE POLICY "voice cache write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'voice');