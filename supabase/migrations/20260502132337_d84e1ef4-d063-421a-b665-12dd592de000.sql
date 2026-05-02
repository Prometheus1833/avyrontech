
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.news_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'tech',
  published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "News posts viewable by everyone"
ON public.news_posts FOR SELECT
USING (published = true);

CREATE POLICY "Staff view all news posts"
ON public.news_posts FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff create news posts"
ON public.news_posts FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id
  AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Authors or admins update news posts"
ON public.news_posts FOR UPDATE
TO authenticated
USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authors or admins delete news posts"
ON public.news_posts FOR DELETE
TO authenticated
USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_news_posts_updated_at
BEFORE UPDATE ON public.news_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_news_posts_published_at ON public.news_posts(published_at DESC);
