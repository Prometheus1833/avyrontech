
CREATE TABLE public.news_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.news_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.news_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
ON public.news_comments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can post comments"
ON public.news_comments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id
  AND length(content) BETWEEN 1 AND 2000
);

CREATE POLICY "Authors update own comments"
ON public.news_comments FOR UPDATE
TO authenticated
USING (auth.uid() = author_id);

CREATE POLICY "Authors or admins delete comments"
ON public.news_comments FOR DELETE
TO authenticated
USING (auth.uid() = author_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_news_comments_updated_at
BEFORE UPDATE ON public.news_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_news_comments_post_created ON public.news_comments(post_id, created_at DESC);
