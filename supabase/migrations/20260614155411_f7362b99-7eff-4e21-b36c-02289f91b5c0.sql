
-- 1) news_comments: restrict reads to authenticated only, expose minimal columns via public view
DROP POLICY IF EXISTS "Anyone can read comments" ON public.news_comments;
CREATE POLICY "Authenticated users can read comments"
ON public.news_comments FOR SELECT
TO authenticated
USING (true);

CREATE OR REPLACE VIEW public.news_comments_public
WITH (security_invoker = true) AS
SELECT id, post_id, author_name, content, created_at
FROM public.news_comments;
GRANT SELECT ON public.news_comments_public TO anon, authenticated;

-- 2) example_requests: remove from realtime publication (PII protection)
ALTER PUBLICATION supabase_realtime DROP TABLE public.example_requests;

-- 3) avatars storage bucket: enforce folder structure = {uid}/...
DROP POLICY IF EXISTS "Avatars are publicly readable by user folder" ON storage.objects;
CREATE POLICY "Avatars are publicly readable by user folder"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

-- 4) profiles.staff_role: prevent self-escalation via trigger
CREATE OR REPLACE FUNCTION public.prevent_staff_role_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.staff_role IS DISTINCT FROM OLD.staff_role
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change staff_role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_staff_role_self_update ON public.profiles;
CREATE TRIGGER profiles_prevent_staff_role_self_update
BEFORE UPDATE OF staff_role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_staff_role_self_update();
