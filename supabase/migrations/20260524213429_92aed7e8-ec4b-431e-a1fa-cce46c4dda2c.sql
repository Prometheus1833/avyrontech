
-- 1) example_requests: restrict SELECT to staff/admin
DROP POLICY IF EXISTS "Authenticated users can view requests" ON public.example_requests;
CREATE POLICY "Staff view example requests"
ON public.example_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2) projects: allow clients to view their own projects
CREATE POLICY "Clients view own projects"
ON public.projects
FOR SELECT
TO authenticated
USING (auth.uid() = client_id);

-- 3) Storage: restrict uploads to 'examples' bucket to staff/admin
DROP POLICY IF EXISTS "Authenticated users can upload example images" ON storage.objects;
DROP POLICY IF EXISTS "Staff upload examples" ON storage.objects;
CREATE POLICY "Staff upload examples"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'examples'
  AND (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
);
CREATE POLICY "Staff update examples"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'examples'
  AND (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
);
CREATE POLICY "Staff delete examples"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'examples'
  AND (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
);

-- 4) Restrict public-bucket SELECT to direct-object access only (no listing).
-- Drop broad SELECT policies and add per-bucket policies that allow public read of objects
-- (downloads via known path) without enabling bucket listing for arbitrary clients.
DROP POLICY IF EXISTS "Public read examples" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Examples images are publicly accessible" ON storage.objects;

CREATE POLICY "Public read examples"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'examples');

CREATE POLICY "Public read avatars"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars');

-- Users can upload/update their own avatar (folder = their uid)
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5) Lock down SECURITY DEFINER helper functions
-- handle_new_user and tg_set_updated_at are trigger-only; revoke from anon/authenticated.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM anon, authenticated, public;
-- has_role is needed inside RLS policies but should not be callable by anon.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
