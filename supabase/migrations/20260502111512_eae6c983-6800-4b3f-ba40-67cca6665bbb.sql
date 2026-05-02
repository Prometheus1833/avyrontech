-- Restrâng SELECT pe bucket examples doar la prefix "examples/"
DROP POLICY IF EXISTS "Examples images are publicly viewable" ON storage.objects;
CREATE POLICY "Examples images are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'examples' AND (storage.foldername(name))[1] = 'examples');

-- Revoc execute pe funcția internă de trigger
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM authenticated;