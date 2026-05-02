-- ===== TABEL EXAMPLES =====
CREATE TABLE public.examples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_path TEXT,
  external_url TEXT,
  has_internal_demo BOOLEAN NOT NULL DEFAULT false,
  internal_demo_path TEXT,
  display_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Examples are viewable by everyone"
  ON public.examples FOR SELECT
  USING (active = true);

-- ===== TABEL EXAMPLE_REQUESTS =====
CREATE TABLE public.example_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  source_slug TEXT,
  source_category TEXT,
  source_name TEXT,
  message TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.example_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a request"
  ON public.example_requests FOR INSERT
  WITH CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND length(email) <= 255
    AND length(phone) BETWEEN 5 AND 30
    AND (source_slug IS NULL OR length(source_slug) <= 100)
    AND (source_category IS NULL OR length(source_category) <= 100)
    AND (source_name IS NULL OR length(source_name) <= 200)
    AND (message IS NULL OR length(message) <= 2000)
  );

CREATE POLICY "Authenticated users can view requests"
  ON public.example_requests FOR SELECT
  TO authenticated
  USING (true);

-- ===== BUCKET EXAMPLES =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('examples', 'examples', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Examples images are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'examples');

CREATE POLICY "Authenticated users can upload example images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'examples');

-- ===== TRIGGER UPDATED_AT pentru examples =====
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_examples_updated_at
  BEFORE UPDATE ON public.examples
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_examples_sort ON public.examples (sort_order, name);
CREATE INDEX idx_examples_category ON public.examples (category);
CREATE INDEX idx_example_requests_created ON public.example_requests (created_at DESC);