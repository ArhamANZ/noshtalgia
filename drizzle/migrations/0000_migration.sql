CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender text NOT NULL CHECK (sender IN ('Adiba','Arham')),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO anon, authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read messages" ON public.messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "send messages" ON public.messages FOR INSERT TO anon, authenticated WITH CHECK (sender IN ('Adiba','Arham'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;