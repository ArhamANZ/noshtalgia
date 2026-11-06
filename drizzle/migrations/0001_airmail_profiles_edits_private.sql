CREATE TABLE public.airmail_profiles (
  person text PRIMARY KEY CHECK (person IN ('Adiba','Arham')),
  place text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.airmail_profiles TO service_role;
ALTER TABLE public.airmail_profiles ENABLE ROW LEVEL SECURITY;
INSERT INTO public.airmail_profiles (person, place) VALUES ('Adiba','japan'),('Arham','bangladesh');

CREATE TABLE public.message_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  previous_content text NOT NULL,
  edited_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.message_edits TO service_role;
ALTER TABLE public.message_edits ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.messages ADD COLUMN edited_at timestamptz;
GRANT ALL ON public.messages TO service_role;
DROP POLICY IF EXISTS "read messages" ON public.messages;
DROP POLICY IF EXISTS "send messages" ON public.messages;
REVOKE ALL ON public.messages FROM anon, authenticated;